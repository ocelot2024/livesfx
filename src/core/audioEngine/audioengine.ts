import { AudioMixer } from "./mixer";
import { SFXPlayMode, SoundLibrary } from "./sounds";
import { Err, Ok, type Result } from "../types/types";
import { generateUUID } from "../util/util";
import { AudioEngineError } from "../types/err";

export type PlayResult =
    | { played: true; soundID: string; sourceID: string }
    | { played: false };

export class Engine {
    private mixer: AudioMixer;
    private library: SoundLibrary;
    private ctx = new window.AudioContext();
    private playing: Record<string, AudioBufferSourceNode>;
    private playing_id: { source_id: string; sfx_id: string }[];
    constructor() {
        this.playing = {};
        this.playing_id = [];
        this.mixer = new AudioMixer(this.ctx);
        this.library = new SoundLibrary(this.ctx);

        window.addEventListener("click", this.resume_ctx);
        window.addEventListener("touchstart", this.resume_ctx);
        window.addEventListener("touchend", this.resume_ctx);
        window.addEventListener("pointerdown", this.resume_ctx);
    }

    private resume_ctx = async () => {
        if (this.ctx.state == "suspended" || this.ctx.state == "interrupted") {
            await this.ctx.resume();
        }
    };
    createChannel(name: string): Result<string, string> {
        const result = this.mixer.createGroup(name);
        return result.ok ? Ok(name) : Err(result.value);
    }
    async add_sfx(
        name: string,
        file: ArrayBuffer,
        id?: string,
    ): Promise<Result<string, string>> {
        const sound_id = id ?? generateUUID();
        const audiobuffer = await this.ctx.decodeAudioData(file);
        this.library.add(name, sound_id, audiobuffer);
        const result = this.mixer.create_channel(sound_id, "SFX");
        if (result.ok) return Ok(result.value);
        else return Err(result.value);
    }
    trim(id: string, start: number, end: number) {
        this.library.trim(id, start, end);
    }
    set_sfx_play_mode(id: string, mode: SFXPlayMode) {
        this.library.set_sfx_playmode(id, mode);
    }
    async play(
        id: string,
        options?: { start?: number; end?: number },
    ): Promise<Result<PlayResult, AudioEngineError>> {
        await this.resume_ctx();
        const source_id = generateUUID();
        const PlaybackInfo = this.library.get_PlayInfo(id);
        if (!PlaybackInfo) return Err(AudioEngineError.SoundNotFound);
        const { node, ...meta } = PlaybackInfo;
        const playMode = PlaybackInfo?.play_mode;
        if (!node) return Err(AudioEngineError.SoundNotFound);
        //PlayModeを確認する。絶対にあるはずやからなかったらおかしい
        if (!playMode && playMode !== 0)
            return Err(AudioEngineError.SoundNotFound);

        if (playMode >= SFXPlayMode.Restart) {
            //TODO ミキサーのプリ段より前に新しくGainNodeを挟んでFadeをできるようにする。
            const playing = this.playing_id.find((v) => v.sfx_id == meta.id);
            if (playMode == SFXPlayMode.Ignore && playing)
                return Ok<PlayResult>({ played: false });
            if (playing) {
                this.stop(playing.source_id);
                if (playMode === SFXPlayMode.Stop)
                    return Ok<PlayResult>({ played: false });
            }
        }
        this.playing[source_id] = node;
        this.playing_id.push({ source_id, sfx_id: id });
        this.mixer.input(id, node);

        node.onended = () => {
            const index = this.playing_id.findIndex(
                (value) => value.source_id == source_id,
            );
            if (index < 0) return;
            delete this.playing[source_id];
            this.playing_id.splice(index, 1);
        };
        if (options) {
            const bufferDuration = node.buffer?.duration ?? 0;
            const start = Math.min(
                Math.max(0, options.start ?? 0),
                bufferDuration,
            );
            const end = Math.min(
                Math.max(start, options.end ?? bufferDuration),
                bufferDuration,
            );
            node.start(0, start, Math.max(0, end - start));
        } else if (meta.start_from != null && meta.end_at != null) {
            node.start(
                0,
                meta.start_from,
                Math.max(0, meta.end_at - meta.start_from),
            );
        } else {
            node.start();
        }
        return Ok({ played: true, soundID: id, sourceID: source_id });
    }
    stop(source_id: string): Result<void, AudioEngineError> {
        if (!(source_id in this.playing))
            return Err(AudioEngineError.SpecifiedPlayingSoundNotFound);
        this.playing[source_id]?.stop();
        delete this.playing[source_id];
        return Ok();
    }
    async dispose() {
        this.stop_all_sfx();
        await this.ctx.close();
        window.removeEventListener("click", this.resume_ctx);
        window.removeEventListener("touchstart", this.resume_ctx);
        window.removeEventListener("touchend", this.resume_ctx);
        window.removeEventListener("pointerdown", this.resume_ctx);
    }
    get_library() {
        return this.library.get_library();
    }
    get_duration(id: string) {
        return this.library.get_duration(id);
    }
    get_waveform(id: string, buckets: number) {
        return this.library.get_waveform(id, buckets);
    }
    stop_all_sfx() {
        const keys = Object.keys(this.playing);
        for (const key of keys) {
            this.stop(key);
        }
    }
    discard_sound(id: string) {
        const playing_Target = this.playing_id.filter(
            (value) => value.sfx_id == id,
        );
        playing_Target.forEach((value) => {
            this.playing[value.source_id]?.stop();
            delete this.playing[value.source_id];
        });
        this.library.remove(id);
        this.mixer.delete_channel(id);
    }
    get_soundinfo(id: string) {
        return this.library.get_soundinfo(id);
    }
}
