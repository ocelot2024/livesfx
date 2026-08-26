import { AudioEngine } from "../audioEngine/audioengine";
import { EngineEvent, Err, Ok, type Result } from "../types/types";
import { EngineProcState } from "../store/enginestore_type";
import { EngineError } from "../types/error_types";
import { PROJECT_FILE_EX } from "../constants";
import {
    SoundFileType,
    type SFXPlayMode,
    type SFXFile,
    type BGMFile,
    type SoundMeta,
} from "../audioEngine/sounds";
import type { AudioMixerError } from "../types/err";

import { openAudioFilePicker, openFilePicker } from "../files/fileUtil";
import { InternalProjectManager } from "./internalProjectManager";

export class ProjectManager extends InternalProjectManager {
    constructor() {
        super();
    }

    async start_with_blank() {
        if (!this.stateManager.leaveConfirm()) return;
        await this.engine.dispose();
        this.engine = new AudioEngine();
        console.log("restart...");
        await this.init();
        this.stateManager.markAsChanged();
        this.dispatchEvent(new CustomEvent(EngineEvent.Initialised));
    }
    async start_from_file(): Promise<Result<void, string>> {
        if (!this.stateManager.leaveConfirm()) return Ok();
        const { LVSFFile } = await import("../files/lvsf");
        const filelist = await openFilePicker({
            multiple: false,
            accept: "." + PROJECT_FILE_EX,
        });
        if (!filelist.some) return Ok();
        if (!filelist.value[0]) return Ok();
        const lvsf_manager = new LVSFFile();
        const info = await lvsf_manager.parse(filelist.value[0]);
        if (!info.ok) {
            this.error(EngineError.InvalidLVSFFile);
            return Err(info.value);
        }
        await this.init(info.value.filename);
        const sfx_frag: SFXFile[] = [];
        const bgm_frag: BGMFile[] = [];
        let load_failed = false;
        for (const sound_info of info.value.sounds) {
            const blob = lvsf_manager.get_sound_data(sound_info.id);
            if (!blob.ok) {
                load_failed = true;
                continue;
            }
            if (sound_info.type === SoundFileType.BGM) {
                bgm_frag.push({ ...sound_info, file: blob.value });
            } else {
                sfx_frag.push({
                    ...sound_info,
                    file: await blob.value.arrayBuffer(),
                });
            }
        }
        if (load_failed) this.warn(EngineError.PartialSoundLoadFailed);
        await this.add_sfx(sfx_frag);
        await this.add_bgm(bgm_frag);
        this.fin_proc();
        this.stateManager.markAsSaved();
        this.dispatchEvent(new Event(EngineEvent.LoadedPrj));
        return Ok();
    }
    async add_bgm(musics?: BGMFile[]) {
        if (!this.storageManager.is_initialised()) {
            this.error(EngineError.StorageNotReady);
            return;
        }
        let files: BGMFile[] = [];
        if (!musics) {
            const audiofiles = await openAudioFilePicker();
            this.proc_event(EngineProcState.Loading);
            if (!audiofiles.some) {
                this.fin_proc();
                return;
            }

            let add_failed = false;
            for (const music of audiofiles.value) {
                const blob = music;
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
            this.proc_event(EngineProcState.Loading);
            files = musics;
            for (const sound of files) {
                const result = this.engine.add_bgm({
                    name: sound.filename,
                    file: sound.file,
                    id: sound.id,
                    mime: sound.mime,
                });
                if (!result.ok) {
                    this.error(result.value);
                    continue;
                }
            }
        }
        this.proc_event(EngineProcState.Writing);

        const save_result = await this.storageManager.save_sound_cache(
            await Promise.all(
                files.map(async (v) => ({
                    ...v,
                    file: await v.file.arrayBuffer(),
                })),
            ),
        );
        if (!save_result.ok) this.error(save_result.value);
        this.fin_proc();
        this.stateManager.markAsChanged();
        console.log(this.engine.get_bgm_library());
    }
    async add_sfx(sounds?: SFXFile[]) {
        if (!this.storageManager.is_initialised()) {
            this.error(EngineError.StorageNotReady);
            return;
        }
        let files: SFXFile[] = [];
        if (!sounds) {
            const audios = await openAudioFilePicker();

            this.proc_event(EngineProcState.Loading);
            if (!audios.some) {
                this.fin_proc();
                return;
            }
            let add_failed = false;
            for (const audiofile of audios.value) {
                const bin: ArrayBuffer = await audiofile.arrayBuffer();
                const mime = audiofile.type;
                const id = await this.engine.add_sfx({
                    name: audiofile.name,
                    file: bin.slice(0),
                    mime,
                });
                if (!id.ok) {
                    add_failed = true;
                    continue;
                }
                files.push({
                    id: id.value,
                    file: bin,
                    filename: audiofile.name,
                    type: SoundFileType.SFX,
                });
            }
            if (add_failed) this.warn(EngineError.PartialSoundAddFailed);
        } else {
            this.proc_event(EngineProcState.Loading);
            files = sounds;
            for (const sound of files) {
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
                    continue;
                }
                if (
                    sound.start_from !== undefined &&
                    sound.end_at !== undefined
                ) {
                    this.trim(result.value, sound.start_from, sound.end_at);
                }
                if (sound.play_mode !== undefined) {
                    this.set_sfx_playmode(result.value, sound.play_mode);
                }
            }
        }
        this.proc_event(EngineProcState.Writing);
        const save_result = await this.storageManager.save_sound_cache(files);
        if (!save_result.ok) this.error(save_result.value);
        this.fin_proc();
        this.stateManager.markAsChanged();
    }
    play(id: string, options?: { start?: number; end?: number }) {
        const result = this.engine.play(id, options);
        return result;
    }
    stop(source_id: string) {
        this.engine.stop(source_id);
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
    trim(id: string, start: number, end: number) {
        this.engine.trim(id, start, end);
        this.stateManager.markAsChanged();
    }
    set_sfx_playmode(id: string, mode: SFXPlayMode) {
        this.engine.set_sfx_play_mode(id, mode);
        this.stateManager.markAsChanged();
    }
    async export() {
        if (!this.storageManager.is_initialised()) {
            this.error(EngineError.StorageNotReady);
            return;
        }
        this.proc_event(EngineProcState.Proccessing);
        const { LVSFFile } = await import("../files/lvsf");
        const lvsffile = new LVSFFile();
        const sfx_lib = this.get_sfx_library();
        const bgm_lib = this.get_bgm_library();

        const library: Record<string, SoundMeta> = Object.assign(
            {},
            sfx_lib,
            bgm_lib,
        );

        const files = await this.storageManager.load_sound_cache();

        if (!files.ok) {
            this.error(files.value);
            this.fin_proc();
            return;
        }
        const sfx_filesMap: Record<string, ArrayBuffer> = Object.fromEntries(
            files.value.map(({ id, file }) => [id, file]),
        );
        const bgm_filesMap = await this.engine.get_all_bgm_arraybuffer();
        const fileMap = Object.assign({}, sfx_filesMap, bgm_filesMap);

        let missing = false;
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
    get_group_children(parent: string) {
        return this.engine.get_group_children(parent);
    }
    get_group_names(): string[] {
        return this.engine.get_group_names();
    }
    create_group(name: string): Result<string, string> {
        const result = this.engine.createChannel(name);
        if (!result.ok) {
            this.error(result.value);
            return result;
        }
        this.stateManager.markAsChanged();
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
        return result;
    }
    delete_group(name: string): Result<void, string> {
        const result = this.engine.delete_group(name);
        if (!result.ok) {
            this.error(result.value);
            return result;
        }
        this.stateManager.markAsChanged();
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
        return result;
    }
    rename_group(oldName: string, newName: string): Result<void, string> {
        const result = this.engine.rename_group(oldName, newName);
        if (!result.ok) {
            this.error(result.value);
            return result;
        }
        this.stateManager.markAsChanged();
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
        return result;
    }
    move_sound_to_group(id: string, newGroup?: string): Result<void, string> {
        const result = this.engine.move_channel_to_group(id, newGroup);
        if (!result.ok) {
            this.error(result.value);
            return result;
        }
        this.stateManager.markAsChanged();
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
        return result;
    }
    set_gain(id: string, gain: number): Result<number, AudioMixerError> {
        return this.engine.set_gain(id, gain);
    }
    get_gain(id: string): Result<number, AudioMixerError> {
        return this.engine.get_gain(id);
    }
    move_sound(id: string, toIndex: number): Result<void, string> {
        const result = this.engine.move_sound(id, toIndex);
        if (!result.ok) {
            this.error(result.value);
            return result;
        }
        this.stateManager.markAsChanged();
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
        return Ok();
    }

    get_bgm_info(id: "deckA" | "deckB") {
        return this.engine.get_bgm_info(id);
    }

    load_bgm(id: "deckA" | "deckB", file: BGMFile) {
        this.engine.load_bgm(id, file);
    }

    load_bgm_to_deck(id: "deckA" | "deckB", bgmId: string) {
        const result = this.engine.load_bgm_to_deck(id, bgmId);
        if (!result.ok) {
            this.error(result.value);
            return result;
        }
        return result;
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
    rename(id: string, name: string) {
        const res = this.engine.rename(id, name);
        if (res.ok) {
            this.dispatchEvent(new Event(EngineEvent.ChangedLibrary));
        }
        return Ok();
    }
}
