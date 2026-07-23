export enum EngineEvent {
    ChangedLibrary = "changed_library",
    SavedLibrary = "saved_library",
    NewSound = "new_sound",
    Initialised = "initialised",
}
export interface SoundMeta {
    id: string;
    filename: string;
    start_from?: number;
    end_at?: number;
}
