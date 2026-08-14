import { defineStore } from "pinia";
import { SFXPlayMode } from "../audioEngine/sounds";

export const useConfigStore = defineStore("config", {
    state: () => ({
        enterEditModeConfirm: true,
        alertBeforeLeave: true,
        editModeAnimation: true,
        modalAnimation: true,
        defaultPlayMode: SFXPlayMode.OverLap,
        maxPoly: 30,
        autoRepeat: false,
        autoDucking: false,
        duckingAmount: 0.4, // 0(無音)〜1(そのまま)。オートダッキング時にBGMの音量をどれくらい下げるか

        // フェーダー関連 (components/Channel.vue のdB<->位置変換で使用)
        faderCurve: 3,
        faderMaxDb: 10,
        faderMinDb: -60,
        faderUnityPosition: 0.25,

        // サウンドカードの並び替え関連 (components/Sounds.vue で使用)
        dragThreshold: 8,
        swapInnerRatio: 1,
        swapCooldownMs: 160,
    }),
});
