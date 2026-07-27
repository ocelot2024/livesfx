import { defineStore } from "pinia";
import { ref } from "vue";
import { ProjectEngine } from "..";
import { type SoundMeta } from "..";
import { EngineEvent } from "../types";
import { EngineProcState, type Notificatin } from "./enginestore_type";

export const useEngineState = defineStore("engine", () => {
    const library = ref<SoundMeta[]>([]);
    const ui_mode = ref<"live" | "edit">("live");
    const notif_queue = ref<Notificatin[]>([]);
    const EngineState = ref<EngineProcState>(EngineProcState.Idle);

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
    });

    ProjectEngine.addEventListener(EngineEvent.FinProc, () => {
        EngineState.value = EngineProcState.Idle;
    });

    return {
        ui_mode,
        library,
        notif_queue,
        EngineState,
    };
});
