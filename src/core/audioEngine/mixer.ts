import { AudioMixerError } from "../types/err";
import { EngineError } from "../types/error_types";
import { Err, Ok, type Result } from "../types/types";
import { generateUUID } from "../util/util";

type MixerChannels = Record<string, { belongs_to: string; channel: Channel }>;

export const MIXER_MASTER_CHANNEL_ID = "MASTER";

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

    private resolve_group(id: string): Channel | null {
        if (id === MIXER_MASTER_CHANNEL_ID) return this.master;
        if (id in this.groups) return this.groups[id]?.grouping_channel ?? null;
        return null;
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
    get_group_names(): string[] {
        return Object.keys(this.groups);
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
    // チャンネルを別のグループへ移動する。newGroupを省略するとマスター直下(未分類)へ。
    // 既存のChannelインスタンスは作り直す(接続をdisconnectしてから同じidで再生成する)。
    // 注意: この操作の瞬間に再生中の音があると、そのAudioBufferSourceNodeは
    // 古いチャンネルに繋がったままになるため無音になる(編集操作中の再生は想定していないため許容)。
    move_channel(id: string, newGroup?: string): Result<void, string> {
        const found = this.channel_finder(id);
        if (!found) return Err(EngineError.ChannelNotFound);
        const entry = found.target[id];
        if (!entry) return Err(EngineError.ChannelNotFound);
        if (entry.belongs_to === (newGroup ?? MIXER_MASTER_CHANNEL_ID))
            return Ok();

        const name = entry.channel.name;
        const gain = entry.channel.output.gain.value;

        entry.channel.inputGain.disconnect();
        entry.channel.output.disconnect();
        delete found.target[id];

        const created = this.create_channel(id, name, newGroup);
        if (!created.ok) return Err(created.value);
        this.set_gain(id, gain);
        return Ok();
    }
    // グループを削除する。所属していたチャンネルは全て未分類(マスター直下)へ退避してから
    // グループバス自体を破棄する。存在しないグループの場合はErr。
    delete_group(name: string): Result<void, string> {
        const group = this.groups[name];
        if (!group) return Err(EngineError.GroupNotFound);

        for (const id of Object.keys(group.children)) {
            this.move_channel(id);
        }

        group.grouping_channel.inputGain.disconnect();
        group.grouping_channel.output.disconnect();
        delete this.groups[name];
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
    set_gain(id: string, gain: number): Result<number, AudioMixerError> {
        // グループとマスターのゲインを先に検査して返す。
        // TODO UIでグループゲインの調整をできるように
        const group = this.resolve_group(id);
        if (group) {
            group.output.gain.value = gain;
            return Ok(gain);
        }
        const target = this.channel_finder(id)?.target[id];
        if (!target) return Err(AudioMixerError.ChannelNotFound);
        target.channel.output.gain.value = gain;
        return Ok(target.channel.output.gain.value);
    }
    get_gain(id: string): Result<number, AudioMixerError> {
        const group = this.resolve_group(id);
        if (group) {
            return Ok(group.output.gain.value);
        }
        const target = this.channel_finder(id)?.target[id];
        if (!target) return Err(AudioMixerError.ChannelNotFound);
        return Ok(target.channel.output.gain.value);
    }
    connect_media_elem(
        element: HTMLMediaElement,
        deckId: "deckA" | "deckB",
    ): Result<void, string> {
        const sourceNode = new MediaElementAudioSourceNode(this.ctx, {
            mediaElement: element,
        });

        const created = this.create_channel(deckId, deckId, "BGM");
        if (!created.ok) return Err(created.value);

        const found = this.channel_finder(deckId);
        if (!found) return Err(EngineError.ChannelNotFound);

        const target = found.target[deckId];
        if (!target) return Err(EngineError.ChannelNotFound);

        sourceNode.connect(target.channel.inputGain);
        return Ok();
    }
}
