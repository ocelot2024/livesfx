import { createApp } from "vue";
import { createPinia, type Pinia } from "pinia";
import App from "./App.vue";
import "./style/main.css";
import { ProjectEngine } from "./core/index.ts";
import { registerSW } from "virtual:pwa-register";
import { createPersistPlugin } from "./core/store/persist.ts";
import { useUpdateStore } from "./core/store/updatestore.ts";

let pinia: Pinia | null = null;
let pendingRegistration: ServiceWorkerRegistration | undefined;

const app = createApp(App);
pinia = createPinia();
pinia.use(createPersistPlugin(["config", "ui_state"]));
useUpdateStore(pinia).setRegistration(pendingRegistration);
await ProjectEngine.init();
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
