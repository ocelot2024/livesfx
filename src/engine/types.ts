export enum EngineEvent {
    ChangedLibrary = "changed_library",
    SavedLibrary = "saved_library",
    NewSound = "new_sound",
    Initialised = "initialised",
}
export interface SoundInfo {
    id: string;
    filename: string;
}
