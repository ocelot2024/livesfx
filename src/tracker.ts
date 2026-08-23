export const AnalysisTrackEvent = {
    OpenPref: "OpenPref",
    StartWithBlank: "StartWithBlank",
    StartFromFile: "StartFromFile",
    ExportProject: "ExportProject",
    AddSfx: "AddSfx",
    AddBgm: "AddBgm",
    EnterEditMode: "EnterEditMode",
    ExitEditMode: "ExitEditMode",
    ChangeTab: "ChangeTab",
} as const;

export type AnalysisTrackEvent =
    (typeof AnalysisTrackEvent)[keyof typeof AnalysisTrackEvent];

export const track = (name: AnalysisTrackEvent) => {
    umami.track(name);
};
