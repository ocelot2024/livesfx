import type { SFXFile } from "../audioEngine/sounds";
import { StorageError } from "../types/err";
import { Err, Ok, type Result } from "../types/types";

export default class {
    private db?: IDBDatabase;
    constructor() {}
    async initialise_storage(): Promise<Result<void, StorageError>> {
        if (this.db) {
            this.db.close();
            this.db = undefined;
        }

        try {
            await new Promise<void>((resolve, reject) => {
                //MP3やWavとかを一時的に補完するようなので一回全部消す。ID衝突があるとは思えないけどあった時の処理が煩雑
                const request = indexedDB.deleteDatabase("fileCache");
                request.onsuccess = () => resolve();
                request.onerror = () => reject();
                request.onblocked = () => reject();
            });
        } catch (_) {
            //今はこれだけで十分だからeに中身も与えずここでこれに収束させてる
            //DBの初期化に失敗した時点で音声を追加できない。
            //今後LocalStorageなどへのフォールバックも考える
            return Err(StorageError.InitialisingindexedDBFailed);
        }

        try {
            this.db = await new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open("fileCache", 1);
                request.onerror = () => reject();
                request.onblocked = () => reject();
                request.onsuccess = () => resolve(request.result);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains("audioFileCache")) {
                        db.createObjectStore("audioFileCache", {
                            keyPath: "id",
                        });
                    }
                };
            });
        } catch (_) {
            return Err(StorageError.InitialisingindexedDBFailed);
        }
        return Ok();
    }
    save_sound_cache(files: SFXFile[]): Promise<Result<void, StorageError>> {
        if (!this.db) {
            return Promise.resolve(Err(StorageError.DBIsNotInitialised));
        }

        const transaction = this.db.transaction(
            ["audioFileCache"],
            "readwrite",
        );

        const obj_store = transaction.objectStore("audioFileCache");

        for (const file of files) {
            obj_store.add(file);
        }

        return new Promise((resolve) => {
            transaction.oncomplete = () => resolve(Ok());
            transaction.onerror = () =>
                resolve(Err(StorageError.CouldNotSaveSoundFile));
        });
    }

    load_sound_cache(): Promise<Result<SFXFile[], StorageError>> {
        if (!this.db)
            return Promise.resolve(Err(StorageError.DBIsNotInitialised));
        const transaction = this.db.transaction(["audioFileCache"], "readonly");
        const store = transaction.objectStore("audioFileCache");

        const request = store.getAll();

        return new Promise((resolve) => {
            transaction.oncomplete = () => resolve(Ok(request.result));
            transaction.onerror = () =>
                resolve(Err(StorageError.CouldNotLoadSoundFile));
        });
    }
    is_initialised(): boolean {
        return this.db !== undefined;
    }
}
