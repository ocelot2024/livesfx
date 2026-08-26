import { isPWA } from "./core/util/util";

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

const pendingEvents: AnalysisTrackEvent[] = [];
let initialised_umami = false;
let err_umami = false;
let umami_ready = false;
export const initUmami = () => {
    if (initialised_umami) return;
    initialised_umami = true;
    if (document.querySelector("#umami-script")) {
        return;
    }
    const script = document.createElement("script");
    script.src = "https://cloud.umami.is/script.js";
    script.defer = true;
    script.id = "umami-script";
    script.dataset.websiteId = "9c2ad5a9-6a16-492a-843e-128594a4cc14";
    script.addEventListener("load", () => {
        umami.identify({
            version: __APP_VERSION__,
            standalone: isPWA() ? "yes" : "no",
        });
        pendingEvents.forEach((event) => umami.track(event));
        pendingEvents.length = 0;
        umami_ready = true;
    });
    script.addEventListener("error", () => {
        err_umami = true;
        pendingEvents.length = 0;
    });
    document.body.appendChild(script);
};

export const track = (name: AnalysisTrackEvent) => {
    if (err_umami) return;

    if (!umami_ready) {
        pendingEvents.push(name);
        initUmami();
        return;
    }

    umami.track(name);
};
