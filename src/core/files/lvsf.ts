import {
    Err,
    Ok,
    type lvsf_prj_info,
    type lvsf_prj_internal_meta as lvsf_prj_internal_meta,
    type Result,
    type SoundMeta,
} from "../types/types";
import { type LVSFSoundFileMeta } from "./fileUtil";
import { EngineError } from "../types/error_types";
import { LVSF_MAGIC_BYTE, HEADER_SIZE, PROJECT_FILE_EX } from "../constants";

export class LVSFFile {
    prj_info?: lvsf_prj_internal_meta;
    lvsf?: File;
    json_size?: number;

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
        let entries: LVSFSoundFileMeta[] = [];

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
    private async get_prj_info_size(lvsf: File) {
        const buffer = await lvsf.slice(8, 16).arrayBuffer();
        return Number(new DataView(buffer).getBigUint64(0, true));
    }
    private async get_prj_meta(): Promise<
        Result<lvsf_prj_internal_meta, unknown>
    > {
        if (!this.lvsf) return Err(EngineError.NoProjectFile);
        const decoder = new TextDecoder();
        let json;
        try {
            this.json_size = await this.get_prj_info_size(this.lvsf);
            json = JSON.parse(
                decoder.decode(
                    await this.lvsf
                        .slice(16, 16 + this.json_size)
                        .arrayBuffer(),
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
            return Ok(json as lvsf_prj_internal_meta);
        else return Err(false);
    }
    async parse(lvsf: File): Promise<Result<lvsf_prj_info, string>> {
        this.lvsf = lvsf;
        if (!(await LVSFFile.is_valid_lvsf(lvsf)))
            return Err("given invalid file");
        const prj_info = await this.get_prj_meta();
        if (!prj_info.ok) return Err(EngineError.InvalidLVSFFile);
        this.prj_info = prj_info.value;

        return Ok({
            sounds: prj_info.value.sounds,
            filename: LVSFFile.strip_lvsf_extension(lvsf.name),
        });
    }
    private static strip_lvsf_extension(filename: string): string {
        const suffix = "." + PROJECT_FILE_EX;
        return filename.endsWith(suffix)
            ? filename.slice(0, -suffix.length)
            : filename;
    }

    get_sound_data(id: string): Result<Blob, string> {
        if (!this.json_size || !this.lvsf || !this.prj_info)
            return Err(EngineError.NoProjectFile);
        const data = this.prj_info.files.find((value) => value.id == id);
        if (!data) return Err(EngineError.SoundNotExist);
        const audio = this.lvsf.slice(
            data.offset + this.json_size + HEADER_SIZE,
            data.size + data.offset + this.json_size + HEADER_SIZE,
        );
        return Ok(audio);
    }
}
/**
 * Header
 * 0-3 lvsf
 * 4-5 Format ver
 * 6-7 Reserved
 * 8-15 JSON size
 */
