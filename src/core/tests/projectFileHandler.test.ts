import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { LVSFFile } from "../files/lvsf";
import { SoundFileType, type SoundMeta } from "../audioEngine/sounds";
import { SupportedMime } from "../util/compatibility";
import { Some } from "../types/types";

vi.mock("../files/fileUtil", () => ({
    openLvsfFilePicker: vi.fn(),
}));

import { openLvsfFilePicker } from "../files/fileUtil";
import { start_from_file } from "../projectManager/projectFileHandler";

const mockedPicker = vi.mocked(openLvsfFilePicker);

function bytes(length: number): Uint8Array {
    return new Uint8Array(length).fill(1);
}

function buildLvsfFile(
    filename: string,
    sounds: { meta: SoundMeta; data: Uint8Array }[],
): File {
    const writer = new LVSFFile();
    const files: Record<string, ArrayBuffer> = {};
    const metas: Record<string, SoundMeta> = {};
    for (const { meta, data } of sounds) {
        files[meta.id] = data.buffer as ArrayBuffer;
        metas[meta.id] = meta;
    }
    writer.addFile(files, metas);
    return new File([writer.export()], filename, {
        type: "application/octet-stream",
    });
}

function delayGetSoundData(delayById: Record<string, number>) {
    const original = LVSFFile.prototype.get_sound_data;
    vi.spyOn(LVSFFile.prototype, "get_sound_data").mockImplementation(
        function (this: LVSFFile, id: string) {
            const result = original.call(this, id);
            if (!result.ok) return result;
            const blob = result.value;
            const originalArrayBuffer = blob.arrayBuffer.bind(blob);
            const delay = delayById[id] ?? 0;
            blob.arrayBuffer = () =>
                new Promise((resolve) =>
                    setTimeout(() => resolve(originalArrayBuffer()), delay),
                );
            return { ok: true, value: blob };
        },
    );
}

beforeEach(() => {
    SupportedMime.wav = true;
    mockedPicker.mockReset();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("start_from_file - filename", () => {
    test("does not re-attach the .lvsf extension that LVSFFile.parse already stripped", async () => {
        const file = buildLvsfFile("公演用.lvsf", []);
        mockedPicker.mockResolvedValue(Some([file]));

        const result = await start_from_file();

        expect(result.ok).toBe(true);
        if (!result.ok || typeof result.value === "string") return;
        expect(result.value.filename).toBe("公演用");
    });
});

describe("start_from_file - SFX order restoration", () => {
    test("preserves the saved SFX order even when later sounds finish decoding before earlier ones", async () => {
        const sounds = ["s0", "s1", "s2", "s3"].map((id) => ({
            meta: {
                id,
                filename: `${id}.wav`,
                type: SoundFileType.SFX,
                mime: "audio/wav",
            } satisfies SoundMeta,
            data: bytes(4),
        }));
        const file = buildLvsfFile("プロジェクト.lvsf", sounds);
        mockedPicker.mockResolvedValue(Some([file]));

        delayGetSoundData({ s0: 120, s1: 80, s2: 40, s3: 0 });

        const result = await start_from_file();

        expect(result.ok).toBe(true);
        if (!result.ok || typeof result.value === "string") return;
        expect(result.value.sfx.map((s) => s.id)).toEqual([
            "s0",
            "s1",
            "s2",
            "s3",
        ]);
    });

    test("keeps SFX and BGM in their own saved order when interleaved and decoded out of order", async () => {
        const sounds = [
            { id: "sfx0", type: SoundFileType.SFX, delay: 90 },
            { id: "bgm0", type: SoundFileType.BGM, delay: 60 },
            { id: "sfx1", type: SoundFileType.SFX, delay: 30 },
            { id: "bgm1", type: SoundFileType.BGM, delay: 0 },
        ].map(({ id, type, delay }) => ({
            entry: {
                meta: {
                    id,
                    filename: `${id}.wav`,
                    type,
                    mime: "audio/wav",
                } satisfies SoundMeta,
                data: bytes(4),
            },
            delay,
        }));

        const file = buildLvsfFile(
            "プロジェクト.lvsf",
            sounds.map((s) => s.entry),
        );
        mockedPicker.mockResolvedValue(Some([file]));

        delayGetSoundData(
            Object.fromEntries(sounds.map((s) => [s.entry.meta.id, s.delay])),
        );

        const result = await start_from_file();

        expect(result.ok).toBe(true);
        if (!result.ok || typeof result.value === "string") return;
        expect(result.value.sfx.map((s) => s.id)).toEqual(["sfx0", "sfx1"]);
        expect(result.value.bgm.map((s) => s.id)).toEqual(["bgm0", "bgm1"]);
    });
});
