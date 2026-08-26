import {
    SoundFileType,
    type BGMFile,
    type SFXFile,
} from "../audioEngine/sounds";
import { openLvsfFilePicker } from "../files/fileUtil";
import type { LVSFFile } from "../files/lvsf";
import {
    Err,
    Ok,
    type lvsf_prj_info,
    type Option,
    type Result,
} from "../types/types";

const checkLVSFFile = (fileList: Option<File[]>): Result<File, string> => {
    if (!fileList.some) return Err("no file picked");
    if (!fileList.value[0]) return Err("no file picked");
    return Ok(fileList.value[0]);
};

interface fileExResult {
    sfx: SFXFile[];
    bgm: BGMFile[];
    load_failed: boolean;
}
const extractSoundData = async (
    manager: LVSFFile,
    info: lvsf_prj_info,
): Promise<Result<fileExResult, string>> => {
    const sfx_frag: SFXFile[] = [];
    const bgm_frag: BGMFile[] = [];

    let load_failed = false;

    for (const sound_info of info.sounds) {
        const blob = manager.get_sound_data(sound_info.id);
        if (!blob.ok) {
            load_failed = true;
            continue;
        }
        if (sound_info.type === SoundFileType.BGM) {
            bgm_frag.push({ ...sound_info, file: blob.value });
        } else {
            sfx_frag.push({
                ...sound_info,
                file: await blob.value.arrayBuffer(),
            });
        }
    }
    return Ok({ sfx: sfx_frag, bgm: bgm_frag, load_failed });
};

interface ExtractedProjectFileData extends fileExResult {
    filename: string;
}
export const start_from_file = async (): Promise<
    Result<ExtractedProjectFileData, string>
> => {
    const filelist = await openLvsfFilePicker();
    const file = checkLVSFFile(filelist);
    if (!file.ok) return Err(file.value);

    const lvsf_manager = new (await import("../files/lvsf")).LVSFFile();
    const info = await lvsf_manager.parse(file.value);
    if (!info.ok) {
        return Err(info.value);
    }

    const result = await extractSoundData(lvsf_manager, info.value);
    if (!result.ok) return Err(result.value);
    return Ok({ ...result.value, filename: file.value.name });
};
