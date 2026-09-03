import {
    Err,
    Ok,
    type lvsf_prj_info,
    type lvsf_prj_internal_meta as lvsf_prj_internal_meta,
    type Result,
} from "../types/types";
import { type LVSFSoundFileMeta } from "./fileUtil";
import { EngineError } from "../types/error_types";
import { LVSF_MAGIC_BYTE, HEADER_SIZE, PROJECT_FILE_EX } from "../constants";
import { type SoundMeta } from "../audioEngine/sounds";
import { AUDIO_MIME_TYPES } from "../constants";
import { SupportedMime } from "../util/compatibility";

export class LVSFFile {
    prj_info?: lvsf_prj_internal_meta;
    lvsf?: File;
    json_size?: number;

    soundMap: Record<string, SoundMeta>;
    files: Map<string, ArrayBuffer | Blob>;

    constructor() {
        this.soundMap = {};
        this.files = new Map<string, ArrayBuffer>();
    }
    addFile(
        files: Record<string, ArrayBuffer | Blob>,
        metas: Record<string, SoundMeta>,
    ): boolean {
        let missing = false;
        for (const id in metas) {
            const meta = metas[id];
            const file = files[id];
            if (!meta || !file) {
                missing = true;
                continue;
            }
            this.soundMap[id] = meta;
            this.files.set(id, file);
        }
        return missing;
    }
    export() {
        let offset = 0;
        let entries: LVSFSoundFileMeta[] = [];

        for (const [id, file] of this.files) {
            let size;
            if ("byteLength" in file) size = file.byteLength;
            else size = file.size;
            entries.push({
                offset: offset,
                size,
                id,
            });
            offset += size;
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
        const filemime = this.prj_info.sounds.find((v) => v.id == id)?.mime;
        const filename = this.prj_info.sounds.find((v) => v.id == id)?.filename;
        if (!data || !filemime || !filename)
            return Err(EngineError.SoundNotExist);
        const mimes = Object.entries(AUDIO_MIME_TYPES).filter((v) =>
            v[1].includes(filemime),
        )[0];
        console.log(`[MIME] ${mimes} ${filemime}`);
        if (!mimes) return Err(EngineError.SoundNotExist);
        const mimesupported = SupportedMime[mimes[0]];
        if (!mimesupported) return Err(EngineError.UnspportedFile);
        const audio = this.lvsf.slice(
            data.offset + this.json_size + HEADER_SIZE,
            data.size + data.offset + this.json_size + HEADER_SIZE,
            filemime,
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
