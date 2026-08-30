import { AudioEngine } from "../audioEngine/audioengine";
import { EngineEvent, Err, Ok, type Result } from "../types/types";
import { EngineProcState } from "../store/enginestore_type";
import { EngineError, EngineException } from "../types/error_types";
import { PROJECT_FILE_EX } from "../constants";
import {
    SoundFileType,
    type SFXPlayMode,
    type SFXFile,
    type BGMFile,
    type SoundMeta,
} from "../audioEngine/sounds";
import type { AudioMixerError } from "../types/err";
import { start_from_file } from "./projectFileHandler";
import { openAudioFilePicker } from "../files/fileUtil";
import { InternalProjectManager } from "./internalProjectManager";
import { applyGuard } from "../util/util";

export class ProjectManager extends InternalProjectManager {
    constructor() {
        super();
        applyGuard(this);

        window.addEventListener("panic", () => {
            this.error(EngineException.Panic);
        });
    }
    private executeEngineAction<T, E>(
        action: () => Result<T, E>,
        markChanged: boolean = true,
    ): Result<T, E> {
        const result = action();
        if (!result.ok) {
            this.error(result.value as any);
        } else if (markChanged) {
            this.stateManager.markAsChanged();
        }
        return result;
    }

    private checkStorage(): boolean {
        if (!this.storageManager.is_initialised()) {
            this.error(EngineError.StorageNotReady);
            return false;
        }
        return true;
    }

    async start_with_blank() {
        if (!this.stateManager.leaveConfirm()) return;
        await this.engine.dispose();
        this.engine = new AudioEngine();
        await this.init();
    }

    async start_from_file(): Promise<Result<void, string>> {
        if (!this.stateManager.leaveConfirm()) return Ok();

        const result = await start_from_file();
        if (!result.ok) {
            this.error(EngineError.InvalidLVSFFile);
            return Err(result.value);
        }
        if (typeof result.value === "string") return Ok();

        const { filename, sfx, bgm, load_failed } = result.value;
        await this.init(filename);

        if (load_failed) this.warn(EngineError.PartialSoundLoadFailed);

        await this.add_sfx(sfx);
        await this.add_bgm(bgm);

        this.fin_proc();
        this.stateManager.markAsSaved();
        this.dispatchEvent(new Event(EngineEvent.LoadedPrj));

        return Ok();
    }

    async add_bgm(musics?: BGMFile[]) {
        if (!this.checkStorage()) return;

        let files: BGMFile[] = [];
        this.proc_event(EngineProcState.Loading);

        if (!musics) {
            const audiofiles = await openAudioFilePicker();
            if (!audiofiles.some) {
                this.fin_proc();
                return;
            }

            let add_failed = false;
            for (const blob of audiofiles.value) {
                const id = this.engine.add_bgm({
                    name: blob.name,
                    file: blob,
                    mime: blob.type,
                });

                if (!id.ok) {
                    add_failed = true;
                    continue;
                }
                files.push({
                    id: id.value,
                    file: blob,
                    filename: blob.name,
                    type: SoundFileType.BGM,
                });
            }
            if (add_failed) this.warn(EngineError.PartialSoundAddFailed);
        } else {
            files = musics;
            for (const sound of files) {
                const result = this.engine.add_bgm({
                    name: sound.filename,
                    file: sound.file,
                    id: sound.id,
                    mime: sound.mime,
                });
                if (!result.ok) this.error(result.value);
            }
        }

        this.proc_event(EngineProcState.Writing);
        try {
            const cacheFiles = await Promise.all(
                files.map(async (v) => ({
                    ...v,
                    file: await v.file.arrayBuffer(),
                })),
            );
            await this.storageManager.save_sound_cache(cacheFiles);
        } catch (e) {
            this.error(e as any);
        }

        this.fin_proc();
        this.stateManager.markAsChanged();
    }

    async add_sfx(sounds?: SFXFile[]) {
        if (!this.checkStorage()) return;

        let files: SFXFile[] = [];
        this.proc_event(EngineProcState.Loading);

        if (!sounds) {
            const audios = await openAudioFilePicker();
            if (!audios.some) {
                this.fin_proc();
                return;
            }

            let add_failed = false;
            await Promise.allSettled(
                audios.value.map(async (audiofile) => {
                    const bin = await audiofile.arrayBuffer();
                    const id = await this.engine.add_sfx({
                        name: audiofile.name,
                        file: bin.slice(0),
                        mime: audiofile.type,
                    });

                    if (!id.ok) {
                        add_failed = true;
                        return;
                    }
                    files.push({
                        id: id.value,
                        file: bin,
                        filename: audiofile.name,
                        type: SoundFileType.SFX,
                    });
                }),
            );
            if (add_failed) this.warn(EngineError.PartialSoundAddFailed);
        } else {
            files = sounds;
            await Promise.allSettled(
                files.map(async (sound) => {
                    const result = await this.engine.add_sfx({
                        name: sound.filename,
                        file: sound.file.slice(0),
                        id: sound.id,
                        group: sound.group,
                        gain: sound.gain,
                        mime: sound.mime,
                    });

                    if (!result.ok) {
                        this.error(result.value);
                        return;
                    }

                    if (
                        sound.start_from !== undefined &&
                        sound.end_at !== undefined
                    ) {
                        this.engine.trim(
                            result.value,
                            sound.start_from,
                            sound.end_at,
                        );
                    }
                    if (sound.play_mode !== undefined) {
                        this.engine.set_sfx_play_mode(
                            result.value,
                            sound.play_mode,
                        );
                    }
                }),
            );
        }

        this.proc_event(EngineProcState.Writing);
        try {
            await this.storageManager.save_sound_cache(files);
        } catch (e) {
            this.error(e as any);
        }

        this.fin_proc();
        this.stateManager.markAsChanged();
    }

    async export() {
        if (!this.checkStorage()) return;

        this.proc_event(EngineProcState.Proccessing);

        const files = await this.storageManager.load_sound_cache();
        if (!files.ok) {
            this.error(files.value);
            this.fin_proc();
            return;
        }

        const { LVSFFile } = await import("../files/lvsf");
        const lvsffile = new LVSFFile();

        const library: Record<string, SoundMeta> = {
            ...this.get_sfx_library(),
            ...this.get_bgm_library(),
        };

        const sfx_filesMap: Record<string, ArrayBuffer> = Object.fromEntries(
            files.value.map(({ id, file }) => [id, file]),
        );
        const bgm_filesMap = await this.engine.get_all_bgm_arraybuffer();
        const fileMap = { ...sfx_filesMap, ...bgm_filesMap };

        const missing = false;
        lvsffile.addFile(fileMap, library);
        if (missing) this.warn(EngineError.MissingCachedAudioForExport);

        const blob = lvsffile.export();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.download = `${this.projectname}.${PROJECT_FILE_EX}`;
        a.href = url;
        a.click();

        URL.revokeObjectURL(url);
        this.stateManager.markAsSaved();
        this.fin_proc();
    }

    play(id: string, options?: { start?: number; end?: number }) {
        this.dispatchEvent(
            new CustomEvent(EngineEvent.PlaySFX, { detail: { id } }),
        );
        return this.engine.play(id, {
            ...options,
            onended: () => {
                this.dispatchEvent(
                    new CustomEvent(EngineEvent.StopSFX, { detail: { id } }),
                );
            },
        });
    }

    stop(source_id: string) {
        const res = this.engine.stop(source_id);
        if (res.ok) {
            this.dispatchEvent(
                new CustomEvent(EngineEvent.StopSFX, {
                    detail: { id: res.value },
                }),
            );
        }
    }

    get_sfx_library() {
        return this.engine.get_sfx_library();
    }
    get_bgm_library() {
        return this.engine.get_bgm_library();
    }
    get_duration(id: string) {
        return this.engine.get_duration(id);
    }
    get_waveform(id: string, buckets: number) {
        return this.engine.get_waveform(id, buckets);
    }
    get_soundinfo(id: string) {
        return this.engine.get_soundinfo(id);
    }
    stop_all_sfx() {
        return this.engine.stop_all_sfx();
    }
    get_group_children(parent: string) {
        return this.engine.get_group_children(parent);
    }
    get_group_names(): string[] {
        return this.engine.get_group_names();
    }

    trim(id: string, start: number, end: number) {
        this.engine.trim(id, start, end);
        this.stateManager.markAsChanged();
    }

    set_sfx_playmode(id: string, mode: SFXPlayMode) {
        this.engine.set_sfx_play_mode(id, mode);
        this.stateManager.markAsChanged();
    }

    discard_sound(id: string) {
        this.engine.discard_sound(id);
        this.stateManager.markAsChanged();
    }

    create_group(name: string): Result<string, string> {
        return this.executeEngineAction(() => this.engine.createChannel(name));
    }

    delete_group(name: string): Result<void, string> {
        return this.executeEngineAction(() => this.engine.delete_group(name));
    }

    rename_group(oldName: string, newName: string): Result<void, string> {
        return this.executeEngineAction(() =>
            this.engine.rename_group(oldName, newName),
        );
    }

    move_sound_to_group(id: string, newGroup?: string): Result<void, string> {
        return this.executeEngineAction(() =>
            this.engine.move_channel_to_group(id, newGroup),
        );
    }

    move_sound(id: string, toIndex: number): Result<void, string> {
        return this.executeEngineAction(() =>
            this.engine.move_sound(id, toIndex),
        );
    }

    rename(id: string, name: string) {
        return this.executeEngineAction(() => this.engine.rename(id, name));
    }

    set_gain(
        id: string,
        gain: number,
        initialised?: boolean,
    ): Result<number, AudioMixerError> {
        return this.executeEngineAction(
            () => this.engine.set_gain(id, gain),
            !initialised,
        );
    }

    get_gain(id: string): Result<number, AudioMixerError> {
        return this.engine.get_gain(id);
    }

    ducking() {
        const result = this.executeEngineAction(
            () => this.engine.ducking(),
            false,
        );
        if (result.ok) {
            const eventName = result.value
                ? EngineEvent.DuckingActivated
                : EngineEvent.DuckingDeactivated;
            this.dispatchEvent(new Event(eventName));
        }
    }

    get_bgm_info(id: "deckA" | "deckB") {
        return this.engine.get_bgm_info(id);
    }
    load_bgm(id: "deckA" | "deckB", file: BGMFile) {
        this.engine.load_bgm(id, file);
    }
    play_bgm(id: "deckA" | "deckB") {
        return this.engine.play_bgm(id);
    }
    pause_bgm(id: "deckA" | "deckB") {
        this.engine.pause_bgm(id);
    }
    stop_bgm(id: "deckA" | "deckB") {
        this.engine.stop_bgm(id);
    }
    seek_bgm(id: "deckA" | "deckB", time: number) {
        this.engine.seek_bgm(id, time);
    }
    eject_bgm(id: "deckA" | "deckB") {
        this.engine.unload_bgm(id);
    }

    load_bgm_to_deck(id: "deckA" | "deckB", bgmId: string) {
        return this.executeEngineAction(
            () => this.engine.load_bgm_to_deck(id, bgmId),
            false,
        );
    }
}
