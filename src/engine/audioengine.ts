import { AudioMixer } from "./mixer";
import { SoundLibrary } from "./sounds";

export class Engine {
    private mixer: AudioMixer;
    private library: SoundLibrary;
    private ctx = new window.AudioContext();
    private playing: Record<string, AudioBufferSourceNode>;
    private playing_id: { source_id: string; sfx_id: string }[];
    constructor() {
        this.playing = {};
        this.playing_id = [];
        this.mixer = new AudioMixer(this.ctx);
        this.library = new SoundLibrary(this.ctx);

        window.addEventListener("click", () => {
            if (this.ctx.state == "suspended") {
                this.ctx.resume();
            }
        });
    }
    async add(name: string, file: ArrayBuffer, id?: string) {
        const sound_id = id ?? crypto.randomUUID();
        const audiobuffer = await this.ctx.decodeAudioData(file);
        this.library.add(name, sound_id, audiobuffer);
        this.mixer.create_channel(sound_id);
        return sound_id;
    }
    play(id: string) {
        const source_id = crypto.randomUUID();
        const sound = this.library.get_sound(id);
        if (!sound) return;
        this.playing[source_id] = sound;
        this.playing_id.push({ source_id, sfx_id: id });
        this.mixer.send(id, sound);
        sound.onended = () => {
            delete this.playing[source_id];
            this.playing_id.splice(
                this.playing_id.findIndex(
                    (value) => value.source_id == source_id,
                ),
                1,
            );
        };
        sound.start();
        return { soundID: id, sourceID: source_id };
    }
    stop(source_id: string) {
        if (!(source_id in this.playing)) return;
        this.playing[source_id]?.stop();
        delete this.playing[source_id];
    }
    async dispose() {
        await this.ctx.close();
    }
    get_library() {
        return this.library.get_library();
    }
    stop_all_sfx() {
        const keys = Object.keys(this.playing);
        for (const key of keys) {
            this.stop(key);
        }
    }
    discard_sound(id: string) {
        const playing_Target = this.playing_id.filter(
            (value) => value.sfx_id == id,
        );
        playing_Target.forEach((value) => {
            this.playing[value.source_id]?.stop();
            delete this.playing[value.source_id];
        });
        this.library.remove(id);
        this.mixer;
    }
}
