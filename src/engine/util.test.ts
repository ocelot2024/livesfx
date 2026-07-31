import { afterEach, describe, expect, test, vi } from "vitest";
import { generateUUID } from "./util";

// Loosely matches RFC 4122-shaped UUIDs. The fallback generator specifically
// forces the version nibble to "4" and the variant nibble to 8/9/a/b, so
// this also doubles as a check that the fallback branch produces a
// structurally valid v4-looking id, not just "some string".
const UUID_LIKE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("generateUUID", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("uses crypto.randomUUID when available (the environment this app actually ships on)", () => {
        const spy = vi
            .spyOn(crypto, "randomUUID")
            .mockReturnValue("11111111-1111-4111-8111-111111111111");
        expect(generateUUID()).toBe("11111111-1111-4111-8111-111111111111");
        expect(spy).toHaveBeenCalledTimes(1);
    });

    test("falls back to a manual generator when crypto.randomUUID is unavailable", () => {
        const original = crypto.randomUUID;
        // @ts-expect-error - deliberately simulating an environment without randomUUID
        crypto.randomUUID = undefined;
        try {
            const id = generateUUID();
            expect(id).toMatch(UUID_LIKE);
        } finally {
            crypto.randomUUID = original;
        }
    });

    test("fallback ids are unique across many calls (no shared/stale Math.random seed issue)", () => {
        const original = crypto.randomUUID;
        // @ts-expect-error - deliberately simulating an environment without randomUUID
        crypto.randomUUID = undefined;
        try {
            const ids = new Set(
                Array.from({ length: 200 }, () => generateUUID()),
            );
            expect(ids.size).toBe(200);
        } finally {
            crypto.randomUUID = original;
        }
    });

    test("every generated id matches UUID shape via the normal (non-mocked) path", () => {
        expect(generateUUID()).toMatch(UUID_LIKE);
    });
});
