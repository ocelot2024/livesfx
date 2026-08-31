import { EngineEvent, Err, Ok, type Result } from "../types/types";

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
export const SideCarEvent = {
    Connect: "connect",
    Disconnect: "disconnect",
    Message: "message",
} as const;

export type SideCarEvent = (typeof SideCarEvent)[keyof typeof SideCarEvent];

export interface SideCarMessage {
    type: "";
    detail: unknown;
}
export class SideCar extends EventTarget {
    peer!: RTCPeerConnection;
    channel?: RTCDataChannel;
    constructor() {
        super();
        this.createPeer();
    }
    private createPeer() {
        this.peer = new RTCPeerConnection();
        this.peer.ondatachannel = (e) => this.attachChannel(e.channel);
    }
    get connected() {
        return this.channel?.readyState === "open";
    }
    private attachChannel(channel: RTCDataChannel) {
        this.channel = channel;

        channel.onopen = () => {
            console.log("channel open");
            this.dispatchEvent(new Event(SideCarEvent.Connect));
        };

        channel.onclose = () => {
            console.log("channel close");
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
            return Ok();
        }
        return new Promise<Result<void, string>>((resolve) => {
            const handler = () => {
                switch (this.peer.connectionState) {
                    case "connected":
                        cleanup();
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

    send(event_name: EngineEvent, option: unknown) {
        this.channel?.send(
            JSON.stringify({ type: event_name, detail: option }),
        );
    }
    reset() {
        this.channel?.close();
        this.peer.close();
        this.createPeer();
        this.channel = undefined;
    }
}
