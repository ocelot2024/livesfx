export enum EngineError {
    NoProjectFile = "no_prj_file",
    InvalidLVSFFile = "invalid_prj_file",
    SoundNotExist = "no_sound",
    CouldNotCleanUpDB = "db_cleanup_err",
    GroupAlreadyExist = "groupexist",
    GroupNotFound = "groupnotfound",
    ChannelNotFound = "channelNotFound",
    StorageNotReady = "storage_not_ready",
    PartialSoundLoadFailed = "partial_sound_load_failed",
    PartialSoundAddFailed = "partial_sound_add_failed",
    MissingCachedAudioForExport = "missing_cache_audio_for_export",
    UnknownSound = "unknown_sound",
    CouldNotConnectToHost = "couldnotconnecttohost",
    CouldNotGetMimeType = "mime_not_existed",
    UnspportedFile = "unspported_file",
}

export enum EngineException {
    InitialiseDBException = "db_ini_except",
    NoSoundData = "no_sound_data",
    DBSaveCacheError = "ssave_cache_err",
    Panic = "panic",
}
