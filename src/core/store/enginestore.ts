import { defineStore } from "pinia";
import { ref } from "vue";
import { ProjectEngine } from "..";
import { type SoundMeta } from "../audioEngine/sounds";
import { EngineEvent } from "../types/types";
import { EngineProcState, type Notificatin } from "./enginestore_type";
import { EngineError, EngineException } from "../types/error_types";
import { generateUUID } from "../util/util";

export const useEngineState = defineStore("engine", () => {
    const library = ref<SoundMeta[]>([]);
    const ui_mode = ref<"live" | "edit">("live");
    const notif_queue = ref<Notificatin[]>([]);
    const EngineState = ref<EngineProcState>(EngineProcState.Idle);

    let timer: number | null;

    ProjectEngine.addEventListener(EngineEvent.ChangedLibrary, () => {
        const sounds: Record<string, SoundMeta> = ProjectEngine.get_library();
        library.value = Object.values(sounds);
    });
    ProjectEngine.addEventListener(EngineEvent.Initialised, () => {
        console.log(ProjectEngine.get_library());
        const sounds: Record<string, SoundMeta> = ProjectEngine.get_library();
        library.value = Object.values(sounds);
    });

    ProjectEngine.addEventListener(EngineEvent.Proccessing, (e) => {
        const event = e as CustomEvent<{ type: EngineProcState }>;
        EngineState.value = event.detail.type;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            if (EngineState.value !== EngineProcState.Idle) {
                EngineState.value = EngineProcState.SomeTakesTooLong;
            }
        }, 1000);
    });

    ProjectEngine.addEventListener(EngineEvent.FinProc, () => {
        if (timer) clearTimeout(timer);
        EngineState.value = EngineProcState.Idle;
    });

    ProjectEngine.addEventListener(EngineEvent.Error, (e) => {
        const event = e as CustomEvent<{
            type: EngineError | EngineException | string;
        }>;
        const id = generateUUID();
        const type = event.detail.type;

        const message =
            type in messages
                ? messages[type as EngineError | EngineException]
                : type;

        notif_queue.value.push({
            id,
            type: "critical",
            title: "エラーが発生しました",
            message: message,
        });
        setTimeout(() => {
            const index = notif_queue.value.findIndex((v) => id === v.id);

            if (index !== -1) {
                notif_queue.value.splice(index, 1);
            }
        }, 1000);
    });
    return {
        ui_mode,
        library,
        notif_queue,
        EngineState,
    };
});

type ErrMsgType = {
    [K in EngineError | EngineException]: string;
};

const messages: ErrMsgType = {
    [EngineException.DBSaveCacheError]:
        "データベースにキャッシュを書き込めませんでした",
    [EngineError.NoProjectFile]: "処理するプロジェクトファイルがありません。",
    [EngineError.InvalidLVSFFile]: "LVSFファイルが壊れています",
    [EngineError.SoundNotExist]: "音源が見つかりませんでした",
    [EngineError.CouldNotCleanUpDB]:
        "データベースをクリーンアップできませんでした",
    [EngineException.InitialiseDBException]:
        "データベースを初期化できませんでした",
    [EngineException.NoSoundData]: "音源が見つかりませんでした",
    [EngineError.GroupAlreadyExist]: "そのグループは既に存在します",
    [EngineError.GroupNotFound]: "グループが見つかりませんでした",
    [EngineError.ChannelNotFound]: "チャンネルが見つかりませんでした",
    [EngineError.StorageNotReady]: "キャッシュストレージが初期化されていません",
    [EngineError.PartialSoundLoadFailed]:
        "一部の音声のキャッシュ読み込みに失敗しました。",
    [EngineError.PartialSoundAddFailed]:
        "一部の音声キャッシュの保存に失敗しました",
    [EngineError.MissingCachedAudioForExport]:
        "エクスポートするのに必要なキャッシュが欠損しています。",
};
