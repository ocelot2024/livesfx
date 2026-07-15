import { defineStore } from "pinia";
import { ref, type Ref } from "vue";
import { EngineEvent, ProjectEngine } from "..";
import { type SoundInfo } from "..";

export const useEngineState = defineStore("engine", () => {
    const library = ref<SoundInfo[]>([]);

    ProjectEngine.addEventListener(EngineEvent.ChangedLibrary, () => {
        const sounds: Record<string, SoundInfo> = ProjectEngine.get_library();
        library.value = Object.values(sounds);
    });

    return {
        library,
    };
});
