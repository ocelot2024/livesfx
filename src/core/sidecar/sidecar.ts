import { EngineEvent, Err, Ok, type Result } from "../types/types";
import type { SoundMeta } from "../audioEngine/sounds";
import type { MixerChannelSnapshot } from "../audioEngine/mixer";
import type { BGMPlayerInfo } from "../store/enginestore";
const waitIceComplete = (pc: RTCPeerConnection): Promise<void> => {
    return new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") {
            resolve();
            return;
        }
        const listener = () => {
            if (pc.iceGatheringState === "complete") {
                pc.removeEventListener("icegatheringstatechange", listener);
                resolve();
            }
        };
        pc.addEventListener("icegatheringstatechange", listener);
    });
};

export const SideCarError = {
    NotConnected: "noteconnected",
    ImHostNotVisitor: "imhost",
} as const;

export type SideCarError = (typeof SideCarError)[keyof typeof SideCarError];
export const SideCarEvent = {
    Connect: "connect",
    Disconnect: "disconnect",
    Message: "message",
} as const;

export type SideCarEvent = (typeof SideCarEvent)[keyof typeof SideCarEvent];
export const SideCarCommand = {
    Play: "play",
    Stop: "stop",
    StopAllSfx: "stop_all_sfx",
    Ducking: "ducking",
    SetGain: "set_gain",
    PlayBgm: "play_bgm",
    PauseBgm: "pause_bgm",
    StopBgm: "stop_bgm",
    SeekBgm: "seek_bgm",
    LoadBgmToDeck: "load_bgm_to_deck",
    UnloadBGM: "eject_bgm",
} as const;
export type SideCarCommand =
    (typeof SideCarCommand)[keyof typeof SideCarCommand];

export type SideCarCommandPayload =
    | {
          cmd: typeof SideCarCommand.Play;
          id: string;
          options?: { start?: number; end?: number };
      }
    | { cmd: typeof SideCarCommand.Stop; source_id: string }
    | { cmd: typeof SideCarCommand.StopAllSfx }
    | { cmd: typeof SideCarCommand.Ducking }
    | {
          cmd: typeof SideCarCommand.SetGain;
          id: string;
          gain: number;
          initialising?: boolean;
      }
    | { cmd: typeof SideCarCommand.PlayBgm; deck: "deckA" | "deckB" }
    | { cmd: typeof SideCarCommand.PauseBgm; deck: "deckA" | "deckB" }
    | { cmd: typeof SideCarCommand.StopBgm; deck: "deckA" | "deckB" }
    | {
          cmd: typeof SideCarCommand.SeekBgm;
          deck: "deckA" | "deckB";
          time: number;
      }
    | {
          cmd: typeof SideCarCommand.LoadBgmToDeck;
          deck: "deckA" | "deckB";
          bgmId: string;
      }
    | {
          cmd: typeof SideCarCommand.UnloadBGM;
          deck: "deckA" | "deckB";
      };

export interface SideCarStateSnapshot {
    sfx_library: Record<string, SoundMeta>;
    bgm_library: Record<string, SoundMeta>;
    groupNames: string[];
    channels: MixerChannelSnapshot[];
    playing_sfx: string[];
    deck: [BGMPlayerInfo, BGMPlayerInfo];
    ducking: boolean;
}

export type SideCarMessage =
    | { kind: "snapshot"; state: SideCarStateSnapshot }
    | { kind: "event"; event: EngineEvent; detail: unknown }
    | { kind: "msg"; value: string }
    | { kind: "command"; payload: SideCarCommandPayload }
    | { kind: "requestsnapshot" };

export class SideCar extends EventTarget {
    peer!: RTCPeerConnection;
    channel?: RTCDataChannel;
    mode?: "host" | "visitor";
    constructor() {
        super();
        this.createPeer();
    }
    private createPeer() {
        this.peer = new RTCPeerConnection();
        this.peer.ondatachannel = (e) => this.attachChannel(e.channel);
    }
    get connected() {
        return (
            this.peer.connectionState === "connected" &&
            this.channel?.readyState === "open"
        );
    }
    private attachChannel(channel: RTCDataChannel) {
        this.channel = channel;

        channel.onopen = () => {
            if (this.mode == "visitor") {
                this.send({ kind: "requestsnapshot" });
            }
            this.dispatchEvent(new Event(SideCarEvent.Connect));
        };

        channel.onclose = () => {
            this.dispatchEvent(new Event(SideCarEvent.Disconnect));
        };

        channel.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data) as SideCarMessage;

                this.dispatchEvent(
                    new CustomEvent(SideCarEvent.Message, {
                        detail: data,
                    }),
                );
            } catch (error) {
                console.error("Invalid SideCar message", error);
            }
        };
    }
    async createHost() {
        this.attachChannel(this.peer.createDataChannel("LiveSFX"));

        const offer = await this.peer.createOffer();
        await this.peer.setLocalDescription(offer);
        await waitIceComplete(this.peer);

        return this.peer.localDescription;
    }

    async joinHost(
        offer: RTCSessionDescriptionInit,
    ): Promise<Result<RTCSessionDescription, unknown>> {
        try {
            await this.peer.setRemoteDescription(offer);
            const answer = await this.peer.createAnswer();
            await this.peer.setLocalDescription(answer);
            await waitIceComplete(this.peer);
            if (!this.peer.localDescription) return Err("");
            this.mode = "visitor";
            return Ok(this.peer.localDescription);
        } catch (e) {
            return Err(e);
        }
    }

    async applyAnswer(
        answer: RTCSessionDescriptionInit,
    ): Promise<Result<void, string>> {
        await this.peer.setRemoteDescription(answer);
        if (this.peer.connectionState === "connected") {
            this.mode = "host";
            return Ok();
        }
        return new Promise<Result<void, string>>((resolve) => {
            const handler = () => {
                switch (this.peer.connectionState) {
                    case "connected":
                        cleanup();
                        this.mode = "host";
                        resolve(Ok());
                        break;
                    case "failed":
                    case "closed":
                    case "disconnected":
                        cleanup();
                        resolve(Err("connection failed"));
                        break;
                }
            };
            const cleanup = () => {
                clearTimeout(time);
                this.peer.removeEventListener("connectionstatechange", handler);
            };
            const time = setTimeout(() => {
                cleanup();
                resolve(Err("timeout"));
            }, 10000);
            this.peer.addEventListener("connectionstatechange", handler);
        });
    }

    send(message: SideCarMessage): Result<void, SideCarError> {
        try {
            this.channel?.send(JSON.stringify(message));
            return Ok();
        } catch {
            return Err(SideCarError.NotConnected);
        }
    }
    reset() {
        this.channel?.close();
        this.peer.close();
        this.createPeer();
        this.channel = undefined;
        this.dispatchEvent(new Event(SideCarEvent.Disconnect));
    }

    send_command(
        command_and_payload: SideCarCommandPayload,
    ): Result<void, SideCarError> {
        if (!this.connected) return Err(SideCarError.NotConnected);
        if (this.mode === "visitor") {
            const request: SideCarMessage = {
                kind: "command",
                payload: command_and_payload,
            };
            this.send(request);
            return Ok();
        }
        return Err(SideCarError.ImHostNotVisitor);
    }
}
