import { fileURLToPath, URL } from "node:url";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import { VitePWA } from "vite-plugin-pwa";

interface ChangelogEntry {
    version: string;
    date: string;
    notes: string[];
}

const pkg = JSON.parse(
    readFileSync(
        fileURLToPath(new URL("./package.json", import.meta.url)),
        "utf-8",
    ),
) as { version: string };

function versionInfoPlugin(): Plugin {
    return {
        name: "livesfx-version-info",
        buildStart() {
            const changelogPath = fileURLToPath(
                new URL("./src/core/changelog.json", import.meta.url),
            );
            const changelog = JSON.parse(
                readFileSync(changelogPath, "utf-8"),
            ) as ChangelogEntry[];
            const latest = changelog[0];

            if (!latest) {
                this.error("src/core/changelog.json にエントリがありません。");
                return;
            }
            if (latest.version !== pkg.version) {
                this.error(
                    `changelog.json の先頭バージョン(${latest.version})が ` +
                        `package.json の version(${pkg.version})と一致していません。` +
                        `リリース時は package.json の version と changelog.json の先頭エントリを両方更新してください。`,
                );
                return;
            }

            const publicDir = fileURLToPath(
                new URL("./public", import.meta.url),
            );
            mkdirSync(publicDir, { recursive: true });
            writeFileSync(
                fileURLToPath(
                    new URL("./public/version.json", import.meta.url),
                ),
                JSON.stringify(
                    {
                        version: latest.version,
                        date: latest.date,
                        notes: latest.notes,
                    },
                    null,
                    2,
                ),
            );
        },
    };
}

// https://vite.dev/config/
export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
        vue(),
        vueDevTools(),
        versionInfoPlugin(),
        VitePWA({
            devOptions: { enabled: false },
            registerType: "prompt",
            manifest: {
                name: "LiveSFX",
                short_name: "LIVE",
                theme_color: "#1c1c1e",
                background_color: "#1c1c1e",
                start_url: "/",
                display: "standalone",
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
