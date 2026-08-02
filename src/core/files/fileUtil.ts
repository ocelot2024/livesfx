import { LVSFFile } from "./lvsf";
import { None, Some, type Option } from "../types/types";

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

export interface LVSFSoundFileMeta {
    offset: number;
    size: number;
    id: string;
}

export { LVSFFile };
