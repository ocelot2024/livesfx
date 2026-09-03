import { AUDIO_MIME_TYPES } from "../constants";

export const SupportedShareAPI = typeof navigator.canShare === "function";

export let SupportedMime: Record<AUDIO_MIME_TYPES, boolean> = {};

export const check_audio_compatibility = () => {
    const audio = document.createElement("audio");

    for (const [ext, mime] of Object.entries(AUDIO_MIME_TYPES)) {
        SupportedMime[ext] = mime.some((type) => {
            const result = audio.canPlayType(type);
            return result === "maybe" || result === "probably";
        });
    }
};
