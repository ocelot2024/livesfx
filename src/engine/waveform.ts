export interface WaveformPeaks {
    min: Float32Array;
    max: Float32Array;
}

export function compute_peaks(
    buffer: AudioBuffer,
    buckets: number,
): WaveformPeaks {
    const min = new Float32Array(Math.max(0, buckets));
    const max = new Float32Array(Math.max(0, buckets));

    if (buckets <= 0 || buffer.length === 0) return { min, max };

    const channels: Float32Array[] = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        channels.push(buffer.getChannelData(c));
    }

    const samplesPerBucket = buffer.length / buckets;

    for (let b = 0; b < buckets; b++) {
        const start = Math.floor(b * samplesPerBucket);
        const end = Math.max(start + 1, Math.floor((b + 1) * samplesPerBucket));

        let bucketMin = Infinity;
        let bucketMax = -Infinity;

        for (let i = start; i < end && i < buffer.length; i++) {
            for (const channel of channels) {
                const v = channel[i];
                if (v === undefined) continue;
                if (v < bucketMin) bucketMin = v;
                if (v > bucketMax) bucketMax = v;
            }
        }

        if (bucketMin === Infinity) {
            bucketMin = 0;
            bucketMax = 0;
        }

        min[b] = bucketMin;
        max[b] = bucketMax;
    }

    return { min, max };
}
