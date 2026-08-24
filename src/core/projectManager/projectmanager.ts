import { Engine, PlayerEvent } from "../audioEngine/audioengine";
import { EngineEvent, Err, Ok, type Result } from "../types/types";
import { EngineProcState } from "../store/enginestore_type";
import { EngineError, EngineException } from "../types/error_types";
import { PROJECT_FILE_EX } from "../constants";
import projectStorageManager from "./projectStorageManager";
import {
    SoundFileType,
    type SFXPlayMode,
    type SFXFile,
    type BGMFile,
    type SoundMeta,
} from "../audioEngine/sounds";
import type { AudioMixerError } from "../types/err";
import projectStateManager from "./projectStateManager";
import { useConfigStore } from "../store/configstore";

import { openFilePicker } from "../files/fileUtil";

export class ProjectManager extends EventTarget {
    private projectname: string;

    private AudioEngine: Engine;

    private storageManager: projectStorageManager;
    private stateManager: projectStateManager;
    constructor() {
        super();
        this.projectname = "名称未設定";
        this.storageManager = new projectStorageManager();
        this.stateManager = new projectStateManager(this, {
            onChangedHandler: () => {
                this.render_title();
            },
            onSavedHandler: () => {
                this.render_title();
            },
        });
        this.AudioEngine = new Engine();
        window.addEventListener("beforeunload", (e) => {
            const store = useConfigStore();
            if (this.stateManager.is_dirty() && store.alertBeforeLeave) {
                e.preventDefault();
            }
        });
    }
    private error(type: EngineError | EngineException | string) {
        this.dispatchEvent(
            new CustomEvent(EngineEvent.Error, {
                detail: {
                    type: type,
                },
            }),
        );
    }
    private warn(type: EngineError) {
        this.dispatchEvent(
            new CustomEvent(EngineEvent.Warn, {
                detail: {
                    type: type,
                },
            }),
        );
    }
    async init(filename?: string) {
        if (this.AudioEngine) {
            await this.AudioEngine.dispose();
            this.AudioEngine = new Engine();
        }
        const result = this.storageManager.initialise_storage().then((r) => {
            if (!r.ok) this.warn(EngineError.CouldNotCleanUpDB);
        });
        this.bindAudioEngineEvents();
        this.projectname = filename ?? "名称未設定";
        this.render_title(this.projectname);
        this.AudioEngine.createChannel("SFX");
        this.stateManager.init();
        await result;
    }
    private proc_event(state: EngineProcState) {
        this.dispatchEvent(
            new CustomEvent(EngineEvent.Proccessing, {
                detail: { type: state },
            }),
        );
    }
    private fin_proc() {
        this.dispatchEvent(new Event(EngineEvent.FinProc));
    }
    private render_title(prjname?: string) {
        if (prjname) this.projectname = prjname;
        document.title =
            (this.stateManager.is_dirty() ? "* " : "") +
            this.projectname +
            " - LiveSFX";
    }
    async start_with_blank() {
        if (!this.stateManager.leaveConfirm()) return;
        await this.AudioEngine.dispose();
        this.AudioEngine = new Engine();
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
            const audiofiles = await openFilePicker({
                accept: ".mp3,.m4a,.aac,.wav,.aif,.aiff,.aifc,.mp4,.m4b,.m4p,.amr,.3gp,.3gpp,.3g2",
            });
            this.proc_event(EngineProcState.Loading);
            if (!audiofiles.some) {
                this.fin_proc();
                return;
            }

            let add_failed = false;
            for (const music of audiofiles.value) {
                const blob = music;
                const id = this.AudioEngine.add_bgm(blob.name, blob);
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
                const result = this.AudioEngine.add_bgm(
                    sound.filename,
                    sound.file,
                    sound.id,
                );
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
        console.log(this.AudioEngine.get_bgm_library());
    }
    async add_sfx(sounds?: SFXFile[]) {
        if (!this.storageManager.is_initialised()) {
            this.error(EngineError.StorageNotReady);
            return;
        }
        let files: SFXFile[] = [];
        if (!sounds) {
            const audios = await openFilePicker({
                accept: ".mp3,.m4a,.aac,.wav,.aif,.aiff,.aifc,.mp4,.m4b,.m4p,.amr,.3gp,.3gpp,.3g2",
            });

            this.proc_event(EngineProcState.Loading);
            if (!audios.some) {
                this.fin_proc();
                return;
            }
            let add_failed = false;
            for (const audiofile of audios.value) {
                const bin: ArrayBuffer = await audiofile.arrayBuffer();
                const id = await this.AudioEngine.add_sfx(
                    audiofile.name,
                    bin.slice(0),
                );
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
                const result = await this.AudioEngine.add_sfx(
                    sound.filename,
                    sound.file.slice(0),
                    sound.id,
                    sound.group,
                    sound.gain,
                );
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
        const result = this.AudioEngine.play(id, options);
        return result;
    }
    stop(source_id: string) {
        this.AudioEngine.stop(source_id);
    }
    get_sfx_library() {
        return this.AudioEngine.get_sfx_library();
    }
    get_bgm_library() {
        return this.AudioEngine.get_bgm_library();
    }
    get_duration(id: string) {
        return this.AudioEngine.get_duration(id);
    }
    get_waveform(id: string, buckets: number) {
        return this.AudioEngine.get_waveform(id, buckets);
    }
    get_soundinfo(id: string) {
        return this.AudioEngine.get_soundinfo(id);
    }
    stop_all_sfx() {
        return this.AudioEngine.stop_all_sfx();
    }
    trim(id: string, start: number, end: number) {
        this.AudioEngine.trim(id, start, end);
        this.stateManager.markAsChanged();
    }
    set_sfx_playmode(id: string, mode: SFXPlayMode) {
        this.AudioEngine.set_sfx_play_mode(id, mode);
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
        const bgm_filesMap = await this.AudioEngine.get_all_bgm_arraybuffer();
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
        return this.AudioEngine.get_group_children(parent);
    }
    get_group_names(): string[] {
        return this.AudioEngine.get_group_names();
    }
    create_group(name: string): Result<string, string> {
        const result = this.AudioEngine.createChannel(name);
        if (!result.ok) {
            this.error(result.value);
            return result;
        }
        this.stateManager.markAsChanged();
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
        return result;
    }
    delete_group(name: string): Result<void, string> {
        const result = this.AudioEngine.delete_group(name);
        if (!result.ok) {
            this.error(result.value);
            return result;
        }
        this.stateManager.markAsChanged();
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
        return result;
    }
    move_sound_to_group(id: string, newGroup?: string): Result<void, string> {
        const result = this.AudioEngine.move_channel_to_group(id, newGroup);
        if (!result.ok) {
            this.error(result.value);
            return result;
        }
        this.stateManager.markAsChanged();
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
        return result;
    }
    set_gain(id: string, gain: number): Result<number, AudioMixerError> {
        return this.AudioEngine.set_gain(id, gain);
    }
    get_gain(id: string): Result<number, AudioMixerError> {
        return this.AudioEngine.get_gain(id);
    }
    move_sound(id: string, toIndex: number): Result<void, string> {
        const result = this.AudioEngine.move_sound(id, toIndex);
        if (!result.ok) {
            this.error(result.value);
            return result;
        }
        this.stateManager.markAsChanged();
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
        return Ok();
    }

    private bindAudioEngineEvents() {
        for (const event of Object.values(PlayerEvent)) {
            this.AudioEngine.addEventListener(event, (e) => {
                this.dispatchEvent(
                    new CustomEvent(event, {
                        detail: (e as CustomEvent).detail,
                    }),
                );
            });
        }
    }
    get_bgm_info(id: "deckA" | "deckB") {
        return this.AudioEngine.get_bgm_info(id);
    }

    load_bgm(id: "deckA" | "deckB", file: BGMFile) {
        this.AudioEngine.load_bgm(id, file);
    }

    load_bgm_to_deck(id: "deckA" | "deckB", bgmId: string) {
        const result = this.AudioEngine.load_bgm_to_deck(id, bgmId);
        if (!result.ok) {
            this.error(result.value);
            return result;
        }
        return result;
    }

    play_bgm(id: "deckA" | "deckB") {
        return this.AudioEngine.play_bgm(id);
    }

    pause_bgm(id: "deckA" | "deckB") {
        this.AudioEngine.pause_bgm(id);
    }

    stop_bgm(id: "deckA" | "deckB") {
        this.AudioEngine.stop_bgm(id);
    }

    seek_bgm(id: "deckA" | "deckB", time: number) {
        this.AudioEngine.seek_bgm(id, time);
    }

    eject_bgm(id: "deckA" | "deckB") {
        this.AudioEngine.unload_bgm(id);
    }
}
