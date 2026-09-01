import { ProjectManager } from "..";
import type { UiCommandsManager } from "../commands/uiCommands";
import { useEngineState } from "../store/enginestore";
import { SideCar, SideCarCommand, type SideCarCommandPayload } from "./sidecar";

export class SideCarHostRelay {
    private commands: UiCommandsManager;
    private sidecar: SideCar;
    constructor(commands: UiCommandsManager, sidecar: SideCar) {
        this.commands = commands;
        this.sidecar = sidecar;
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
        }
    }
    sendSnapShot() {
        const {
            sfx_library,
            bgm_library,
            playing_sfx,
            deck,
            ducking,
            groupNames,
        } = useEngineState();
        this.sidecar.send({
            kind: "snapshot",
            state: {
                sfx_library,
                bgm_library,
                playing_sfx,
                deck,
                ducking,
                groupNames,
            },
        });
    }
}
