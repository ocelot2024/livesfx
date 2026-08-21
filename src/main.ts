import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style/main.css";
import { ProjectEngine } from "./core/index.ts";
import { registerSW } from "virtual:pwa-register";
import { createPersistPlugin } from "./core/store/persist.ts";

window.addEventListener("load", async () => {
    await ProjectEngine.init();
    const app = createApp(App);
    const pinia = createPinia();
    pinia.use(createPersistPlugin(["config", "ui_state"]));
    app.use(pinia);
    app.mount("#app");
});

const updateSW = registerSW({
    onNeedRefresh() {
        //あとでアプリ内通知に変更
        const will = confirm("更新があります。再起動して更新しますか？");
        if (will) updateSW(true);
        return;
    },
    onOfflineReady() {
        console.log("Ready to Offline");
    },
});
