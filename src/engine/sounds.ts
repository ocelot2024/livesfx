import { type SoundInfo } from "./types";
import { compute_peaks, type WaveformPeaks } from "./waveform";

class Sound {
    readonly filename: string;
    readonly id: string;
    private readonly buffer: AudioBuffer;
    constructor(name: string, id: string, buffer: AudioBuffer) {
        this.filename = name;
        this.id = id;
        this.buffer = buffer;
    }
    getbuffer() {
        return this.buffer;
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
    get_sound(id: string) {
        if (id in this.sounds)
            return new AudioBufferSourceNode(this.ctx, {
                buffer: this.sounds[id]?.getbuffer(),
            });
    }
    get_duration(id: string) {
        return this.sounds[id]?.getbuffer().duration;
    }
    get_waveform(id: string, buckets: number): WaveformPeaks | undefined {
        const sound = this.sounds[id];
        if (!sound) return undefined;
        return compute_peaks(sound.getbuffer(), buckets);
    }
    get_library() {
        let frag: Record<string, SoundInfo> = {};
        for (const i in this.sounds) {
            if (!this.sounds[i]) continue;
            const id = i;
            const filename = this.sounds[i].filename;
            frag[i] = {
                id: id,
                filename,
            };
        }
        return { ...frag };
    }
}
