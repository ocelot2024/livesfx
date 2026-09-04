import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { SoundLibrary, SoundFileType, type SoundMeta } from "../audioEngine/sounds";
import { makeFakeAudioBuffer, installBrowserGlobals } from "./fakeaudio";

beforeEach(() => {
    installBrowserGlobals(vi);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

const ctx = {} as AudioContext;

const sfxMeta = (id: string): SoundMeta => ({
    id,
    filename: `${id}.wav`,
    type: SoundFileType.SFX,
});
const bgmMeta = (id: string): SoundMeta => ({
    id,
    filename: `${id}.wav`,
    type: SoundFileType.BGM,
});

const addSfx = (lib: SoundLibrary, id: string, option?: { index?: number }) =>
    lib.add(sfxMeta(id), makeFakeAudioBuffer() as unknown as AudioBuffer, option);

describe("SoundLibrary.add / get_sfx_library - ordering", () => {
    test("preserves insertion order, independent of the ids' own string content", () => {
        const lib = new SoundLibrary(ctx);
        addSfx(lib, "c");
        addSfx(lib, "a");
        addSfx(lib, "b");
        expect(Object.keys(lib.get_sfx_library())).toEqual(["c", "a", "b"]);
    });

    test("add() with option.index places the new sound at the given position immediately", () => {
        const lib = new SoundLibrary(ctx);
        addSfx(lib, "a");
        addSfx(lib, "b");
        addSfx(lib, "c", { index: 0 });
        expect(Object.keys(lib.get_sfx_library())).toEqual(["c", "a", "b"]);
    });

    test("BGM entries are tracked separately and never affect SFX ordering", () => {
        const lib = new SoundLibrary(ctx);
        addSfx(lib, "a");
        lib.add(bgmMeta("music"), new Blob());
        addSfx(lib, "b");
        expect(Object.keys(lib.get_sfx_library())).toEqual(["a", "b"]);
        expect(Object.keys(lib.get_bgm_library())).toEqual(["music"]);
    });
});

describe("SoundLibrary.move", () => {
    test("moves a sound later, shifting the ones in between back by one", () => {
        const lib = new SoundLibrary(ctx);
        for (const id of ["a", "b", "c", "d"]) addSfx(lib, id);
        lib.move("a", 2);
        expect(Object.keys(lib.get_sfx_library())).toEqual(["b", "c", "a", "d"]);
    });

    test("moves a sound earlier, shifting the ones in between forward by one", () => {
        const lib = new SoundLibrary(ctx);
        for (const id of ["a", "b", "c", "d"]) addSfx(lib, id);
        lib.move("d", 1);
        expect(Object.keys(lib.get_sfx_library())).toEqual(["a", "d", "b", "c"]);
    });

    test("is a no-op when the sound is already at the target index", () => {
        const lib = new SoundLibrary(ctx);
        addSfx(lib, "a");
        addSfx(lib, "b");
        const result = lib.move("a", 0);
        expect(result.ok).toBe(true);
        expect(Object.keys(lib.get_sfx_library())).toEqual(["a", "b"]);
    });

    test("clamps an out-of-range target index to the last valid position", () => {
        const lib = new SoundLibrary(ctx);
        for (const id of ["a", "b", "c"]) addSfx(lib, id);
        lib.move("a", 99);
        expect(Object.keys(lib.get_sfx_library())).toEqual(["b", "c", "a"]);
    });

    test("clamps a negative target index to the first position", () => {
        const lib = new SoundLibrary(ctx);
        for (const id of ["a", "b", "c"]) addSfx(lib, id);
        lib.move("c", -5);
        expect(Object.keys(lib.get_sfx_library())).toEqual(["c", "a", "b"]);
    });

    test("returns Err for an id that doesn't exist", () => {
        const lib = new SoundLibrary(ctx);
        addSfx(lib, "a");
        const result = lib.move("missing", 0);
        expect(result.ok).toBe(false);
    });
});

describe("SoundLibrary.reorder", () => {
    test("rebuilds the order to match the given id list in one shot", () => {
        const lib = new SoundLibrary(ctx);
        const completionOrder = ["d", "c", "b", "a"];
        for (const id of completionOrder) addSfx(lib, id);

        lib.reorder(["a", "b", "c", "d"]);
        expect(Object.keys(lib.get_sfx_library())).toEqual([
            "a",
            "b",
            "c",
            "d",
        ]);
    });

    test("appends sounds missing from the given order at the end, preserving their relative order", () => {
        const lib = new SoundLibrary(ctx);
        for (const id of ["a", "b", "c"]) addSfx(lib, id);

        lib.reorder(["c", "a"]);
        expect(Object.keys(lib.get_sfx_library())).toEqual(["c", "a", "b"]);
    });

    test("ignores ids in the order list that don't exist in the library", () => {
        const lib = new SoundLibrary(ctx);
        for (const id of ["a", "b"]) addSfx(lib, id);

        lib.reorder(["b", "missing", "a"]);
        expect(Object.keys(lib.get_sfx_library())).toEqual(["b", "a"]);
    });
});
