import { Engine } from "./audioengine";
import { EngineEvent, Err, Ok, type Result } from "./types";
import { openFilePicker, LVSFFile, type SoundFile } from "./filemanager";
import { type SoundMeta } from "./types";

const PROJECT_FILE_EX = "lvsf";

export class ProjectManager extends EventTarget {
    private projectname: string;

    private AudioEngine: Engine;
    private dirty: boolean;

    private db?: IDBDatabase;
    constructor() {
        super();
        this.projectname = "名称未設定";
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
    async init() {
        const result = await this.db_init();
        if (!result.ok) this.dispatchEvent(new Event(EngineEvent.Warn));
        this.projectname = "名称未設定";
        this.render_title(this.projectname);
    }
    private async db_init(): Promise<Result<string, unknown>> {
        if (this.db) {
            this.db.close();
            this.db = undefined;
        }

        try {
            await new Promise<void>((resolve, reject) => {
                const request = indexedDB.deleteDatabase("fileCache");
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
                request.onblocked = () =>
                    reject(new Error("Database deletion blocked"));
            });
        } catch (e) {
            return Err(e);
        }

        this.db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open("fileCache", 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains("audioFileCache")) {
                    db.createObjectStore("audioFileCache", { keyPath: "id" });
                }
            };
        });
        return Ok("DB initialised");
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
                "未保存の変更があり余す。このプロジェクトを閉じてもよいですか？",
            );
            if (!will) return Ok("");
        }
        const decoder = new TextDecoder();

        const filelist = await openFilePicker({
            multiple: false,
            accept: "." + PROJECT_FILE_EX,
        });
        if (!filelist) return Ok("");
        if (!filelist[0]) return Ok("");
        const file = filelist[0];
        //lsvfファイルならヘッダーの先頭4バイトがlvsfなはず
        const header = await file.slice(0, 4).arrayBuffer();
        const decodedheader = decoder.decode(header);
        console.log(decodedheader);
        if (decodedheader !== PROJECT_FILE_EX)
            return Err("Invalid file chosen");

        const jsonsize = await file.slice(8, 16).arrayBuffer();
        const decodedjsonsize = Number(
            new DataView(jsonsize).getBigUint64(0, true),
        );

        const json_body = await file
            .slice(16, 16 + decodedjsonsize)
            .arrayBuffer();
        const body = JSON.parse(decoder.decode(json_body)) as {
            sounds: SoundMeta[];
            files: SoundFile[];
        };
        console.log(body);
        await this.AudioEngine.dispose();
        this.AudioEngine = new Engine();
        await this.init();
        this.render_title(file.name.replace("." + PROJECT_FILE_EX, ""));
        const frag: (SoundMeta & { file: ArrayBuffer })[] = [];
        for (const sound_info of body.sounds) {
            const id = sound_info.id;

            const soundfile_info = body.files.filter((v) => v.id == id)[0];
            if (!soundfile_info)
                return Err("Could not retrieve sound files infomation.");
            //それぞれヘッダーとｊjson部の長さを足しておく
            const soundfile_pos = [
                soundfile_info.offset + 16 + decodedjsonsize,
                soundfile_info.offset +
                    16 +
                    decodedjsonsize +
                    soundfile_info.size,
            ];

            const audio = await file.slice(...soundfile_pos).arrayBuffer();

            frag.push({ file: audio, ...sound_info });
        }
        await this.add_sound(frag);
        this.dispatchEvent(new Event(EngineEvent.LoadedPrj));
        return Ok("");
    }
    async add_sound(sounds?: (SoundMeta & { file: ArrayBuffer })[]) {
        if (!this.db) return;
        let files: (SoundMeta & { file: ArrayBuffer })[] = [];

        if (!sounds) {
            const audios = await openFilePicker({
                accept: ".mp3,.m4a,.aac,.wav,.aif,.aiff,.aifc,.mp4,.m4b,.m4p,.amr,.3gp,.3gpp,.3g2",
            });

            for (const audiofile of audios) {
                const bin: ArrayBuffer = await audiofile.arrayBuffer();
                const id = await this.AudioEngine.add(
                    audiofile.name,
                    bin.slice(0),
                );
                if (!id) continue;
                files.push({ id, file: bin, filename: audiofile.name });
            }
        } else {
            files = sounds;
            for (const sound of files) {
                const result = await this.AudioEngine.add(
                    sound.filename,
                    sound.file.slice(0),
                    sound.id,
                );
                if (!result) continue;
                if (
                    sound.start_from !== undefined &&
                    sound.end_at !== undefined
                ) {
                    this.trim(result, sound.start_from, sound.end_at);
                }
            }
        }
        const transaction = this.db.transaction(
            ["audioFileCache"],
            "readwrite",
        );
        const objStore = transaction.objectStore("audioFileCache");

        for (const file of files) {
            objStore.add(file);
        }

        await new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });

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
    async export() {
        if (!this.db) return;
        const lvsffile = new LVSFFile();
        const lib = this.get_library();
        const transaction = this.db.transaction(["audioFileCache"], "readonly");
        const store = transaction.objectStore("audioFileCache");

        const files: { id: string; file: ArrayBuffer }[] = (await Promise.all(
            Object.keys(lib).map(
                (key) =>
                    new Promise((resolve, reject) => {
                        const request = store.get(key);
                        request.onerror = () => reject(request.error);
                        request.onsuccess = () => resolve(request.result);
                    }),
            ),
        )) as { id: string; file: ArrayBuffer }[];
        console.log(files);
        const fileMap = Object.fromEntries(
            files.map(({ id, file }) => [id, file]),
        );

        for (const id in lib) {
            if (!fileMap[id]) return;
            if (!lib[id]) return;
            lvsffile.addFile(fileMap[id], lib[id]);
        }
        const blob = lvsffile.build();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = `${this.projectname}.${PROJECT_FILE_EX}`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
        this.dispatchEvent(new Event(EngineEvent.SavedLibrary));
    }
}
