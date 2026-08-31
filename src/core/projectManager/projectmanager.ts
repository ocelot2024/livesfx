import { AudioEngine } from "../audioEngine/audioengine";
import {
    EngineEvent,
    Err,
    None,
    Ok,
    Some,
    type Option,
    type Result,
} from "../types/types";
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
import { UiCommandsManager } from "../commands/uiCommands";
import { SideCar } from "../sidecar/sidecar";

export class ProjectManager extends InternalProjectManager {
    commands: UiCommandsManager;
    sidecar: SideCar;
    constructor() {
        super();
        applyGuard(this);
        this.commands = new UiCommandsManager(
            this.engine,
            this.stateManager,
            (e) => this.error(e),
        );
        this.sidecar = new SideCar();
        window.addEventListener("panic", () => {
            this.error(EngineException.Panic);
        });

        for (const event in EngineEvent) {
            this.commands.addEventListener(event, () =>
                this.dispatchEvent(new Event(event)),
            );
        }
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
        this.commands.replace_engine(this.engine);
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
        this.commands.replace_engine(this.engine);

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
                    )
                        this.engine.trim(
                            result.value,
                            sound.start_from,
                            sound.end_at,
                        );

                    if (sound.play_mode !== undefined)
                        this.engine.set_sfx_play_mode(
                            result.value,
                            sound.play_mode,
                        );
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
        return this.commands.play(id, options);
    }

    stop(source_id: string) {
        return this.commands.stop(source_id);
    }

    get_sfx_library() {
        return this.commands.get_sfx_library();
    }
    get_bgm_library() {
        return this.commands.get_bgm_library();
    }
    get_duration(id: string) {
        return this.commands.get_duration(id);
    }
    get_waveform(id: string, buckets: number) {
        return this.commands.get_waveform(id, buckets);
    }
    get_soundinfo(id: string) {
        return this.commands.get_soundinfo(id);
    }
    stop_all_sfx() {
        return this.commands.stop_all_sfx();
    }
    get_group_children(parent: string) {
        return this.commands.get_group_children(parent);
    }
    get_group_names(): string[] {
        return this.commands.get_group_names();
    }

    trim(id: string, start: number, end: number) {
        this.commands.trim(id, start, end);
    }

    set_sfx_playmode(id: string, mode: SFXPlayMode) {
        this.commands.set_sfx_playmode(id, mode);
    }

    discard_sound(id: string) {
        this.commands.discard_sound(id);
    }

    create_group(name: string): Result<string, string> {
        return this.commands.create_group(name);
    }

    delete_group(name: string): Result<void, string> {
        return this.commands.delete_group(name);
    }

    rename_group(oldName: string, newName: string): Result<void, string> {
        return this.commands.rename_group(oldName, newName);
    }

    move_sound_to_group(id: string, newGroup?: string): Result<void, string> {
        return this.commands.move_sound_to_group(id, newGroup);
    }

    move_sound(id: string, toIndex: number): Result<void, string> {
        return this.commands.move_sound(id, toIndex);
    }

    rename(id: string, name: string) {
        return this.commands.rename(id, name);
    }

    set_gain(
        id: string,
        gain: number,
        initialising?: boolean,
    ): Result<number, AudioMixerError> {
        return this.commands.set_gain(id, gain, initialising);
    }

    get_gain(id: string): Result<number, AudioMixerError> {
        return this.commands.get_gain(id);
    }

    ducking() {
        return this.commands.ducking();
    }

    get_bgm_info(id: "deckA" | "deckB") {
        return this.commands.get_bgm_info(id);
    }
    load_bgm(id: "deckA" | "deckB", file: BGMFile) {
        this.commands.load_bgm(id, file);
    }
    play_bgm(id: "deckA" | "deckB") {
        return this.commands.play_bgm(id);
    }
    pause_bgm(id: "deckA" | "deckB") {
        this.commands.pause_bgm(id);
    }
    stop_bgm(id: "deckA" | "deckB") {
        this.commands.stop_bgm(id);
    }
    seek_bgm(id: "deckA" | "deckB", time: number) {
        this.commands.seek_bgm(id, time);
    }
    eject_bgm(id: "deckA" | "deckB") {
        this.commands.unload_bgm(id);
    }

    load_bgm_to_deck(id: "deckA" | "deckB", bgmId: string) {
        return this.commands.load_bgm_to_deck(id, bgmId);
    }
    async create_host(): Promise<Option<RTCSessionDescription>> {
        const offer = await this.sidecar.createHost();
        if (!offer) return None();
        return Some(offer);
    }
    async join_host(
        offer: RTCSessionDescription,
    ): Promise<Result<RTCSessionDescription, string>> {
        const answer = await this.sidecar.joinHost(offer);
        if (!answer.ok) {
            console.log(answer.value);
            return Err(EngineError.CouldNotConnectToHost);
        }
        return Ok(answer.value);
    }
    async apply_answer(
        answer: RTCSessionDescription,
    ): Promise<Result<void, string>> {
        const res = await this.sidecar.applyAnswer(answer);
        if (res.ok) return Ok(res);
        return Err(res.value);
    }
}
