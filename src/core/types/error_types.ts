export enum EngineError {
    NoProjectFile = "no_prj_file",
    InvalidLVSFFile = "invalid_prj_file",
    SoundNotExist = "no_sound",
    CouldNotCleanUpDB = "db_cleanup_err",
    GroupAlreadyExist = "groupexist",
    GroupNotFound = "groupnotfound",
    ChannelNotFound = "channelNotFound",
}

export enum EngineException {
    InitialiseDBException = "db_ini_except",
    NoSoundData = "no_sound_data",
    DBSaveCacheError = "ssave_cache_err",
}
