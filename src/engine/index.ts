import { EngineEvent } from "./types";
import { type SoundInfo } from "./types";
import { ProjectManager } from "./projectmanager";

export const ProjectEngine = new ProjectManager();
export { EngineEvent };
export type { SoundInfo };
