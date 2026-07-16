import { EngineEvent } from "./types";
import { type SoundInfo } from "./types";
import { AudioMixer } from "./mixer";
import { openFilePicker } from "./filemanager";
import { SoundLibrary } from "./sounds";

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
export { EngineEvent };
export type { SoundInfo };
