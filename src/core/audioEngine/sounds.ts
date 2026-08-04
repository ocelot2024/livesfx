import { EngineException } from "../types/error_types";
import type { Result } from "../types/types";
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
    constructor(name: string, id: string, buffer: AudioBuffer, parent: string) {
        this.meta = {
            id,
            filename: name,
            start_from: 0,
            end_at: buffer.duration,
            group: parent,
        };
        this.buffer = buffer;
    }
    getPlayInfo(): PlaybackInfo {
        return {
            id: this.meta.id,
            filename: this.meta.filename,
            buffer: this.buffer,
            start_from: this.meta.start_from,
            end_at: this.meta.end_at,
            play_mode: this.meta.play_mode ?? SFXPlayMode.OverLap,
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
}

export class SoundLibrary {
    private sounds: Record<string, Sound>;
    private ctx: AudioContext;
    constructor(ctx: AudioContext) {
        this.sounds = {};
        this.ctx = ctx;
    }
    add(name: string, id: string, audiobuffer: AudioBuffer, parent: string) {
        const sound = new Sound(name, id, audiobuffer, parent);
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
}
