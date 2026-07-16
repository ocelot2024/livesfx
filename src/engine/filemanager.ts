import type { SoundInfo } from "./types";

export const openFilePicker = ({
    multiple = true,
    accept = "audio/*",
}: {
    multiple?: boolean;
    accept?: string;
} = {}): Promise<File[]> => {
    return new Promise((resolve) => {
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

        input.click();
    });
};

interface SoundFile {
    offset: number;
    size: number;
    id: string;
}
class LVSFXFileManager {
    soundMap: Record<string, SoundInfo>;
    files: Map<string, ArrayBuffer>;
    constructor(file?: ArrayBuffer) {
        this.soundMap = {};
        this.files = new Map<string, ArrayBuffer>();
    }
    addFile(file: ArrayBuffer, sound: SoundInfo) {
        this.soundMap[sound.id] = sound;
        this.files.set(sound.id, file);
    }
    build() {
        let offset = 0;
        let entries: SoundFile[] = [];

        for (const [id, file] of this.files) {
            entries.push({
                offset: offset,
                size: file.byteLength,
                id,
            });
            offset += file.byteLength;
        }

        const body = {
            sounds: Object.values(this.soundMap),
            files: entries,
        };

        const jsoned_body = JSON.stringify(body);
        const binary_body = new TextEncoder().encode(jsoned_body);

        const audios = Array.from(this.files.values());

        const headerBuffer = new ArrayBuffer(16);
        const header = new Uint8Array(headerBuffer);
        const headerView = new DataView(headerBuffer);

        const magic = new TextEncoder().encode("LVSF");
        const formatVer = 0;

        header.set(magic, 0);
        headerView.setUint16(4, formatVer, true);
        headerView.setBigUint64(8, BigInt(binary_body.byteLength), true);

        return new Blob([header, binary_body, ...audios]);
    }
}
/**
 * Header
 * 0-3 LVSF
 * 4-5 Format ver
 * 6-7 Reserved
 * 8-15 JSON size
 */
