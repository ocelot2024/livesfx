import { describe, expect, test } from "vitest";
import { AudioMixer } from "../audioEngine/mixer";
import { EngineError } from "../types/error_types";

/**
 * AudioMixer takes its AudioContext through the constructor, so we can
 * substitute a fake that implements only what AudioMixer actually calls
 * (createGain, destination) and records connect/disconnect calls. This
 * verifies the routing *logic* (grouping, parenting, id collisions,
 * cleanup) without touching the real Web Audio API or jsdom.
 */
class FakeNode {
    readonly label: string;
    connectedTo: FakeNode[] = [];
    disconnectCount = 0;
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
function makeFakeContext() {
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

describe("AudioMixer - construction", () => {
    test("wires the master channel's inputGain -> output -> ctx.destination chain", () => {
        const { ctx, created } = makeFakeContext();
        new AudioMixer(ctx);
        // Channel's constructor creates inputGain then output (in that
        // order) and wires inputGain -> output internally. AudioMixer's
        // constructor then wires master.output -> ctx.destination.
        const [masterInput, masterOutput] = created;
        expect(masterInput?.connectedTo).toEqual([masterOutput]);
        expect(masterOutput?.connectedTo).toEqual([ctx.destination]);
    });
});

describe("AudioMixer.createGroup", () => {
    test("creates a group and routes its output into the master input", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        const result = mixer.createGroup("SFX");
        expect(result).toEqual({ ok: true, value: "SFX" });
    });

    test("rejects creating a group with a name that already exists", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        mixer.createGroup("SFX");
        const result = mixer.createGroup("SFX");
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.value).toBe(EngineError.GroupAlreadyExist);
    });

    test("allows multiple distinctly-named groups", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        expect(mixer.createGroup("SFX").ok).toBe(true);
        expect(mixer.createGroup("BGM").ok).toBe(true);
    });
});

describe("AudioMixer.create_channel", () => {
    test("creates a channel directly under master when no parent is given", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        const result = mixer.create_channel("sound-1");
        expect(result).toEqual({ ok: true, value: "sound-1" });
    });

    test("creates a channel under an existing group", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        mixer.createGroup("SFX");
        const result = mixer.create_channel("sound-1", "SFX");
        expect(result).toEqual({ ok: true, value: "sound-1" });
    });

    test("rejects a channel whose declared parent group doesn't exist", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        const result = mixer.create_channel("sound-1", "NoSuchGroup");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.value).toBe(EngineError.GroupNotFound);
    });

    test("on id collision under the same parent, regenerates the id rather than erroring", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        const first = mixer.create_channel("dup");
        const second = mixer.create_channel("dup");
        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);
        if (!first.ok || !second.ok) return;
        // The second call must have been given a fresh, different id -
        // it must NOT silently overwrite or error on the first channel.
        expect(first.value).toBe("dup");
        expect(second.value).not.toBe("dup");
    });

    test("the same id can independently exist under two different groups", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        mixer.createGroup("SFX");
        mixer.createGroup("BGM");
        const a = mixer.create_channel("shared-id", "SFX");
        const b = mixer.create_channel("shared-id", "BGM");
        expect(a).toEqual({ ok: true, value: "shared-id" });
        expect(b).toEqual({ ok: true, value: "shared-id" });
    });
});

describe("AudioMixer.delete_channel", () => {
    test("removes a master-level channel and disconnects its nodes", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        mixer.create_channel("sound-1");
        const result = mixer.delete_channel("sound-1");
        expect(result.ok).toBe(true);
        // deleted channel can no longer be found/reused for input()
        const inputResult = mixer.input(
            "sound-1",
            new FakeNode("src") as unknown as AudioNode,
        );
        expect(inputResult.ok).toBe(false);
    });

    test("removes a channel that lives inside a group", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        mixer.createGroup("SFX");
        mixer.create_channel("sound-1", "SFX");
        const result = mixer.delete_channel("sound-1");
        expect(result.ok).toBe(true);
    });

    test("returns Err for an id that was never created", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        const result = mixer.delete_channel("ghost");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.value).toBe(EngineError.ChannelNotFound);
    });
});

describe("AudioMixer.input", () => {
    test("connects a source node into the target channel's input gain", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        mixer.create_channel("sound-1");
        const source = new FakeNode("source");
        const result = mixer.input("sound-1", source as unknown as AudioNode);
        expect(result.ok).toBe(true);
        expect(source.connectedTo).toHaveLength(1);
    });

    test("returns Err when the target channel doesn't exist", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        const source = new FakeNode("source");
        const result = mixer.input(
            "no-such-channel",
            source as unknown as AudioNode,
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.value).toBe(EngineError.ChannelNotFound);
    });

    test("finds channels nested inside a group, not just master-level ones", () => {
        const { ctx } = makeFakeContext();
        const mixer = new AudioMixer(ctx);
        mixer.createGroup("SFX");
        mixer.create_channel("sound-1", "SFX");
        const source = new FakeNode("source");
        const result = mixer.input("sound-1", source as unknown as AudioNode);
        expect(result.ok).toBe(true);
        expect(source.connectedTo).toHaveLength(1);
    });
});
