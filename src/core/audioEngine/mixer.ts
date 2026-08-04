import { AudioMixerError } from "../types/err";
import { EngineError } from "../types/error_types";
import { Err, Ok, type Result } from "../types/types";
import { generateUUID } from "../util/util";

type MixerChannels = Record<string, { belongs_to: string; channel: Channel }>;

interface MixerGroup {
    grouping_channel: Channel;
    children: MixerChannels;
}

export class Channel {
    readonly inputGain: GainNode;
    readonly output: GainNode;
    name: string;
    id?: string;
    constructor(ctx: AudioContext, name: string, id?: string) {
        this.inputGain = ctx.createGain();
        this.output = ctx.createGain();
        // Leave room for future effects.
        this.inputGain.connect(this.output);
        this.name = name;
        this.id = id;
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
        this.master = new Channel(ctx, "MASTER", "MASTER");
        this.master.output.connect(ctx.destination);
        this.groups = {};
    }

    createGroup(name: string): Result<string, string> {
        if (name in this.groups) return Err(EngineError.GroupAlreadyExist);
        this.groups[name] = {
            grouping_channel: new Channel(this.ctx, name),
            children: {},
        };
        this.groups[name].grouping_channel.output.connect(
            this.master.inputGain,
        );
        return Ok(name);
    }
    create_channel(
        id: string,
        name: string,
        parent?: string,
    ): Result<string, string> {
        if (!parent) {
            if (id in this.channels) {
                return this.create_channel(generateUUID(), name);
            }
            const channel = new Channel(this.ctx, name);
            this.channels[id] = {
                channel,
                belongs_to: "MASTER",
            };
            channel.output.connect(this.master.inputGain);
            return Ok(id);
        }
        let group = this.groups[parent];
        if (!group) {
            const result = this.createGroup(parent);
            if (!result.ok) {
                return Err(EngineError.GroupNotFound);
            }
            group = this.groups[parent];
        }
        if (!group) {
            return Err(EngineError.GroupNotFound);
        }
        const target = group.children;
        if (id in target) {
            return this.create_channel(generateUUID(), name, parent);
        }
        const channel = new Channel(this.ctx, name, id);
        target[id] = {
            channel,
            belongs_to: parent,
        };
        channel.output.connect(group.grouping_channel.inputGain);
        return Ok(id);
    }
    private channel_finder(id: string): { target: MixerChannels } | null {
        if (id in this.channels) return { target: this.channels };
        for (const group of Object.values(this.groups)) {
            if (id in group.children) return { target: group.children };
        }
        return null;
    }
    group_children(parent: string): Channel[] {
        const group = this.groups[parent];
        if (!group) return [];
        return Object.values(group.children).map((V) => V.channel);
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
    set_gain(id: string, gain: number): Result<void, AudioMixerError> {
        const target = this.channel_finder(id)?.target[id];
        if (!target) return Err(AudioMixerError.ChannelNotFound);
        target.channel.inputGain.gain.value = gain;
        return Ok(target.channel.inputGain.gain.value);
    }
}
