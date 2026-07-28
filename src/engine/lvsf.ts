import {
    Err,
    Ok,
    type lvsf_prj_info,
    type Result,
    type SoundMeta,
} from "./types";
import { type SoundFile } from "./filemanager";

const LVSF_MAGIC_BYTE = "lvsf";

export class LVSFFile {
    soundMap: Record<string, SoundMeta>;
    files: Map<string, ArrayBuffer>;
    constructor() {
        this.soundMap = {};
        this.files = new Map<string, ArrayBuffer>();
    }
    addFile(file: ArrayBuffer, sound: SoundMeta) {
        this.soundMap[sound.id] = sound;
        this.files.set(sound.id, file);
    }
    export() {
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

        const magic = new TextEncoder().encode(LVSF_MAGIC_BYTE);
        const formatVer = 0;

        header.set(magic, 0);
        headerView.setUint16(4, formatVer, true);
        headerView.setBigUint64(8, BigInt(binary_body.byteLength), true);

        return new Blob([header, binary_body, ...audios]);
    }
    private static async is_valid_lvsf(target: File) {
        const decoder = new TextDecoder();
        const header = await target.slice(0, 4).arrayBuffer();
        return decoder.decode(header) == LVSF_MAGIC_BYTE;
    }
    private static async get_prj_info_size(lvsf: File) {
        const buffer = await lvsf.slice(8, 16).arrayBuffer();
        return Number(new DataView(buffer).getBigUint64(0, true));
    }
    private static async get_prj_info(
        lvsf: File,
    ): Promise<Result<lvsf_prj_info, unknown>> {
        const decoder = new TextDecoder();
        const json_size = await this.get_prj_info_size(lvsf);
        let json;
        try {
            json = JSON.parse(
                decoder.decode(
                    await lvsf.slice(16, 16 + json_size).arrayBuffer(),
                ),
            );
        } catch (e) {
            return Err(e);
        }

        if (
            typeof json === "object" &&
            json !== null &&
            "sounds" in json &&
            "files" in json
        )
            return Ok(json);
        else return Err(false);
    }
    static async parse(lvsf: File): Promise<Result<string, string>> {
        if (!(await LVSFFile.is_valid_lvsf(lvsf)))
            return Err("given invalid file");
        const prj_info = await this.get_prj_info(lvsf);
        if (!prj_info.ok) return Err("couldn't parse prj info");

        return Ok("");
    }
}
/**
 * Header
 * 0-3 lvsf
 * 4-5 Format ver
 * 6-7 Reserved
 * 8-15 JSON size
 */
