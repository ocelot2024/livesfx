import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import { VitePWA } from "vite-plugin-pwa";
// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vueDevTools(),
        VitePWA({
            devOptions: { enabled: true },
            manifest: {
                name: "LiveSFX",
                short_name: "LIVE",
                icons: [
                    {
                        sizes: "192x192",
                        src: "pwa-192x192.png",
                        type: "image/png",
                    },
                    {
                        sizes: "512x512",
                        src: "pwa-512x512.png",
                        type: "image/png",
                    },
                    {
                        sizes: "512x512",
                        src: "maskable-icon-512x512.png",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
        }),
    ],
    server: {
        host: true,
    },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
});
