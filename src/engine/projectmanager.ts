import { Engine } from "./audioengine";
import { EngineEvent, type SoundInfo } from "./types";
import { openFilePicker, LVSFFile, type SoundFile } from "./filemanager";

const PROJECT_FILE_EX = "LVSF";

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
    }
    async db_init() {
        this.db = await new Promise<IDBDatabase>(async (resolve, reject) => {
            const delete_request = indexedDB.deleteDatabase("fileCache");
            await new Promise((resolve, reject) => {
                delete_request.onsuccess = () => resolve(undefined);
                delete_request.onerror = () => reject(delete_request.error);
            });

            const request = indexedDB.open("fileCache", 1);
            request.onerror = () => {
                reject(request.error);
            };
            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains("audioFileCache")) {
                    db.createObjectStore("audioFileCache", { keyPath: "id" });
                }
            };
        });
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
        await this.db_init();
        this.dirty = false;
        this.dispatchEvent(new CustomEvent(EngineEvent.Initialised));
    }
    async start_from_file() {
        const decoder = new TextDecoder();

        const filelist = await openFilePicker({
            multiple: false,
            accept: PROJECT_FILE_EX,
        });
        if (!filelist) return;
        if (!filelist[0]) return;
        const file = filelist[0];

        //lsvfファイルならヘッダーの先頭4バイトがLVSFなはず
        const header = await file.slice(0, 4).arrayBuffer();
        const decodedheader = decoder.decode(header);
        console.log(decodedheader);
        if (decodedheader !== PROJECT_FILE_EX) return;

        const jsonsize = await file.slice(8, 16).arrayBuffer();
        const decodedjsonsize = Number(
            new DataView(jsonsize).getBigUint64(0, true),
        );

        const json_body = await file
            .slice(16, 16 + decodedjsonsize)
            .arrayBuffer();
        const body = JSON.parse(decoder.decode(json_body)) as {
            sounds: SoundInfo[];
            files: SoundFile[];
        };
        await this.AudioEngine.dispose();
        this.AudioEngine = new Engine();
        await this.db_init();
        let frag = [];
        for (const sound_info of body.sounds) {
            const id = sound_info.id;

            const soundfile_info = body.files.filter((v) => v.id == id)[0];
            if (!soundfile_info) return;
            //それぞれヘッダーとｊjson部の長さを足しておく
            const soundfile_pos = [
                soundfile_info.offset + 16 + decodedjsonsize,
                soundfile_info.offset +
                    16 +
                    decodedjsonsize +
                    soundfile_info.size,
            ];

            const audio = await file.slice(...soundfile_pos).arrayBuffer();

            frag.push({ id, file: audio, name: sound_info.filename });
        }
        await this.add_sound(frag);
    }
    async add_sound(
        sounds?: { id: string; file: ArrayBuffer; name: string }[],
    ) {
        if (!this.db) return;
        let files: { id: string; file: ArrayBuffer; name: string }[] = [];

        if (!sounds) {
            const audios = await openFilePicker();

            for (const audiofile of audios) {
                const bin: ArrayBuffer = await audiofile.arrayBuffer();
                const id = await this.AudioEngine.add(
                    audiofile.name,
                    bin.slice(0),
                );
                if (!id) continue;
                files.push({ id, file: bin, name: audiofile.name });
            }
        } else {
            files = sounds;
            for (const sound of files) {
                const result = await this.AudioEngine.add(
                    sound.name,
                    sound.file.slice(0),
                    sound.id,
                );
                if (!result) continue;
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

        this.dirty = true;
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
    }
    play(id: string) {
        const result = this.AudioEngine.play(id);
        return result;
    }
    stop(source_id: string) {
        this.AudioEngine.stop(source_id);
    }
    get_library() {
        return this.AudioEngine.get_library();
    }
    stop_all_sfx() {
        return this.AudioEngine.stop_all_sfx();
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
    }
}
