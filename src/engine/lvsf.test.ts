import { expect, test } from "vitest";
import { LVSF_MAGIC_BYTE, LVSFFile } from "./lvsf";
import type { lvsf_prj_info } from "./types";

test("Build LVSF file", async () => {
    const instance = new LVSFFile();
    const result = instance.export();

    expect(result).toBeInstanceOf(Blob);

    const buffer = await result.arrayBuffer();
    const view = new DataView(buffer);

    const magic = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3),
    );
    expect(magic).toBe(LVSF_MAGIC_BYTE);
});

test("Parse LVSF file", async () => {
    const instance = new LVSFFile();
    const blob = instance.export();
    const file = new File([blob], "test.lvsf", { type: blob.type });
    const reader = new LVSFFile();
    const result = reader.parse(file);

    expect((await result).ok).toBe(true);
    expect(((await result).value as unknown as lvsf_prj_info).filename).toBe(
        "test",
    );
});
