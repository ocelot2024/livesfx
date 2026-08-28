import { AUDIO_MIME_TYPES } from "../constants";
import { useConfigStore } from "../store/configstore";
import { EngineError, EngineException } from "../types/error_types";
import { Ok, Err, type Result } from "../types/types";
import { compute_peaks, type WaveformPeaks } from "../util/waveform";
export enum SFXPlayMode {
    OverLap,
    Restart,
    Ignore,
    Stop,
}

export const SoundFileType = {
    SFX: "sfx",
    BGM: "bgm",
} as const;

export type SoundFileType = (typeof SoundFileType)[keyof typeof SoundFileType];

export interface SoundMeta {
    id: string;
    filename: string;
    start_from?: number;
    end_at?: number;
    play_mode?: SFXPlayMode;
    group?: string;
    gain?: number;
    type: SoundFileType;
    mime?: AUDIO_MIME_TYPES;
}

export interface SFXFile extends SoundMeta {
    file: ArrayBuffer;
}

export interface BGMFile extends SoundMeta {
    file: Blob;
}

export interface PlaybackInfo extends SoundMeta {
    buffer: AudioBuffer;
}

abstract class BaseSound {
    private meta: SoundMeta;

    constructor(option: SoundMeta) {
        this.meta = { ...option };
        if (!option.mime) {
            const dotpos = this.meta.filename.lastIndexOf(".");
            if (dotpos < 0) {
                throw new Error(EngineError.UnknownSound);
            } else {
                const ex = this.meta.filename.slice(dotpos + 1);
                this.meta.mime = AUDIO_MIME_TYPES[ex];
            }
        }
    }

    getInfo(): SoundMeta {
        return this.meta;
    }

    getPlayInfo(): SoundMeta {
        const store = useConfigStore();

        return {
            ...this.meta,
            play_mode: this.meta.play_mode ?? store.defaultPlayMode,
        };
    }

    abstract get_duration(): number;

    trim(start: number, end: number) {
        this.meta.start_from = start;
        this.meta.end_at = end;
    }

    set_mode(mode: SFXPlayMode) {
        this.meta.play_mode = mode;
    }

    update_meta(patch: Partial<SoundMeta>) {
        this.meta = {
            ...this.meta,
            ...patch,
        };
    }
    rename(name: string) {
        this.meta.filename = name;
    }
}

class Sound extends BaseSound {
    private buffer: AudioBuffer;
    constructor(option: SoundMeta, buffer: AudioBuffer) {
        super(option);
        this.buffer = buffer;
    }
    get_duration() {
        return this.buffer.duration;
    }
    getPlayInfo(): PlaybackInfo {
        return { ...super.getPlayInfo(), buffer: this.buffer };
    }
    get_mode(): SFXPlayMode {
        const store = useConfigStore();
        return super.getPlayInfo().play_mode ?? store.defaultPlayMode;
    }
}

class BGM extends BaseSound {
    private source: Blob;
    private duration?: number;
    constructor(option: SoundMeta, file: Blob) {
        super({ ...option, type: SoundFileType.BGM });
        this.source = file;

        const audio = document.createElement("audio");
        const url = URL.createObjectURL(file);

        audio.onloadedmetadata = () => {
            this.duration = audio.duration;
            URL.revokeObjectURL(url);
        };

        audio.src = url;
    }
    get_duration() {
        return this.duration ?? 0;
    }
    getPlayInfo(): { source: Blob } & SoundMeta {
        return { ...super.getPlayInfo(), source: this.source };
    }
    play() {
        this;
    }
}

export class SoundLibrary {
    private sounds: Record<string, Sound>;
    private musics: Record<string, BGM>;
    private ctx: AudioContext;
    constructor(ctx: AudioContext) {
        this.sounds = {};
        this.musics = {};
        this.ctx = ctx;
    }
    add(meta: SoundMeta, file: AudioBuffer | Blob) {
        if (meta.type === SoundFileType.SFX || meta.type === undefined) {
            const sound = new Sound(meta, file as AudioBuffer);
            this.sounds[meta.id] = sound;
            return meta.id;
        } else {
            console.log("Adding BGM");
            const bgm = new BGM(meta, file as Blob);
            this.musics[meta.id] = bgm;
            return meta.id;
        }
    }
    remove(id: string) {
        delete this.musics[id];
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
    get_bgm_playinfo(id: string) {
        if (id in this.musics) {
            return this.musics[id]?.getPlayInfo();
        }
    }
    async get_all_bgm_arraybuffer(): Promise<Record<string, ArrayBuffer>> {
        const result: Record<string, ArrayBuffer> = {};
        await Promise.all(
            Object.entries(this.musics).map(async ([id, bgm]) => {
                if (!bgm) return;
                result[id] = await bgm.getPlayInfo().source.arrayBuffer();
            }),
        );
        return result;
    }
    get_waveform(id: string, buckets: number): WaveformPeaks | undefined {
        const sound = this.sounds[id];
        if (!sound) return undefined;
        return compute_peaks(sound.getPlayInfo().buffer, buckets);
    }
    get_sfx_library() {
        let frag: Record<string, SoundMeta> = {};
        for (const i in this.sounds) {
            if (!this.sounds[i]) continue;
            const info = this.sounds[i].getInfo();
            if (info.type !== SoundFileType.SFX) continue;
            frag[i] = {
                ...info,
            };
        }
        return { ...frag };
    }
    get_bgm_library() {
        let frag: Record<string, SoundMeta> = {};
        for (const i in this.musics) {
            if (!this.musics[i]) continue;
            const info = this.musics[i].getInfo();
            if (info.type !== SoundFileType.BGM) continue;
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
    set_group(id: string, group?: string) {
        this.sounds[id]?.update_meta({ group });
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
    rename(id: string, name: string): Result<void, string> {
        const target = this.musics[id] ?? this.sounds[id];
        if (!target) return Err(EngineError.SoundNotExist);
        target.rename(name);
        return Ok();
    }
}
