import { Engine } from "../audioEngine/audioengine";
import { EngineEvent, Err, Ok, type Result } from "../types/types";
import { openFilePicker, LVSFFile } from "../files/fileUtil";
import { EngineProcState } from "../store/enginestore_type";
import { EngineError, EngineException } from "../types/error_types";
import { PROJECT_FILE_EX } from "../constants";
import projectStorageManager from "./projectStorageManager";
import type { SFXPlayMode, SoundFile } from "../audioEngine/sounds";
import type { AudioMixerError } from "../types/err";

export class ProjectManager extends EventTarget {
    private projectname: string;

    private AudioEngine: Engine;
    private dirty: boolean;

    private storageManager: projectStorageManager;
    constructor() {
        super();
        this.projectname = "名称未設定";
        this.storageManager = new projectStorageManager();
        this.dirty = false;
        this.AudioEngine = new Engine();
        window.addEventListener("beforeunload", (e) => {
            if (this.dirty) {
                e.preventDefault();
            }
        });
        this.addEventListener(EngineEvent.ChangedLibrary, () => {
            this.dirty = true;
            this.render_title();
        });
        this.addEventListener(EngineEvent.SavedLibrary, () => {
            this.dirty = false;
            this.render_title();
        });
        this.addEventListener(EngineEvent.LoadedPrj, () => {
            this.dirty = false;
            this.render_title();
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
    async init() {
        const result = await this.storageManager.initialise_storage();
        if (!result.ok) this.warn(EngineError.CouldNotCleanUpDB);
        this.projectname = "名称未設定";
        this.render_title(this.projectname);
        this.AudioEngine.createChannel("SFX");
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
            (this.dirty ? "* " : "") + this.projectname + " - LiveSFX";
    }
    async start_with_blank() {
        if (this.dirty) {
            const will = confirm(
                "未保存の変更があります。終了してもよろしいですか？",
            );
            if (!will) return;
        }
        await this.AudioEngine.dispose();
        this.AudioEngine = new Engine();
        console.log("restart...");
        await this.init();
        this.dirty = false;
        this.dispatchEvent(new CustomEvent(EngineEvent.Initialised));
    }
    async start_from_file(): Promise<Result<string, string>> {
        if (this.dirty) {
            const will = confirm(
                "未保存の変更があります。このプロジェクトを閉じてもよいですか？",
            );
            if (!will) return Ok("");
        }
        const filelist = await openFilePicker({
            multiple: false,
            accept: "." + PROJECT_FILE_EX,
        });
        if (!filelist.some) return Ok("");
        if (!filelist.value[0]) return Ok("");
        const lvsf_manager = new LVSFFile();
        const info = await lvsf_manager.parse(filelist.value[0]);
        if (!info.ok) {
            this.error(EngineError.InvalidLVSFFile);
            return Err(info.value);
        }
        await this.AudioEngine.dispose();
        this.AudioEngine = new Engine();
        await this.init();
        this.render_title(info.value.filename);
        const frag: SoundFile[] = [];
        let load_failed = false;
        for (const sound_info of info.value.sounds) {
            const blob = lvsf_manager.get_sound_data(sound_info.id);
            if (!blob.ok) {
                load_failed = true;
                continue;
            }
            frag.push({ ...sound_info, file: await blob.value.arrayBuffer() });
        }
        if (load_failed) this.warn(EngineError.PartialSoundLoadFailed);
        await this.add_sfx(frag);
        this.fin_proc();
        this.dispatchEvent(new Event(EngineEvent.LoadedPrj));
        return Ok("");
    }
    async add_sfx(sounds?: SoundFile[]) {
        if (!this.storageManager.is_initialised()) {
            this.error(EngineError.StorageNotReady);
            return;
        }
        let files: SoundFile[] = [];
        if (!sounds) {
            const audios = await openFilePicker({
                accept: ".mp3,.m4a,.aac,.wav,.aif,.aiff,.aifc,.mp4,.m4b,.m4p,.amr,.3gp,.3gpp,.3g2",
            });

            this.proc_event(EngineProcState.Loading);
            if (!audios.some) return;
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
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
    }
    play(id: string, options?: { start?: number; end?: number }) {
        const result = this.AudioEngine.play(id, options);
        return result;
    }
    stop(source_id: string) {
        this.AudioEngine.stop(source_id);
    }
    get_library() {
        return this.AudioEngine.get_library();
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
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
    }
    set_sfx_playmode(id: string, mode: SFXPlayMode) {
        this.AudioEngine.set_sfx_play_mode(id, mode);
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
    }
    async export() {
        if (!this.storageManager.is_initialised()) {
            this.error(EngineError.StorageNotReady);
            return;
        }
        this.proc_event(EngineProcState.Proccessing);
        const lvsffile = new LVSFFile();
        const lib = this.get_library();
        const files = await this.storageManager.load_sound_cache();

        if (!files.ok) {
            this.error(files.value);
            this.fin_proc();
            return;
        }

        const fileMap = Object.fromEntries(
            files.value.map(({ id, file }) => [id, file]),
        );

        let missing = false;
        for (const id in lib) {
            if (!fileMap[id] || !lib[id]) {
                missing = true;
                continue;
            }
            lvsffile.addFile(fileMap[id], lib[id]);
        }
        if (missing) this.warn(EngineError.MissingCachedAudioForExport);

        const blob = lvsffile.export();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = `${this.projectname}.${PROJECT_FILE_EX}`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
        this.dispatchEvent(new Event(EngineEvent.SavedLibrary));
        this.fin_proc();
    }
    get_group_children(parent: string) {
        return this.AudioEngine.get_group_children(parent);
    }
    set_gain(id: string, gain: number): Result<number, AudioMixerError> {
        return this.AudioEngine.set_gain(id, gain);
    }
    get_gain(id: string): Result<number, AudioMixerError> {
        return this.AudioEngine.get_gain(id);
    }
}
