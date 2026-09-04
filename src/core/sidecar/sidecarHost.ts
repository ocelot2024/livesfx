import type { AudioEngine } from "../audioEngine/audioengine";
import type { UiCommandsManager } from "../commands/uiCommands";
import { useEngineState } from "../store/enginestore";
import type { EngineEvent } from "../types/types";
import {
    SideCar,
    SideCarCommand,
    type SideCarCommandPayload,
    type SideCarStateSnapshot,
} from "./sidecar";

export class SideCarHostRelay {
    private commands: UiCommandsManager;
    private sidecar: SideCar;
    private engine: AudioEngine;
    constructor(
        commands: UiCommandsManager,
        sidecar: SideCar,
        engine: AudioEngine,
    ) {
        this.commands = commands;
        this.sidecar = sidecar;
        this.engine = engine;
    }
    excec(payload: SideCarCommandPayload) {
        switch (payload.cmd) {
            case SideCarCommand.Play:
                return this.commands.play(payload.id, payload.options);
            case SideCarCommand.Stop:
                return this.commands.stop(payload.source_id);
            case SideCarCommand.StopAllSfx:
                return this.commands.stop_all_sfx();
            case SideCarCommand.Ducking:
                return this.commands.ducking();
            case SideCarCommand.SetGain:
                return this.commands.set_gain(
                    payload.id,
                    payload.gain,
                    payload.initialising,
                );
            case SideCarCommand.PlayBgm:
                return this.commands.play_bgm(payload.deck);
            case SideCarCommand.PauseBgm:
                return this.commands.pause_bgm(payload.deck);
            case SideCarCommand.StopBgm:
                return this.commands.stop_bgm(payload.deck);
            case SideCarCommand.SeekBgm:
                return this.commands.seek_bgm(payload.deck, payload.time);
            case SideCarCommand.LoadBgmToDeck:
                return this.commands.load_bgm_to_deck(
                    payload.deck,
                    payload.bgmId,
                );
            case SideCarCommand.UnloadBGM:
                return this.commands.unload_bgm(payload.deck);
            case SideCarCommand.ToggleLoop:
                return this.commands.loop_bgm(payload.id);
        }
    }
    send_event(event: EngineEvent, detail?: unknown) {
        this.sidecar.send({
            kind: "event",
            event,
            detail,
        });
    }
    buildLibraryState() {
        return {
            sfx_library: this.commands.get_sfx_library(),
            bgm_library: this.commands.get_bgm_library(),
            groupNames: this.commands.get_group_names(),
            channels: this.commands.get_all_channels(),
        };
    }
    sendSnapShot() {
        const { playing_sfx, deck, ducking } = useEngineState();
        const state: SideCarStateSnapshot = {
            ...this.buildLibraryState(),
            playing_sfx,
            deck,
            ducking,
        };
        this.sidecar.send({
            kind: "snapshot",
            state,
        });
    }
}
