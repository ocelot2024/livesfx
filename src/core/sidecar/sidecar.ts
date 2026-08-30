import { EngineEvent } from "../types/types";

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

    async joinHost(offer: RTCSessionDescriptionInit) {
        await this.peer.setRemoteDescription(offer);
        const answer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(answer);
        await waitIceComplete(this.peer);

        return this.peer.localDescription;
    }

    async applyAnswer(answer: RTCSessionDescriptionInit) {
        await this.peer.setRemoteDescription(answer);
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
