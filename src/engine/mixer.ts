import { EngineError } from "./error_types";
import { EngineEvent, Err, Ok, type Result } from "./types";
import { generateUUID } from "./util";

type MixerChannels = Record<string, { belongs_to: string; channel: Channel }>;

interface MixerGroup {
    grouping_channel: Channel;
    children: MixerChannels;
}

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
    private channels: MixerChannels;
    private master: Channel;
    private groups: Record<string, MixerGroup>;
    constructor(ctx: AudioContext) {
        this.ctx = ctx;
        this.channels = {};
        this.master = new Channel(ctx);
        this.master.output.connect(ctx.destination);
        this.groups = {};
    }

    createGroup(name: string): Result<string, string> {
        if (name in this.groups) return Err(EngineError.GroupAlreadyExist);
        this.groups[name] = {
            grouping_channel: new Channel(this.ctx),
            children: {},
        };
        this.groups[name].grouping_channel.output.connect(
            this.master.inputGain,
        );
        return Ok(name);
    }
    create_channel(id: string, parent?: string): Result<string, string> {
        const group = parent ? this.groups[parent] : "MASTER";
        if (!group) return Err(EngineError.GroupNotFound);
        const target = group !== "MASTER" ? group.children : this.channels;
        if (id in target) return this.create_channel(generateUUID(), parent);
        const channel = new Channel(this.ctx);
        target[id] = {
            channel,
            belongs_to: parent ?? "MASTER",
        };
        if (parent && group !== "MASTER") {
            target[id].channel.output.connect(group.grouping_channel.inputGain);
        } else {
            target[id].channel.output.connect(this.master.inputGain);
        }
        return Ok(id);
    }
    private channel_finder(id: string): { target: MixerChannels } | null {
        if (id in this.channels) return { target: this.channels };
        for (const group of Object.values(this.groups)) {
            if (id in group.children) return { target: group.children };
        }
        return null;
    }
    delete_channel(id: string): Result<void, string> {
        const found = this.channel_finder(id);
        if (!found) return Err(EngineError.ChannelNotFound);
        const channel = found.target[id]?.channel ?? null;
        if (!channel) return Err(EngineError.ChannelNotFound);
        channel.inputGain.disconnect();
        channel.output.disconnect();
        delete found.target[id];
        return Ok();
    }
    input(id: string, source: AudioNode): Result<void, string> {
        const found = this.channel_finder(id);
        if (!found) return Err(EngineError.ChannelNotFound);
        const target = found.target[id];
        if (!target) return Err(EngineError.ChannelNotFound);
        target.channel && source.connect(target.channel.inputGain);
        return Ok();
    }
}
