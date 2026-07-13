import { defineStore } from "pinia";
import { reactive, type Reactive } from "vue";

export const useEngineState = defineStore("engine", () => {
    const channels: Reactive<Record<string, string>> = reactive({});
    return { channels };
});
