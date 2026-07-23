import { defineStore } from "pinia";
import { ref } from "vue";
import { ProjectEngine } from "..";
import { type SoundMeta } from "..";
import { EngineEvent } from "../types";

export const useEngineState = defineStore("engine", () => {
    const library = ref<SoundMeta[]>([]);
    const ui_mode = ref<"live" | "edit">("live");

    ProjectEngine.addEventListener(EngineEvent.ChangedLibrary, () => {
        const sounds: Record<string, SoundMeta> = ProjectEngine.get_library();
        library.value = Object.values(sounds);
    });
    ProjectEngine.addEventListener(EngineEvent.Initialised, () => {
        console.log(ProjectEngine.get_library());
        const sounds: Record<string, SoundMeta> = ProjectEngine.get_library();
        library.value = Object.values(sounds);
    });
    return {
        ui_mode,
        library,
    };
});
