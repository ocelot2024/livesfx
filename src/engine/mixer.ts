class Channel {
    readonly inputGain: GainNode;
    readonly output: GainNode;
    constructor(ctx: AudioContext) {
        this.inputGain = ctx.createGain();
        this.output = ctx.createGain();
        // Leave room for future effects.
        this.inputGain.connect(this.output);
    }
}

export class AudioMixer {
    private ctx: AudioContext;
    private channels: Record<string, Channel>;
    private master: Channel;
    constructor(ctx: AudioContext) {
        this.ctx = ctx;
        this.channels = {};
        this.master = new Channel(ctx);
        this.master.output.connect(ctx.destination);
    }
    create_channel(id: string) {
        const channnel = new Channel(this.ctx);
        this.channels[id] = channnel;
        this.channels[id].output.connect(this.master.inputGain);
    }
    send(id: string, source: AudioBufferSourceNode) {
        const channel = this.channels[id];
        if (channel) {
            source.connect(channel.inputGain);
        }
    }
}
