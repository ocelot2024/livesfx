import { defineStore } from "pinia";

export const useUiState = defineStore("ui_state", {
    state: (): { ui_mode: "live" | "edit"; tab: "pad" | "bgm" | "mixer" } => ({
        ui_mode: "live",
        tab: "pad",
    }),
});
