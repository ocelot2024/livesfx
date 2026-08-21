import { defineStore } from "pinia";

export const useUiState = defineStore("ui_state", {
    state: () => ({
        tab: "pad",
    }),
});
