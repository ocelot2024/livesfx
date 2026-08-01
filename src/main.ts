import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style/main.css";
import { ProjectEngine } from "./core/index.ts";
import { registerSW } from "virtual:pwa-register";

window.addEventListener("load", async () => {
    await ProjectEngine.init();
    const app = createApp(App);
    app.use(createPinia());
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
