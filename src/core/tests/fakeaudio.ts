/**
 * Hand-rolled fakes for the small slice of the Web Audio / media APIs the
 * engine touches. Node 22 already gives us EventTarget, CustomEvent, Blob,
 * URL.createObjectURL/revokeObjectURL and crypto.randomUUID natively - the
 * only things missing are `window`, `document`, and the handful of
 * Web-Audio constructors that are normally globals in a browser
 * (AudioContext, MediaElementAudioSourceNode, AudioBufferSourceNode).
 *
 * We stub exactly those, as fakes that record what was done to them rather
 * than doing real audio processing - same spirit as AudioMixer's FakeNode
 * in mixer.test.ts. This intentionally avoids pulling in jsdom: the engine
 * never touches layout/rendering, only a handful of imperative APIs.
 */

/** Minimal stand-in for any Web Audio node AudioMixer/Engine calls .connect()/.disconnect() on. */
export class FakeNode {
    readonly label: string;
    connectedTo: FakeNode[] = [];
    disconnectCount = 0;
    gain = {
        value: 1,
        setTargetAtTime: (value: number, ...args: []) => {
            this.gain.value = value;
        },
    };
    constructor(label: string) {
        this.label = label;
    }
    connect(target: FakeNode) {
        this.connectedTo.push(target);
        return target;
    }
    disconnect() {
        this.disconnectCount++;
        this.connectedTo = [];
    }
}

let nodeCounter = 0;

/** Bare-bones fake AudioContext for AudioMixer-only tests (no decodeAudioData/state needed there). */
export function makeFakeContext() {
    const destination = new FakeNode("destination");
    const created: FakeNode[] = [];
    const ctx = {
        destination,
        createGain: () => {
            const node = new FakeNode(`gain-${nodeCounter++}`);
            created.push(node);
            return node as unknown as GainNode;
        },
    };
    return { ctx: ctx as unknown as AudioContext, destination, created };
}

export interface FakeAudioBuffer {
    duration: number;
    length: number;
    numberOfChannels: number;
    getChannelData(channel: number): Float32Array;
}

export function makeFakeAudioBuffer(
    opts: Partial<FakeAudioBuffer> = {},
): FakeAudioBuffer {
    const length = opts.length ?? 4;
    const numberOfChannels = opts.numberOfChannels ?? 1;
    const data = new Float32Array(length);
    return {
        duration: opts.duration ?? 1,
        length,
        numberOfChannels,
        getChannelData: opts.getChannelData ?? (() => data),
    };
}

/**
 * Fake `window.AudioContext`. Engine does `new window.AudioContext()` with
 * no args in a field initialiser, so this must be constructible with zero
 * required args. Tests grab the instance Engine created via `.instances`.
 */
export class FakeAudioContext {
    static instances: FakeAudioContext[] = [];

    readonly destination = new FakeNode("destination");
    state: "running" | "suspended" | "interrupted" | "closed" = "running";
    readonly created: FakeNode[] = [];
    readonly decodeCalls: ArrayBuffer[] = [];
    resumeCallCount = 0;
    closeCallCount = 0;

    constructor() {
        FakeAudioContext.instances.push(this);
    }
    createGain(): GainNode {
        const node = new FakeNode(`gain-${nodeCounter++}`);
        this.created.push(node);
        return node as unknown as GainNode;
    }
    async decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer> {
        this.decodeCalls.push(data);
        return makeFakeAudioBuffer() as unknown as AudioBuffer;
    }
    async resume() {
        this.resumeCallCount++;
        this.state = "running";
    }
    async close() {
        this.closeCallCount++;
        this.state = "closed";
    }
}

/** Fake `MediaElementAudioSourceNode` global, used by AudioMixer.connect_media_elem. */
export class FakeMediaElementAudioSourceNode extends FakeNode {
    readonly mediaElement: unknown;
    constructor(_ctx: unknown, options: { mediaElement: unknown }) {
        super("media-element-source");
        this.mediaElement = options.mediaElement;
    }
}

/** Fake `AudioBufferSourceNode` global, used by SoundLibrary.get_PlayInfo. */
export class FakeAudioBufferSourceNode extends FakeNode {
    static instances: FakeAudioBufferSourceNode[] = [];

    readonly buffer: FakeAudioBuffer | null;
    started = false;
    stopped = false;
    startArgs: [number?, number?, number?] | null = null;
    onended: ((ev: Event) => void) | null = null;

    constructor(_ctx: unknown, options: { buffer: FakeAudioBuffer | null }) {
        super("buffer-source");
        this.buffer = options.buffer;
        FakeAudioBufferSourceNode.instances.push(this);
    }
    start(when?: number, offset?: number, duration?: number) {
        this.started = true;
        this.startArgs = [when, offset, duration];
    }
    stop() {
        this.stopped = true;
    }
}

/**
 * Fake `<audio>` element. Mirrors just what audioengine.ts's Deck class
 * uses. Real HTMLMediaElement dispatches "play"/"pause" events off the
 * element itself when play()/pause() are called - we do the same so
 * Deck's own listeners (which re-dispatch as PlayerEvent) actually fire.
 */
export class FakeAudioElement extends EventTarget {
    static instances: FakeAudioElement[] = [];

    src = "";
    currentTime = 0;
    duration = NaN;
    paused = true;

    constructor() {
        super();
        FakeAudioElement.instances.push(this);
    }

    async play() {
        this.paused = false;
        this.dispatchEvent(new Event("play"));
    }
    pause() {
        if (this.paused) return;
        this.paused = true;
        this.dispatchEvent(new Event("pause"));
    }
    load() {
        // real HTMLMediaElement resets network state here; nothing to do.
    }
    removeAttribute(name: string) {
        if (name === "src") this.src = "";
    }
    /** Test helper: simulate the element reaching the end of playback. */
    simulateEnded() {
        this.paused = true;
        this.dispatchEvent(new Event("ended"));
    }
}

/**
 * Installs `window`, `document`, and the Web-Audio globals Engine/AudioMixer
 * reach for, using vi.stubGlobal so vitest restores everything afterwards.
 * Call from beforeEach; call the returned `reset()` from afterEach isn't
 * required (vi.unstubAllGlobals in the test file handles it), but is
 * provided for symmetry/explicitness.
 */
export function installBrowserGlobals(vi: {
    stubGlobal: (name: string, value: unknown) => void;
}) {
    FakeAudioContext.instances = [];
    FakeAudioBufferSourceNode.instances = [];
    FakeAudioElement.instances = [];

    const windowTarget = new EventTarget() as unknown as Window &
        typeof globalThis;
    // @ts-expect-error - test double, not the real AudioContext constructor
    windowTarget.AudioContext = FakeAudioContext;
    vi.stubGlobal("window", windowTarget);

    const documentStub = {
        createElement(tag: string) {
            if (tag === "audio") return new FakeAudioElement();
            throw new Error(`installBrowserGlobals: unstubbed tag "${tag}"`);
        },
        title: "",
    };
    vi.stubGlobal("document", documentStub);

    vi.stubGlobal(
        "MediaElementAudioSourceNode",
        FakeMediaElementAudioSourceNode,
    );
    vi.stubGlobal("AudioBufferSourceNode", FakeAudioBufferSourceNode);

    return { windowTarget, documentStub };
}
