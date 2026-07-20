import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style/main.css";
import { ProjectEngine } from "./engine/index.ts";

window.addEventListener("load", async () => {
    await ProjectEngine.init();
    const app = createApp(App);
    app.use(createPinia());
    app.mount("#app");
});
