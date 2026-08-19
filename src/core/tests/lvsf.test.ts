import { describe, expect, test } from "vitest";
import { LVSFFile } from "../files/lvsf";
import { LVSF_MAGIC_BYTE } from "../constants";
import { EngineError } from "../types/error_types";
import {
    SFXPlayMode,
    SoundFileType,
    type SoundMeta,
} from "../audioEngine/sounds";

const HEADER_SIZE = 16;

/**
 * Hand-builds a raw .lvsf byte buffer without going through LVSFFile.export(),
 * so parse() can be exercised against inputs it doesn't control the shape
 * of (corrupted files, files edited by hand, files from a future format
 * version, etc).
 */
function buildRawLvsf({
    magic = LVSF_MAGIC_BYTE,
    formatVer = 0,
    body,
    audio = new Uint8Array(0),
    declaredJsonSize,
}: {
    magic?: string;
    formatVer?: number;
    body: unknown;
    audio?: Uint8Array<ArrayBuffer>;
    declaredJsonSize?: number;
}): Blob {
    const jsonBytes = new TextEncoder().encode(JSON.stringify(body));
    const headerBuffer = new ArrayBuffer(HEADER_SIZE);
    const header = new Uint8Array(headerBuffer);
    const headerView = new DataView(headerBuffer);

    header.set(new TextEncoder().encode(magic), 0);
    headerView.setUint16(4, formatVer, true);
    headerView.setBigUint64(
        8,
        BigInt(declaredJsonSize ?? jsonBytes.byteLength),
        true,
    );

    return new Blob([header, jsonBytes, audio]);
}

function toFile(blob: Blob, name: string): File {
    return new File([blob], name, { type: blob.type });
}

const soundA: SoundMeta = {
    id: "sound-a",
    filename: "効果音A.wav",
    start_from: 0.5,
    end_at: 3.25,
    type: SoundFileType.SFX,
};
const soundB: SoundMeta = {
    id: "sound-b",
    filename: "雷鳴.wav",
    start_from: 0,
    type: SoundFileType.SFX,
    end_at: 10,
};
const bytesA = new Uint8Array([1, 2, 3, 4, 5]);
const bytesB = new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 255]);

function buildTwoSoundWriter(): LVSFFile {
    const writer = new LVSFFile();
    writer.addFile(bytesA.buffer as ArrayBuffer, soundA);
    writer.addFile(bytesB.buffer as ArrayBuffer, soundB);
    return writer;
}

describe("LVSFFile.export", () => {
    test("produces a Blob whose first 4 bytes are the magic header", async () => {
        const result = new LVSFFile().export();
        expect(result).toBeInstanceOf(Blob);

        const buffer = await result.slice(0, 4).arrayBuffer();
        expect(new TextDecoder().decode(buffer)).toBe(LVSF_MAGIC_BYTE);
    });

    test("encodes the JSON body byte length (not the JS string length) into the header", async () => {
        const writer = new LVSFFile();
        writer.addFile(bytesA.buffer as ArrayBuffer, soundA);
        const blob = writer.export();

        const buffer = await blob.arrayBuffer();
        const declaredSize = Number(new DataView(buffer).getBigUint64(8, true));

        const expectedBody = {
            sounds: [soundA],
            files: [{ offset: 0, size: bytesA.byteLength, id: soundA.id }],
        };
        const expectedBytes = new TextEncoder().encode(
            JSON.stringify(expectedBody),
        );

        expect(declaredSize).toBe(expectedBytes.byteLength);
        expect(expectedBytes.byteLength).toBeGreaterThan(
            JSON.stringify(expectedBody).length,
        );
    });

    test("places audio bytes back-to-back immediately after header+JSON, with no gap or padding", async () => {
        const writer = buildTwoSoundWriter();
        const blob = writer.export();
        const buffer = await blob.arrayBuffer();

        const jsonSize = Number(new DataView(buffer).getBigUint64(8, true));
        const audioStart = HEADER_SIZE + jsonSize;
        const audioRegion = new Uint8Array(buffer.slice(audioStart));

        expect(blob.size).toBe(
            HEADER_SIZE + jsonSize + bytesA.byteLength + bytesB.byteLength,
        );
        expect(Array.from(audioRegion)).toEqual([
            ...Array.from(bytesA),
            ...Array.from(bytesB),
        ]);
    });

    test("exports an empty sounds/files body when no sound has been added", async () => {
        const blob = new LVSFFile().export();
        const buffer = await blob.arrayBuffer();
        const jsonSize = Number(new DataView(buffer).getBigUint64(8, true));
        const json = JSON.parse(
            new TextDecoder().decode(
                buffer.slice(HEADER_SIZE, HEADER_SIZE + jsonSize),
            ),
        );
        expect(json).toEqual({ sounds: [], files: [] });
    });
});

describe("LVSFFile.parse - round trip", () => {
    test("restores every SoundMeta field for multiple sounds, matched by id", async () => {
        const writer = buildTwoSoundWriter();
        const file = toFile(writer.export(), "project.lvsf");

        const reader = new LVSFFile();
        const result = await reader.parse(file);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.sounds).toEqual(
            expect.arrayContaining([soundA, soundB]),
        );
        expect(result.value.sounds).toHaveLength(2);
    });

    test("restores exact audio byte content per sound id (regression: offset calculation)", async () => {
        const writer = buildTwoSoundWriter();
        const file = toFile(writer.export(), "project.lvsf");

        const reader = new LVSFFile();
        await reader.parse(file);

        const dataA = reader.get_sound_data(soundA.id);
        const dataB = reader.get_sound_data(soundB.id);
        expect(dataA.ok && dataB.ok).toBe(true);
        if (!dataA.ok || !dataB.ok) return;

        expect(dataA.value.size).toBe(bytesA.byteLength);
        expect(dataB.value.size).toBe(bytesB.byteLength);
        expect(
            Array.from(new Uint8Array(await dataA.value.arrayBuffer())),
        ).toEqual(Array.from(bytesA));
        expect(
            Array.from(new Uint8Array(await dataB.value.arrayBuffer())),
        ).toEqual(Array.from(bytesB));
    });

    test("round trip survives a single sound too (degenerate multi-file case)", async () => {
        const writer = new LVSFFile();
        writer.addFile(bytesA.buffer as ArrayBuffer, soundA);
        const file = toFile(writer.export(), "one-sound.lvsf");

        const reader = new LVSFFile();
        const result = await reader.parse(file);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.sounds).toEqual([soundA]);

        const data = reader.get_sound_data(soundA.id);
        expect(data.ok).toBe(true);
        if (!data.ok) return;
        expect(
            Array.from(new Uint8Array(await data.value.arrayBuffer())),
        ).toEqual(Array.from(bytesA));
    });

    test("derives the project name by stripping only a trailing .lvsf extension", async () => {
        const blob = new LVSFFile().export();
        const reader = new LVSFFile();
        const result = await reader.parse(
            toFile(blob, "本番用プロジェクト.lvsf"),
        );
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.filename).toBe("本番用プロジェクト");
    });

    test("does not mangle a filename that merely contains .lvsf mid-string", async () => {
        const blob = new LVSFFile().export();
        const reader = new LVSFFile();
        const result = await reader.parse(toFile(blob, "公演.lvsf.bak.lvsf"));
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.filename).toBe("公演.lvsf.bak");
    });

    test("leaves the filename untouched when it has no .lvsf extension at all", async () => {
        const blob = new LVSFFile().export();
        const reader = new LVSFFile();
        const result = await reader.parse(toFile(blob, "no-extension"));
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.filename).toBe("no-extension");
    });
});

describe("LVSFFile.parse - play_mode round trip", () => {
    test("restores play_mode for every enum value, including OverLap (0)", async () => {
        // SFXPlayMode.OverLap is 0, which is falsy in JS. A round trip that
        // uses `sound.play_mode ?? default` or `if (sound.play_mode)` style
        // checks anywhere in the pipeline would silently turn a real
        // OverLap value into "unset". Exercise every enum member, including 0.
        const writer = new LVSFFile();
        const sounds: SoundMeta[] = [
            {
                id: "s-overlap",
                filename: "a.wav",
                play_mode: SFXPlayMode.OverLap,
                type: SoundFileType.SFX,
            },
            {
                id: "s-restart",
                filename: "b.wav",
                play_mode: SFXPlayMode.Restart,
                type: SoundFileType.SFX,
            },
            {
                id: "s-ignore",
                filename: "c.wav",
                play_mode: SFXPlayMode.Ignore,
                type: SoundFileType.SFX,
            },
            {
                id: "s-stop",
                filename: "d.wav",
                play_mode: SFXPlayMode.Stop,
                type: SoundFileType.SFX,
            },
        ];
        for (const sound of sounds) {
            writer.addFile(new Uint8Array([1]).buffer as ArrayBuffer, sound);
        }
        const file = toFile(writer.export(), "playmodes.lvsf");

        const reader = new LVSFFile();
        const result = await reader.parse(file);
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        for (const expected of sounds) {
            const restored = result.value.sounds.find(
                (s) => s.id === expected.id,
            );
            expect(restored?.play_mode).toBe(expected.play_mode);
        }
    });

    test("a sound saved without play_mode round trips with the field absent (not coerced to 0)", async () => {
        const writer = new LVSFFile();
        const sound: SoundMeta = {
            id: "s-none",
            filename: "e.wav",
            type: SoundFileType.SFX,
        };
        writer.addFile(new Uint8Array([1]).buffer as ArrayBuffer, sound);
        const file = toFile(writer.export(), "no-playmode.lvsf");

        const reader = new LVSFFile();
        const result = await reader.parse(file);
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const restored = result.value.sounds.find((s) => s.id === "s-none");
        expect(restored).toBeDefined();
        expect("play_mode" in (restored as object)).toBe(false);
        expect(restored?.play_mode).toBeUndefined();
    });

    test("an old-format file with no play_mode key anywhere in its JSON still parses", async () => {
        // Simulates a .lvsf written before play_mode existed at all, rather
        // than one written by the current export() with the field merely
        // omitted per-sound.
        const legacySound = { id: "legacy-1", filename: "old.wav" };
        const blob = buildRawLvsf({
            body: {
                sounds: [legacySound],
                files: [{ offset: 0, size: 1, id: "legacy-1" }],
            },
            audio: new Uint8Array([42]),
        });
        const result = await new LVSFFile().parse(toFile(blob, "legacy.lvsf"));
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.sounds).toEqual([legacySound]);
    });
});

describe("LVSFFile.parse - invalid input handling", () => {
    test("rejects a file with the wrong magic bytes", async () => {
        const blob = buildRawLvsf({
            magic: "not!",
            body: { sounds: [], files: [] },
        });
        const result = await new LVSFFile().parse(toFile(blob, "wrong.lvsf"));
        expect(result.ok).toBe(false);
    });

    test("rejects an empty file rather than throwing", async () => {
        const result = await new LVSFFile().parse(
            toFile(new Blob([]), "empty.lvsf"),
        );
        expect(result.ok).toBe(false);
    });

    test("rejects a file that is shorter than the header, without throwing", async () => {
        const truncated = new Uint8Array(
            new TextEncoder().encode(LVSF_MAGIC_BYTE),
        );
        const result = await new LVSFFile().parse(
            toFile(new Blob([truncated]), "truncated.lvsf"),
        );
        expect(result.ok).toBe(false);
    });

    test("rejects a body that isn't valid JSON", async () => {
        const badBody = new TextEncoder().encode("{not valid json");
        const headerBuffer = new ArrayBuffer(HEADER_SIZE);
        const header = new Uint8Array(headerBuffer);
        header.set(new TextEncoder().encode(LVSF_MAGIC_BYTE), 0);
        new DataView(headerBuffer).setBigUint64(
            8,
            BigInt(badBody.byteLength),
            true,
        );
        const blob = new Blob([header, badBody]);

        const result = await new LVSFFile().parse(
            toFile(blob, "bad-json.lvsf"),
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.value).toBe(EngineError.InvalidLVSFFile);
    });

    test("rejects valid JSON that is missing the sounds/files shape", async () => {
        const blob = buildRawLvsf({ body: { unrelated: true } });
        const result = await new LVSFFile().parse(
            toFile(blob, "wrong-shape.lvsf"),
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.value).toBe(EngineError.InvalidLVSFFile);
    });

    test("rejects when the declared JSON size swallows trailing audio bytes", async () => {
        const blob = buildRawLvsf({
            body: { sounds: [], files: [] },
            audio: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
            declaredJsonSize:
                new TextEncoder().encode(
                    JSON.stringify({ sounds: [], files: [] }),
                ).byteLength + 5,
        });
        const result = await new LVSFFile().parse(toFile(blob, "overrun.lvsf"));
        expect(result.ok).toBe(false);
    });
});

describe("LVSFFile.get_sound_data", () => {
    test("returns Err before any file has been parsed", () => {
        const result = new LVSFFile().get_sound_data("whatever");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.value).toBe(EngineError.NoProjectFile);
    });

    test("returns Err for an id that doesn't exist in the parsed project", async () => {
        const writer = buildTwoSoundWriter();
        const reader = new LVSFFile();
        await reader.parse(toFile(writer.export(), "project.lvsf"));

        const result = reader.get_sound_data("does-not-exist");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.value).toBe(EngineError.SoundNotExist);
    });
});

describe("LVSFFile - documented gaps (not yet enforced by parse)", () => {
    test("formatVer is written on export but never checked on parse", async () => {
        const futureVersionBlob = buildRawLvsf({
            formatVer: 9999,
            body: { sounds: [], files: [] },
        });
        const result = await new LVSFFile().parse(
            toFile(futureVersionBlob, "future.lvsf"),
        );
        expect(result.ok).toBe(true);
    });
});
