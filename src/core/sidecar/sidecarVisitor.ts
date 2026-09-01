import type { SoundMeta } from "../audioEngine/sounds";
import { useEngineState } from "../store/enginestore";
import { EngineEvent } from "../types/types";
import { SideCar, type SideCarMessage, SideCarEvent } from "./sidecar";
import type { BGMPlayerInfo } from "../store/enginestore";
import { PlayerEvent } from "../audioEngine/audioengine";
export class SideCarVisitorRelay {
    private mirror = {
        sfx_library: {} as Record<string, SoundMeta>,
        bgm_library: {} as Record<string, SoundMeta>,
        groupNames: [] as string[],
        deck: [null, null] as [BGMPlayerInfo | null, BGMPlayerInfo | null],
    };
    private sidecar: SideCar;
    private emitLocally: (event: EngineEvent, detail?: unknown) => void;
    constructor(
        sidecar: SideCar,
        emitLocally: (event: EngineEvent, detail?: unknown) => void,
    ) {
        this.sidecar = sidecar;
        this.emitLocally = emitLocally;
        this.sidecar.addEventListener(SideCarEvent.Message, (e) => {
            const msg = (e as CustomEvent<SideCarMessage>).detail;
            if (msg.kind === "snapshot") {
                const store = useEngineState();
                store.$patch(msg.state);
            }
            if (msg.kind === "event") this.applyEvent(msg.event, msg.detail);
        });
    }

    private applyEvent(event: EngineEvent, detail: unknown) {
        if (event === EngineEvent.ChangedLibrary) {
            const origin = detail as {
                sfx_library: Record<string, SoundMeta>;
                bgm_library: Record<string, SoundMeta>;
                groupNames: string[];
            };
            this.mirror.sfx_library = origin.sfx_library;
            this.mirror.bgm_library = origin.bgm_library;
            this.mirror.groupNames = origin.groupNames;
        }
        if (Object.values(PlayerEvent).includes(event as PlayerEvent)) {
            const origin = detail as { deck: "A" | "B"; info: BGMPlayerInfo };
            this.mirror.deck[origin.deck === "A" ? 0 : 1] = origin.info;
        }
        this.emitLocally(event, detail);
    }

    get_sfx_library() {
        return this.mirror.sfx_library;
    }
    get_bgm_library() {
        return this.mirror.bgm_library;
    }
    get_group_names() {
        return this.mirror.groupNames;
    }
    get_bgm_info(id: "deckA" | "deckB") {
        return this.mirror.deck[id === "deckA" ? 0 : 1];
    }
}
