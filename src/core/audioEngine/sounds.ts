import { EngineException } from "../types/error_types";
import { type SoundMeta } from "../types/types";
import { compute_peaks, type WaveformPeaks } from "../util/waveform";

export interface SoundFile extends SoundMeta {
    file: ArrayBuffer;
}

class Sound {
    private meta: SoundMeta;
    private buffer: AudioBuffer;
    constructor(name: string, id: string, buffer: AudioBuffer) {
        this.meta = {
            id,
            filename: name,
            start_from: 0,
            end_at: buffer.duration,
        };
        this.buffer = buffer;
    }
    getPlayInfo() {
        return {
            buffer: this.buffer,
            start_from: this.meta.start_from,
            end_at: this.meta.end_at,
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
}

export class SoundLibrary {
    private sounds: Record<string, Sound>;
    private ctx: AudioContext;
    constructor(ctx: AudioContext) {
        this.sounds = {};
        this.ctx = ctx;
    }
    add(name: string, id: string, audiobuffer: AudioBuffer) {
        const sound = new Sound(name, id, audiobuffer);
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
}
