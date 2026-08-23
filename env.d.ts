/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// vite.config.ts の define で注入されるビルド時定数
// package.json の version をアプリ内(バージョン表記・アップデート通知)で使うための唯一の情報源
declare const __APP_VERSION__: string;
