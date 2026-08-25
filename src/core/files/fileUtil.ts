import { None, Some, type Option } from "../types/types";
import {
    check_audio_compatibility,
    SupportedMime,
} from "../util/compatibility";

export const openFilePicker = ({
    multiple = true,
    accept = "audio/*",
}: {
    multiple?: boolean;
    accept?: string;
} = {}): Promise<Option<File[]>> => {
    return new Promise((resolve, _reject) => {
        const input = document.createElement("input");

        input.type = "file";
        input.multiple = multiple;
        input.accept = accept;

        input.addEventListener(
            "change",
            () => resolve(Some([...(input.files ?? [])])),
            {
                once: true,
            },
        );

        input.addEventListener("cancel", () => resolve(None()));
        input.click();
    });
};

export const openAudioFilePicker = (multi?: boolean) => {
    if (Object.values(SupportedMime).length < 1) check_audio_compatibility();
    const accept = Object.keys(SupportedMime)
        .filter((key) => SupportedMime[key])
        .map((v) => "." + v)
        .join(", ");
    console.log(accept);
    return openFilePicker({ multiple: multi ?? true, accept });
};

export interface LVSFSoundFileMeta {
    offset: number;
    size: number;
    id: string;
}
