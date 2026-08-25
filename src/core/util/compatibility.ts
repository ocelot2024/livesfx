import { AUDIO_MIME_TYPES } from "../constants";

let SupportedMime: Record<AUDIO_MIME_TYPES, boolean> = {};

export const check_audio_compatibility = () => {
    const audio = document.createElement("audio");
    for (const [ex, mime] of Object.entries(AUDIO_MIME_TYPES)) {
        const result = audio.canPlayType(mime);
        if (result === "maybe" || result === "probably") {
            SupportedMime[ex] = true;
        } else {
            SupportedMime[ex] = false;
        }
    }
};
