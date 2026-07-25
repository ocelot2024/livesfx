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

export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; value: E };

export type Result<T, E = Error> = Ok<T> | Err<E>;

export const Ok = <T>(value: T): Ok<T> => {
    return { ok: true, value };
};

export const Err = <E>(message: E): Err<E> => {
    return { ok: false, value: message };
};
