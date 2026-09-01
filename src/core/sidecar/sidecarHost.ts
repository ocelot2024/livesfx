import type { UiCommandsManager } from "../commands/uiCommands";
import { SideCarCommand, type SideCarCommandPayload } from "./sidecar";

export class SideCarCommandExecutor {
    private commands: UiCommandsManager;
    constructor(commands: UiCommandsManager) {
        this.commands = commands;
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
}
