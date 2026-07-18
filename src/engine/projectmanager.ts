import { Engine } from "./audioengine";
import { EngineEvent } from "./types";
import { openFilePicker, LVSFFile } from "./filemanager";

export class ProjectManager extends EventTarget {
    private AudioEngine: Engine;
    private dirty: boolean;

    private db?: IDBDatabase;
    constructor() {
        super();
        this.dirty = false;
        this.AudioEngine = new Engine();
    }
    async init() {
        this.db = await new Promise<IDBDatabase>((resolve, reject) => {
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
        this.dirty = false;
        this.dispatchEvent(new CustomEvent(EngineEvent.Initialised));
    }
    start_from_file() {}
    async add_sound() {
        if (!this.db) return;

        const audios = await openFilePicker();
        let files: { id: string; file: ArrayBuffer }[] = [];

        for (const audiofile of audios) {
            const bin: ArrayBuffer = await audiofile.arrayBuffer();
            const id = await this.AudioEngine.add(audiofile.name, bin.slice(0));
            files.push({ id, file: bin });
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
        a.download = "名称未設定.lvsf";
        a.href = url;
        a.click();
    }
}
