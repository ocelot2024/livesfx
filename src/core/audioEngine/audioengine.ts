import { AudioMixer } from "./mixer";
import {
    SFXPlayMode,
    SoundFileType,
    SoundLibrary,
    type BGMFile,
    type SoundMeta,
} from "./sounds";
import { Err, Ok, type Result } from "../types/types";
import { generateUUID } from "../util/util";
import { AudioEngineError, AudioMixerError } from "../types/err";
import type { BGMPlayerInfo } from "../store/enginestore";

export type PlayResult =
    | { played: true; soundID: string; sourceID: string }
    | { played: false };

export const PlayerEvent = {
    play: "play",
    pause: "pause",
    stop: "stop",
    load: "load",
    unload: "unload",
    seek: "seek",
    ended: "ended",
};
export type PlayerEvent = (typeof PlayerEvent)[keyof typeof PlayerEvent];

class Deck extends EventTarget {
    player: HTMLAudioElement;
    info: BGMFile | null;
    blobURL?: string;

    constructor() {
        super();
        this.player = document.createElement("audio");
        this.info = null;

        this.player.addEventListener("play", () => {
            this.dispatchEvent(new Event(PlayerEvent.play));
        });

        this.player.addEventListener("pause", () => {
            this.dispatchEvent(new Event(PlayerEvent.pause));
        });

        this.player.addEventListener("ended", () => {
            this.dispatchEvent(new Event(PlayerEvent.ended));
        });
    }

    async play() {
        if (!this.info) return;

        await this.player.play();
    }

    pause() {
        if (!this.info) return;

        this.player.pause();
    }

    stop() {
        if (!this.info) return;

        this.player.pause();
        this.player.currentTime = 0;
    }

    load(file: BGMFile) {
        this.unload();

        this.info = file;
        this.blobURL = URL.createObjectURL(file.file);
        this.player.src = this.blobURL;

        this.dispatchEvent(new Event(PlayerEvent.load));
    }

    unload() {
        this.player.pause();
        this.player.removeAttribute("src");
        this.player.load();

        if (this.blobURL) {
            URL.revokeObjectURL(this.blobURL);
            this.blobURL = undefined;
        }

        this.info = null;

        this.dispatchEvent(new Event(PlayerEvent.unload));
    }

    seek(time: number) {
        this.player.currentTime = time;
        this.dispatchEvent(new Event(PlayerEvent.seek));
    }

    get playing() {
        return !this.player.paused;
    }

    get current_time() {
        return this.player.currentTime;
    }

    get duration() {
        return this.player.duration;
    }

    get_info(): BGMPlayerInfo {
        return {
            playing: this.playing,
            meta: this.info,
        };
    }
}

class BGMPlayer extends EventTarget {
    private deckA: Deck;
    private deckB: Deck;

    constructor() {
        super();

        this.deckA = new Deck();
        this.deckB = new Deck();

        this.bindDeckEvents(this.deckA, "A");
        this.bindDeckEvents(this.deckB, "B");
    }

    private bindDeckEvents(deck: Deck, id: "A" | "B") {
        for (const event of Object.values(PlayerEvent)) {
            deck.addEventListener(event, () => {
                this.dispatchEvent(
                    new CustomEvent(event, {
                        detail: { deck: id },
                    }),
                );
            });
        }
    }

    get_info(id: "deckA" | "deckB") {
        return this[id].get_info();
    }

    load(id: "deckA" | "deckB", file: BGMFile) {
        this[id].load(file);
    }

    play(id: "deckA" | "deckB") {
        return this[id].play();
    }

    pause(id: "deckA" | "deckB") {
        this[id].pause();
    }

    stop(id: "deckA" | "deckB") {
        this[id].stop();
    }

    seek(id: "deckA" | "deckB", time: number) {
        this[id].seek(time);
    }
}

export class Engine extends EventTarget {
    private mixer: AudioMixer;
    private library: SoundLibrary;
    private ctx = new window.AudioContext();
    private playing: Record<string, AudioBufferSourceNode>;
    private playing_id: { source_id: string; sfx_id: string }[];
    private player: BGMPlayer;
    constructor() {
        super();
        this.playing = {};
        this.playing_id = [];
        this.mixer = new AudioMixer(this.ctx);
        this.library = new SoundLibrary(this.ctx);
        this.player = new BGMPlayer();

        window.addEventListener("click", this.resume_ctx);
        window.addEventListener("touchstart", this.resume_ctx);
        window.addEventListener("touchend", this.resume_ctx);
        window.addEventListener("pointerdown", this.resume_ctx);

        for (const event of Object.values(PlayerEvent)) {
            this.player.addEventListener(event, (e) => {
                this.dispatchEvent(
                    new CustomEvent(event, {
                        detail: (e as CustomEvent).detail,
                    }),
                );
            });
        }
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
        group?: string,
        gain?: number,
    ): Promise<Result<string, string>> {
        const sound_id = id ?? generateUUID();
        const audiobuffer = await this.ctx.decodeAudioData(file);
        const groupname = group ?? "SFX";
        this.library.add(
            {
                filename: name,
                id: sound_id,
                type: SoundFileType.SFX,
                group: groupname,
            },
            audiobuffer,
        );
        const result = this.mixer.create_channel(sound_id, name, groupname);
        if (!result.ok) return Err(AudioEngineError.ChannelCreationFailed);
        this.mixer.set_gain(result.value, gain ?? 1);
        return Ok(result.value);
    }
    add_bgm(name: string, file: Blob, id?: string): Result<string, string> {
        const bgm_id = id ?? generateUUID();
        this.library.add(
            { filename: name, id: bgm_id, type: SoundFileType.BGM },
            file,
        );
        return Ok(bgm_id);
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
    get_sfx_library() {
        return this.library.get_sfx_library();
    }
    get_bgm_library() {
        return this.library.get_bgm_library();
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
    get_group_children(parent: string) {
        return this.mixer.group_children(parent);
    }
    set_gain(id: string, gain: number): Result<number, AudioMixerError> {
        this.library.set_gain(id, gain);
        return this.mixer.set_gain(id, gain);
    }
    get_gain(id: string) {
        return this.mixer.get_gain(id);
    }
    move_sound(id: string, toIndex: number): Result<void, string> {
        return this.library.move(id, toIndex);
    }

    load_bgm(id: "deckA" | "deckB", file: BGMFile) {
        this.player.load(id, file);
    }

    play_bgm(id: "deckA" | "deckB") {
        this.player.play(id);
    }

    pause_bgm(id: "deckA" | "deckB") {
        this.player.pause(id);
    }

    stop_bgm(id: "deckA" | "deckB") {
        this.player.stop(id);
    }

    seek_bgm(id: "deckA" | "deckB", time: number) {
        this.player.seek(id, time);
    }
    get_bgm_info(id: "deckA" | "deckB") {
        return this.player.get_info(id);
    }
}
