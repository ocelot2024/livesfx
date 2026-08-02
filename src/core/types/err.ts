export const StorageError = {
    InitialisingindexedDBFailed: "failed_indexd_db_init",
    DBIsNotInitialised: "db_isnt_initialised",
    CouldNotSaveSoundFile: "could_not_save_soundfile",
    CouldNotLoadSoundFile: "could_not_get_saved_soundfile",
} as const;

export type StorageError = (typeof StorageError)[keyof typeof StorageError];
