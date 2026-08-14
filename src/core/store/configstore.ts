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
    }),
});
