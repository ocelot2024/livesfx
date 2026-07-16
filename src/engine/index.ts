export enum EngineEvent {
    ChangedLibrary = "changed_library",
    SavedLibrary = "saved_library",
    NewSound = "new_sound",
    Initialised = "initialised",
}

export interface SoundInfo {
    id: string;
    filename: string;
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
    get_sound(id: string) {
        if (id in this.sounds)
            return new AudioBufferSourceNode(this.ctx, {
                buffer: this.sounds[id]?.getbuffer(),
            });
    }
    get_library() {
        let frag: Record<string, SoundInfo> = {};
        for (const i in this.sounds) {
            if (!this.sounds[i]) continue;
            const id = i;
            const filename = this.sounds[i].filename;
            frag[i] = {
                id: id,
                filename,
            };
        }
        return { ...frag };
    }
}

class Engine {
    private mixer: AudioMixer;
    private library: SoundLibrary;
    private ctx = new window.AudioContext();
    private playing: Record<string, AudioBufferSourceNode>;
    constructor() {
        this.playing = {};
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
        return id;
    }
    play(id: string) {
        const source_id = crypto.randomUUID();
        const sound = this.library.get_sound(id);
        if (!sound) return;
        this.playing[source_id] = sound;
        this.mixer.send(id, sound);
        sound.onended = () => {
            delete this.playing[source_id];
        };
        sound.start();
        return { soundID: id, sourceID: source_id };
    }
    stop(source_id: string) {
        if (!(source_id in this.playing)) return;
        this.playing[source_id]?.stop();
    }
    dispose() {
        this.ctx.close();
    }
    get_library() {
        return this.library.get_library();
    }
}

export const openFilePicker = ({
    multiple = true,
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

class ProjectManager extends EventTarget {
    private AudioEngine: Engine;
    private dirty: boolean;
    constructor() {
        super();
        this.dirty = false;
        this.AudioEngine = new Engine();
    }
    start_with_blank() {
        if (this.dirty) {
            const will = confirm(
                "未保存の変更があります。終了してもよろしいですか？",
            );
            if (!will) return;
        }
        this.AudioEngine.dispose();
        this.AudioEngine = new Engine();
        console.log("restart...");
        this.dirty = false;
        this.dispatchEvent(new CustomEvent(EngineEvent.Initialised));
    }
    start_from_file() {}
    async add_sound() {
        const audios = await openFilePicker();
        for (const audiofile of audios) {
            const bin: ArrayBuffer = await audiofile.arrayBuffer();
            await this.AudioEngine.add(audiofile.name, bin);
        }
        this.dirty = true;
        this.dispatchEvent(new CustomEvent(EngineEvent.ChangedLibrary));
    }
    play(id: string) {
        const result = this.AudioEngine.play(id);
        return result;
    }
    stop(source_id: string) {
        this.AudioEngine.stop(source_id);
    }
    get_library() {
        return this.AudioEngine.get_library();
    }
}

export const ProjectEngine = new ProjectManager();
