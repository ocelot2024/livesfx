import { EngineEvent } from "./types/types";
import { type SoundMeta } from "./types/types";
import { ProjectManager } from "./projectManager/projectmanager";

export const ProjectEngine = new ProjectManager();
export { EngineEvent };
export type { SoundMeta };
