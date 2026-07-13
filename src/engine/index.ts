export enum EngineEvent {
    ChangedLibrary = "changed_library",
    SavedLibrary = "saved_library",
    NewSound = "new_sound",
}

class Channel {
    readonly inputGain: GainNode;
    readonly output: GainNode;
    constructor(ctx: AudioContext) {
        this.inputGain = ctx.createGain();
        this.output = ctx.createGain();
        // Leave room for future effects.
        this.inputGain.connect(this.output);
    }
}

class Sound {
    readonly filename: string;
    readonly id: string;
    private readonly buffer: AudioBuffer;
    constructor(name: string, id: string, buffer: AudioBuffer) {
        this.filename = name;
        this.id = id;
        this.buffer = buffer;
    }
    getbuffer() {
        return this.buffer;
    }
}

class AudioMixer {
    private ctx: AudioContext;
    private channels: Record<string, Channel>;
    private master: Channel;
    constructor(ctx: AudioContext) {
        this.ctx = ctx;
        this.channels = {};
        this.master = new Channel(ctx);
        this.master.output.connect(ctx.destination);
    }
    create_channel(id: string) {
        const channnel = new Channel(this.ctx);
        this.channels[id] = channnel;
        this.channels[id].output.connect(this.master.inputGain);
    }
    send(id: string, source: AudioBufferSourceNode) {
        const channel = this.channels[id];
        if (channel) {
            source.connect(channel.inputGain);
        }
    }
}

class SoundLibrary {
    private sounds: Record<string, Sound>;
    private ctx: AudioContext;
    constructor(ctx: AudioContext) {
        this.sounds = {};
        this.ctx = ctx;
    }
    add(name: string, id: string, audiobuffer: AudioBuffer) {
        const sound = new Sound(name, id, audiobuffer);
        this.sounds[id] = sound;
        return id;
    }
    getsound(id: string) {
        if (id in this.sounds)
            return new AudioBufferSourceNode(this.ctx, {
                buffer: this.sounds[id]?.getbuffer(),
            });
    }
}

class Engine {
    private mixer: AudioMixer;
    private library: SoundLibrary;
    private ctx = new window.AudioContext();
    constructor() {
        this.mixer = new AudioMixer(this.ctx);
        this.library = new SoundLibrary(this.ctx);

        window.addEventListener("click", () => {
            if (this.ctx.state == "suspended") {
                this.ctx.resume();
            }
        });
    }
    async add(name: string, file: ArrayBuffer) {
        const id = crypto.randomUUID();
        const audiobuffer = await this.ctx.decodeAudioData(file);
        this.library.add(name, id, audiobuffer);
        this.mixer.create_channel(id);
        dispatchEvent(
            new CustomEvent(EngineEvent.NewSound, {
                detail: { filename: name, id: id },
            }),
        );
        return id;
    }
    play(id: string) {
        const sound = this.library.getsound(id);
        if (sound) {
            this.mixer.send(id, sound);
            sound.start();
        }
    }
}

export const openFilePicker = ({
    multiple = false,
    accept = "audio/*",
}: {
    multiple?: boolean;
    accept?: string;
} = {}): Promise<File[]> => {
    return new Promise((resolve) => {
        const input = document.createElement("input");

        input.type = "file";
        input.multiple = multiple;
        input.accept = accept;

        input.addEventListener(
            "change",
            () => resolve([...(input.files ?? [])]),
            {
                once: true,
            },
        );

        input.click();
    });
};

export class ProjectManager extends EventTarget {
    private AudioEngine: Engine;
    constructor() {
        super();
        this.AudioEngine = new Engine();
    }
    start_with_blank() {}
    start_from_file() {}
    async add_sound() {
        const audios = await openFilePicker();
        for (const audiofile of audios) {
            const bin: ArrayBuffer = await audiofile.arrayBuffer();
            await this.AudioEngine.add(audiofile.name, bin);
        }
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
    }
    play(id: string) {
        this.AudioEngine.play(id);
    }
}
