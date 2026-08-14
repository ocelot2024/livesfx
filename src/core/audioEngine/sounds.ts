import { useConfigStore } from "../store/configstore";
import { EngineException } from "../types/error_types";
import { Ok, Err, type Result } from "../types/types";
import { compute_peaks, type WaveformPeaks } from "../util/waveform";

export enum SFXPlayMode {
    OverLap,
    Restart,
    Ignore,
    Stop,
}

export interface SoundMeta {
    id: string;
    filename: string;
    start_from?: number;
    end_at?: number;
    play_mode?: SFXPlayMode;
    group?: string;
    gain?: number;
}

export interface SoundFile extends SoundMeta {
    file: ArrayBuffer;
}

export interface PlaybackInfo extends SoundMeta {
    buffer: AudioBuffer;
}

class Sound {
    private meta: SoundMeta;
    private buffer: AudioBuffer;
    constructor(
        name: string,
        id: string,
        buffer: AudioBuffer,
        parent: string,
        gain: number,
    ) {
        const store = useConfigStore();
        this.meta = {
            id,
            filename: name,
            start_from: 0,
            end_at: buffer.duration,
            group: parent,
            gain,
            play_mode: store.defaultPlayMode,
        };
        this.buffer = buffer;
    }
    getPlayInfo(): PlaybackInfo {
        const store = useConfigStore();
        return {
            id: this.meta.id,
            filename: this.meta.filename,
            buffer: this.buffer,
            start_from: this.meta.start_from,
            end_at: this.meta.end_at,
            play_mode: this.meta.play_mode ?? store.defaultPlayMode,
            gain: this.meta.gain,
        };
    }
    getInfo() {
        return this.meta;
    }
    get_duration() {
        return this.buffer.duration;
    }
    trim(start: number, end: number) {
        this.meta.start_from = start;
        this.meta.end_at = end;
    }
    set_mode(mode: SFXPlayMode) {
        this.meta.play_mode = mode;
    }
    get_mode(): SFXPlayMode {
        return this.meta.play_mode ?? SFXPlayMode.OverLap;
    }
    update_meta(patch: Partial<SoundMeta>) {
        this.meta = {
            ...this.meta,
            ...patch,
        };
    }
}

export class SoundLibrary {
    private sounds: Record<string, Sound>;
    private ctx: AudioContext;
    constructor(ctx: AudioContext) {
        this.sounds = {};
        this.ctx = ctx;
    }
    add(name: string, id: string, audiobuffer: AudioBuffer, parent: string) {
        const sound = new Sound(name, id, audiobuffer, parent, 1);
        this.sounds[id] = sound;
        return id;
    }
    remove(id: string) {
        delete this.sounds[id];
    }
    get_PlayInfo(id: string) {
        if (id in this.sounds) {
            const info = this.sounds[id]?.getPlayInfo();
            const buffer = info?.buffer;
            if (!buffer || !info) throw new Error(EngineException.NoSoundData);

            const { buffer: _, ...rest } = info;

            return {
                node: new AudioBufferSourceNode(this.ctx, {
                    buffer,
                }),
                ...rest,
            };
        }
    }
    get_soundinfo(id: string) {
        if (id in this.sounds) {
            return this.sounds[id]?.getInfo();
        }
    }
    get_duration(id: string) {
        return this.sounds[id]?.get_duration();
    }
    get_waveform(id: string, buckets: number): WaveformPeaks | undefined {
        const sound = this.sounds[id];
        if (!sound) return undefined;
        return compute_peaks(sound.getPlayInfo().buffer, buckets);
    }
    get_library() {
        let frag: Record<string, SoundMeta> = {};
        for (const i in this.sounds) {
            if (!this.sounds[i]) continue;
            const info = this.sounds[i].getInfo();
            frag[i] = {
                ...info,
            };
        }
        return { ...frag };
    }
    trim(id: string, start: number, end: number) {
        if (id in this.sounds) {
            this.sounds[id]?.trim(start, end);
        }
    }
    set_sfx_playmode(id: string, mode: SFXPlayMode) {
        if (id in this.sounds) {
            this.sounds[id]?.set_mode(mode);
        }
    }
    set_gain(id: string, gain: number) {
        this.sounds[id]?.update_meta({ gain: gain });
    }
    move(id: string, toIndex: number): Result<void, string> {
        const keys = Object.keys(this.sounds);
        const fromIndex = keys.indexOf(id);
        if (fromIndex === -1) return Err(`Sound not found: ${id}`);

        const clampedIndex = Math.max(0, Math.min(toIndex, keys.length - 1));
        if (fromIndex === clampedIndex) return Ok();

        keys.splice(fromIndex, 1);
        keys.splice(clampedIndex, 0, id);

        const reordered: Record<string, Sound> = {};
        for (const key of keys) {
            const sound = this.sounds[key];
            if (sound) reordered[key] = sound;
        }
        this.sounds = reordered;
        return Ok();
    }
}
