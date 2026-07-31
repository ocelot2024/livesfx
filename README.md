# LiveSFX

ブラウザで動く効果音・BGM再生アプリ

## 開発サーバー

```bash
pnpm dev
```

## ビルドとプレビュー

```bash
pnpm build
```

```bash
pnpm preview
```

## 設計

```
ProjectManager
├─ FileManager(openFilePicker)
├─ LVSFFile
└─ AudioEngine
    ├─ Mixer
    └─ SoundLibrary
        └─ Sounds[]
EnginnStore
├─ ui_mode
├─ library
├─ notif_queue
└─ EngineState
```
