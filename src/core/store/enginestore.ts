import { defineStore } from "pinia";
import { ref } from "vue";
import { ProjectEngine } from "..";
import { type BGMFile, type SoundMeta } from "../audioEngine/sounds";
import { EngineEvent } from "../types/types";
import { EngineProcState, type Notificatin } from "./enginestore_type";
import { EngineError, EngineException } from "../types/error_types";
import { generateUUID } from "../util/util";
import { PlayerEvent } from "../audioEngine/audioengine";
import { UNGROUPED } from "../constants";

export interface BGMPlayerInfo {
    playing: boolean;
    meta: SoundMeta | null;
    current_time: number;
    duration: number;
}

export const useEngineState = defineStore("engine", () => {
    const sfx_library = ref<SoundMeta[]>([]);
    const bgm_library = ref<SoundMeta[]>([]);
    const ui_mode = ref<"live" | "edit">("live");
    const notif_queue = ref<Notificatin[]>([]);
    const EngineState = ref<EngineProcState>(EngineProcState.Idle);
    const groupNames = ref<string[]>([]);
    const playing_sfx = ref<string[]>([]);

    const deck = ref<[BGMPlayerInfo, BGMPlayerInfo]>([
        { playing: false, meta: null, current_time: 0, duration: 0 },
        { playing: false, meta: null, current_time: 0, duration: 0 },
    ]);

    let timer: number | null;

    ProjectEngine.addEventListener(EngineEvent.ChangedLibrary, () => {
        const sounds: Record<string, SoundMeta> =
            ProjectEngine.get_sfx_library();
        const musics: Record<string, SoundMeta> =
            ProjectEngine.get_bgm_library();
        sfx_library.value = Object.values(sounds);
        bgm_library.value = Object.values(musics);
        groupNames.value = [...ProjectEngine.get_group_names(), UNGROUPED];
    });
    ProjectEngine.addEventListener(EngineEvent.Initialised, () => {
        const sounds: Record<string, SoundMeta> =
            ProjectEngine.get_sfx_library();
        const musics: Record<string, SoundMeta> =
            ProjectEngine.get_bgm_library();
        sfx_library.value = Object.values(sounds);
        bgm_library.value = Object.values(musics);
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

        const restart = async () => {
            await ProjectEngine.export();
            location.reload();
        };
        const onClick = type == "panic" ? restart : undefined;
        notif_queue.value.push({
            id,
            type: "critical",
            title: "エラーが発生しました",
            message: message,
            onClick,
        });
        setTimeout(() => {
            const index = notif_queue.value.findIndex((v) => id === v.id);

            if (index !== -1) {
                notif_queue.value.splice(index, 1);
            }
        }, 1000);
    });

    const deckKey = (id: "A" | "B"): "deckA" | "deckB" =>
        id === "A" ? "deckA" : "deckB";
    const deckIndex = (id: "A" | "B") => (id === "A" ? 0 : 1);

    const dismissNotif = (id: string) => {
        const index = notif_queue.value.findIndex((v) => id === v.id);
        if (index !== -1) {
            notif_queue.value.splice(index, 1);
        }
    };

    for (const event of Object.values(PlayerEvent)) {
        ProjectEngine.addEventListener(event, (e) => {
            const detail = (e as CustomEvent<{ deck?: "A" | "B" }>).detail;
            const id = detail?.deck;
            if (!id) return;
            deck.value[deckIndex(id)] = ProjectEngine.get_bgm_info(deckKey(id));
        });
    }
    return {
        ui_mode,
        sfx_library,
        bgm_library,
        notif_queue,
        EngineState,
        deck,
        dismissNotif,
        groupNames,
        playing_sfx,
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
    [EngineError.UnknownSound]: "未知のサウンドが追加されました",
    [EngineException.Panic]:
        "予想外のエラーが発生しました。この通知をクリックしてプロジェクトを保存し再起動できます。",
};
