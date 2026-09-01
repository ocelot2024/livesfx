import { createApp } from "vue";
import { createPinia, type Pinia } from "pinia";
import App from "./App.vue";
import "./style/main.css";
import { ProjectManager } from "./core/index.ts";
import { registerSW } from "virtual:pwa-register";
import { createPersistPlugin } from "./core/store/persist.ts";
import { useUpdateStore } from "./core/store/updatestore.ts";
import { setZXingModuleOverrides } from "vue-qrcode-reader";
import { onPanic, showFatalOverlay } from "./core/util/util.ts";

let pinia: Pinia | null = null;
let pendingRegistration: ServiceWorkerRegistration | undefined;

//https://github.com/Sec-ant/barcode-detector/issues/18
setZXingModuleOverrides({
    locateFile: (path, prefix) => {
        if (path.endsWith(".wasm")) {
            return "/zxing_reader.wasm";
        }
        return prefix + path;
    },
});

const app = createApp(App);
app.config.errorHandler = (err) => {
    onPanic(err);
};

pinia = createPinia();
pinia.use(createPersistPlugin(["config", "ui_state"]));
useUpdateStore(pinia).setRegistration(pendingRegistration);

try {
    await ProjectManager.init(undefined, true);
} catch (e) {
    showFatalOverlay(e);
    throw e;
}

app.use(pinia);
app.mount("#app");

const updateSW = registerSW({
    onNeedRefresh() {
        if (!pinia) return;
        useUpdateStore(pinia).notifyUpdateAvailable(() => updateSW(true));
    },
    onRegisteredSW(_swUrl, registration) {
        pendingRegistration = registration;
        if (!pinia) return;
        useUpdateStore(pinia).setRegistration(registration);
    },
    onOfflineReady() {
        console.log("Ready to offline");
    },
});
