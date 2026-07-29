import { LVSFFile } from "./lvsf";

export const openFilePicker = ({
    multiple = true,
    accept = "audio/*",
}: {
    multiple?: boolean;
    accept?: string;
} = {}): Promise<File[]> => {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");

        input.type = "file";
        input.multiple = multiple;
        input.accept = accept;

        input.addEventListener(
            "change",
            () => resolve([...(input.files ?? [])]),
            {
                once: true,
            },
        );

        input.addEventListener("cancel", () => reject());
        input.click();
    });
};

export interface SoundFile {
    offset: number;
    size: number;
    id: string;
}

export { LVSFFile };
