export const PROJECT_FILE_EX = "lvsf";
export const LVSF_MAGIC_BYTE = "lvsf";
export const HEADER_SIZE = 16;
export const AUDIO_MIME_TYPES: Record<string, string> = {
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    aif: "audio/aiff",
    aiff: "audio/aiff",
    aifc: "audio/aiff",
    mp4: "audio/mp4",
    m4b: "audio/mp4",
    m4p: "audio/mp4",
    amr: "audio/amr",
    "3gp": "audio/3gpp",
    "3gpp": "audio/3gpp",
    "3g2": "audio/3gpp2",
} as const;
export type AUDIO_MIME_TYPES = keyof typeof AUDIO_MIME_TYPES;
