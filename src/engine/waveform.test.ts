import { describe, expect, test } from "vitest";
import { compute_peaks } from "./waveform";

//Claude

function fakeBuffer(channelsData: number[][]): AudioBuffer {
    const arrays = channelsData.map((samples) => new Float32Array(samples));
    const length = arrays[0]?.length ?? 0;
    return {
        numberOfChannels: arrays.length,
        length,
        getChannelData: (c: number) => arrays[c]!,
    } as unknown as AudioBuffer;
}

describe("compute_peaks", () => {
    test("returns empty min/max arrays for 0 buckets", () => {
        const buffer = fakeBuffer([[0.1, 0.2, 0.3]]);
        const peaks = compute_peaks(buffer, 0);
        expect(peaks.min).toHaveLength(0);
        expect(peaks.max).toHaveLength(0);
    });

    test("returns empty min/max arrays for an empty buffer", () => {
        const buffer = fakeBuffer([[]]);
        const peaks = compute_peaks(buffer, 4);
        expect(Array.from(peaks.min)).toEqual([0, 0, 0, 0]);
        expect(Array.from(peaks.max)).toEqual([0, 0, 0, 0]);
    });

    test("finds min/max within a single bucket spanning the whole buffer", () => {
        const buffer = fakeBuffer([[0.1, -0.9, 0.5, -0.2]]);
        const peaks = compute_peaks(buffer, 1);
        expect(peaks.min[0]).toBeCloseTo(-0.9);
        expect(peaks.max[0]).toBeCloseTo(0.5);
    });

    test("does not drop zero-amplitude samples from a bucket's min/max (regression)", () => {
        const buffer = fakeBuffer([[0, 0, -0.8, 0]]);
        const peaks = compute_peaks(buffer, 1);
        expect(peaks.min[0]).toBeCloseTo(-0.8);
        expect(peaks.max[0]).toBe(0);
    });

    test("a fully silent bucket reports 0/0, not a stale +/-Infinity", () => {
        const buffer = fakeBuffer([[0, 0, 0, 0]]);
        const peaks = compute_peaks(buffer, 1);
        expect(peaks.min[0]).toBe(0);
        expect(peaks.max[0]).toBe(0);
    });

    test("takes the min/max across all channels, not just channel 0", () => {
        const buffer = fakeBuffer([
            [0.1, -0.1, 0.1, -0.1],
            [0.9, -0.9, 0.2, -0.2],
        ]);
        const peaks = compute_peaks(buffer, 1);
        expect(peaks.min[0]).toBeCloseTo(-0.9);
        expect(peaks.max[0]).toBeCloseTo(0.9);
    });

    test("splits samples across buckets in order, not just by overall min/max", () => {
        const buffer = fakeBuffer([[1, -1, 0.5, -0.5]]);
        const peaks = compute_peaks(buffer, 2);
        expect(peaks.min[0]).toBeCloseTo(-1);
        expect(peaks.max[0]).toBeCloseTo(1);
        expect(peaks.min[1]).toBeCloseTo(-0.5);
        expect(peaks.max[1]).toBeCloseTo(0.5);
    });

    test("requesting more buckets than samples still assigns every sample to a bucket", () => {
        const buffer = fakeBuffer([[1, -1]]);
        const peaks = compute_peaks(buffer, 8);
        expect(peaks.min).toHaveLength(8);
        expect(peaks.max).toHaveLength(8);
        expect(Math.min(...peaks.min)).toBeCloseTo(-1);
        expect(Math.max(...peaks.max)).toBeCloseTo(1);
    });
});
