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

const AUDIO_MIME_TYPES: Record<string, string> = {
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    aif: "audio/aiff",
    aiff: "audio/aiff",
    aifc: "audio/aiff",
    mp4: "audio/mp4",
    m4b: "audio/mp4",
    m4p: "audio/mp4",
    amr: "audio/amr",
    "3gp": "audio/3gpp",
    "3gpp": "audio/3gpp",
    "3g2": "audio/3gpp2",
};

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
    addFile(
        files: Record<string, ArrayBuffer>,
        metas: Record<string, SoundMeta>,
    ) {
        let missing = false;
        for (const id in files) {
            const meta = metas[id];
            const file = files[id];
            if (!meta || !file) {
                missing = true;
                continue;
            }
            this.soundMap[id] = meta;
            this.files.set(id, file);
        }
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
        const filename = this.prj_info.sounds.find((v) => v.id == id)?.filename;
        const dot_pos = filename?.lastIndexOf(".");
        if (!data || !filename) return Err(EngineError.SoundNotExist);
        const ext =
            dot_pos !== undefined && dot_pos >= 0
                ? filename.slice(dot_pos + 1)
                : "";
        const mime = AUDIO_MIME_TYPES[ext];
        if (!mime) return Err(EngineError.UnknownSound);
        const audio = this.lvsf.slice(
            data.offset + this.json_size + HEADER_SIZE,
            data.size + data.offset + this.json_size + HEADER_SIZE,
            mime,
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
