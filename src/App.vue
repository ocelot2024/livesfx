<script setup lang="ts">
import type { CSSProperties } from "vue";
import { defineAsyncComponent, ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import AppBar, { type MenuList } from './components/AppBar.vue';
import { ProjectEngine, } from './engine/index.ts';
import { useEngineState } from './engine/store/enginestore.ts';
import NotifCentre from "./components/NotifCentre.vue";
import Spinner from "./components/Spinner.vue";
import { EngineProcState } from "./engine/store/enginestore_type.ts";

const store = useEngineState();

const editor = defineAsyncComponent({
    loader: () => import('./components/SoundEditor.vue')
})

type ModalPhase =
    | "closed"
    | "prepare"
    | "opening"
    | "open"
    | "closing";

const modalPhase = ref<ModalPhase>("closed");
const activeSoundId = ref<string | null>(null);
const originRect = ref<DOMRect | null>(null);

const loadEditor = ref(false);

const viewportWidth = ref(window.innerWidth);
const viewportHeight = ref(window.innerHeight);

const DURATION = 400;

const activeSound = computed(() => store.library.find(s => s.id === activeSoundId.value));

// 展開後のターゲットサイズ（最大 600x800、画面中央配置）を計算
const targetRect = computed(() => {
    const width = Math.min(600, viewportWidth.value - 32);
    const height = Math.min(800, viewportHeight.value - 32);
    const top = (viewportHeight.value - height) / 2;
    const left = (viewportWidth.value - width) / 2;

    return { top, left, width, height, borderRadius: 24 };
});

const modalStyle = computed(() => {
    if (!originRect.value) return {};

    const expanded = targetRect.value;

    const collapsed = {
        top: originRect.value.top,
        left: originRect.value.left,
        width: originRect.value.width,
        height: originRect.value.height,
        borderRadius: 12,
    };

    const target =
        modalPhase.value === "opening" ||
            modalPhase.value === "open"
            ? expanded
            : collapsed;

    return {
        top: `${target.top}px`,
        left: `${target.left}px`,
        width: `${target.width}px`,
        height: `${target.height}px`,
        borderRadius: `${target.borderRadius}px`,
    };
});

const targetSizeStyle = computed(() => {
    return {
        width: `${targetRect.value.width}px`,
        height: `${targetRect.value.height}px`,
    };
});

const open_editor = async (
    id: string,
    evt: MouseEvent
) => {
    if (modalPhase.value !== "closed") return;

    originRect.value = (evt.currentTarget as HTMLElement).getBoundingClientRect();
    activeSoundId.value = id;

    modalPhase.value = "prepare";
    loadEditor.value = true;

    await nextTick();

    // 展開開始
    requestAnimationFrame(() => {
        modalPhase.value = "opening";
    });

    window.setTimeout(() => {
        modalPhase.value = "open";
    }, DURATION);
};

const close_editor = () => {
    // 閉じるアニメーション開始
    modalPhase.value = "closing";

    setTimeout(() => {
        // アニメーション完了後に状態をリセットし、エディターを破棄
        modalPhase.value = "closed";
        activeSoundId.value = null;
        originRect.value = null;
        loadEditor.value = false;
    }, DURATION);
};

const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close_editor();
};

const handleResize = () => {
    viewportWidth.value = window.innerWidth;
    viewportHeight.value = window.innerHeight;
};

onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("resize", handleResize);
});
onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("resize", handleResize);
});

const cardStyle = (
    sound: { id: string }
): CSSProperties => {
    if (
        activeSoundId.value === sound.id &&
        modalPhase.value !== "closed"
    ) {
        return {
            opacity: 0,
            pointerEvents: "none",
        };
    }
    return {};
};

const menu: MenuList[] = [
    {
        label: "ファイル",
        id: "file",
        children: [
            { label: "新規", id: "new", handle: () => { ProjectEngine.start_with_blank() } },
            { label: "名前を付けて保存", id: "save", handle: () => { ProjectEngine.export() } },
            { label: "開く", id: "open", handle: () => { ProjectEngine.start_from_file(); } },
            { label: "サウンドの追加", id: "add", handle: () => { ProjectEngine.add_sound(); } },
            { label: "環境設定", id: "pref", handle: () => { } }
        ]
    },
    {
        label: "編集",
        id: "edit",
        children: [
            { "label": "サウンドの追加", id: "add", handle: () => { ProjectEngine.add_sound(); } }
        ]
    }
]

const message: Record<EngineProcState, string> = {
    "idle": "",
    "loading": "読み込み中",
    "proc": "処理中",
    "too_long": "想定より長く時間がかかっています",
    "writing": "書き込み中"
}

const toggle_ui_mode = () => {
    if (store.ui_mode == "live") {
        const will = confirm('編集モードに入りますか?');
        if (!will) return;
        store.ui_mode = "edit"
    } else {
        store.ui_mode = "live";
    }
}
</script>

<template>
    <AppBar v-bind:items="menu" />
    <div class="grid">
        <button v-for="sound in store.library" :key="sound.id" :style="cardStyle(sound)"
            @click="store.ui_mode == 'live' ? ProjectEngine.play(sound.id) : open_editor(sound.id, $event)"
            :class="{ 'edit-mode': store.ui_mode === 'edit' }">
            <div class="card" :class="{ vibrate: store.ui_mode === 'edit' }">
                <h3>{{ sound.filename }}</h3>
            </div>
        </button>
    </div>
    <footer>
        <div class="flex" style="justify-content: space-between;">
            <button @click="ProjectEngine.stop_all_sfx()">すべて停止</button>
            <button @click="toggle_ui_mode()">{{ store.ui_mode == "live" ? "編集" : "完了" }}</button>
        </div>
    </footer>

    <Teleport to="body">
        <div v-if="modalPhase !== 'closed'" class="expand-backdrop" :class="{ visible: loadEditor }"
            @click="close_editor" />

        <div v-if="modalPhase !== 'closed'" class="expand-container" :style="modalStyle">

            <div class="expand-card" :style="targetSizeStyle"
                :class="{ 'is-opening': modalPhase === 'opening' || modalPhase === 'open' }">
                <header class="expand-header">
                    <h3>{{ activeSound?.filename }}</h3>
                    <button class="close-btn" @click="close_editor">✕</button>
                </header>
                <div class="expand-editor">
                    <editor @saved="close_editor()" v-if="activeSoundId" :sound-id="activeSoundId" />
                </div>
            </div>

            <div class="dummy-card" :class="{ 'is-opening': modalPhase === 'opening' || modalPhase === 'open' }">
                <h3>{{ activeSound?.filename }}</h3>
            </div>

        </div>
    </Teleport>
    <NotifCentre />
    <div class="full" v-if="store.EngineState !== EngineProcState.Idle">
        <div class="spinner_container">
            <Spinner />
            <p>{{ message[store.EngineState] }}</p>
        </div>
    </div>
</template>

<style scoped>
.full {
    position: fixed;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--blur);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);

}

.spinner_container {
    padding: 12px;
    gap: 12px;
    width: 15rem;
    aspect-ratio: 1;
    background-color: var(--gray-5);
    border-radius: 7px;
    justify-content: center;
    align-items: center;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    text-align: center;
}

.grid button {
    background-color: transparent;
    border: none;
    padding: 0;
}

.grid {
    display: grid;
    gap: 32px;
    padding: 32px;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.card {
    cursor: pointer;
    background-color: var(--gray-5);
    border-radius: 12px;
    padding: 12px;
    aspect-ratio: 1/1;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.08), 0 12px 32px rgba(0, 0, 0, 0.06);
}

button:active .card {
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04), inset 0 4px 12px rgba(0, 0, 0, 0.08), inset 0 12px 32px rgba(0, 0, 0, 0.06);
}

footer {
    border-top: 1px solid var(--gray-5);
    position: fixed;
    bottom: 0;
    padding: 12px;
    left: 0;
    right: 0;
}

.edit-mode:nth-child(2n) .vibrate {
    animation: wobble-a 0.25s infinite;
    transform-origin: 50% 10%;
}

.edit-mode:nth-child(2n-1) .vibrate {
    animation: wobble-b 0.25s infinite alternate;
    transform-origin: 30% 5%;
}

.expand-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .3);
    backdrop-filter: blur(20px);
    opacity: 0;
    transition: opacity .25s ease;
    z-index: 100;
}

.expand-backdrop.visible {
    opacity: 1;
}

.expand-container {
    position: fixed;
    z-index: 101;
    overflow: hidden;

    background: var(--gray-5);
    box-shadow: 0 8px 24px rgba(0, 0, 0, .15), 0 32px 80px rgba(0, 0, 0, .2);

    transition:
        top .4s cubic-bezier(.32, .72, 0, 1),
        left .4s cubic-bezier(.32, .72, 0, 1),
        width .4s cubic-bezier(.32, .72, 0, 1),
        height .4s cubic-bezier(.32, .72, 0, 1),
        border-radius .4s cubic-bezier(.32, .72, 0, 1);
    will-change: top, left, width, height, border-radius;
}

.expand-card {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;

    /* 初期状態は透明 */
    opacity: 0;
    pointer-events: none;
    transition: opacity .3s ease;
}

.expand-card.is-opening {
    opacity: 1;
    pointer-events: auto;
}

.dummy-card {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 12px;

    opacity: 1;
    transition: opacity .2s ease;
    pointer-events: none;
}

.dummy-card.is-opening {
    opacity: 0;
}

.expand-header {
    padding: 16px;
    min-height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--gray-4);
    flex-shrink: 0;
}

.expand-editor {
    flex: 1;
    overflow: hidden;
    /* 遅延表示アニメーションを削除し、親のクロスフェードに合わせる */
}

.close-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: none;
    background-color: var(--gray-5);
    color: var(--gray-1, #8e8e93);
    font-size: 14px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
}

.close-btn:active {
    opacity: 0.6;
}
</style>

<style>
@keyframes wobble-a {
    0% {
        transform: rotate(-2deg);
        animation-timing-function: ease-in;
    }

    50% {
        transform: rotate(3deg);
        animation-timing-function: ease-out;
    }
}

@keyframes wobble-b {
    0% {
        transform: rotate(2deg);
        animation-timing-function: ease-in;
    }

    50% {
        transform: rotate(-3deg);
        animation-timing-function: ease-out;
    }
}
</style>
