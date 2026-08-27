import { PROJECT_FILE_EX } from "../constants";
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
    .log(accept);
    return openFilePicker({ multiple: multi ?? true, accept });
};

export const openLvsfFilePicker = () => {
    return openFilePicker({
        multiple: false,
        accept: "." + PROJECT_FILE_EX + ", ." + PROJECT_FILE_EX.toUpperCase(),
    });
};

export interface LVSFSoundFileMeta {
    offset: number;
    size: number;
    id: string;
}
