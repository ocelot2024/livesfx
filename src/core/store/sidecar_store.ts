import { defineStore } from "pinia";
import { ref } from "vue";
import type { Connections } from "../sidecar/sidecar";
import { ProjectManager } from "..";
import { EngineEvent } from "../types/types";
export const useSideCarStore = defineStore("sidecarStore", () => {
    const connections = ref<Omit<Connections, "peer" | "channel">[]>([]);

    ProjectManager.addEventListener(EngineEvent.SideCarStarted, () => {
        connections.value = [...ProjectManager.get_connections()];
    });
    ProjectManager.addEventListener(EngineEvent.SideCarEnded, () => {
        connections.value = [...ProjectManager.get_connections()];
    });
    ProjectManager.addEventListener(EngineEvent.SideCarUpdated, () => {
        connections.value = [...ProjectManager.get_connections()];
    });

    return { connections };
});
