<script setup lang="ts">
import type { CSSProperties } from "vue";
import { defineAsyncComponent, ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import AppBar, { type MenuList } from './components/AppBar.vue';
import { ProjectEngine, } from './core/index.ts';
import { useEngineState } from './core/store/enginestore.ts';
import NotifCentre from "./components/NotifCentre.vue";
import Spinner from "./components/Spinner.vue";
import { EngineProcState } from "./core/store/enginestore_type.ts";
import PadView from "./components/PadView.vue";

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

const activeSound = computed(() => store.library.find((s: { id: string | null; }) => s.id === activeSoundId.value));

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
            { label: "サウンドの追加", id: "add", handle: () => { ProjectEngine.add_sfx(); } },
            { label: "環境設定", id: "pref", handle: () => { } }
        ]
    },
    {
        label: "編集",
        id: "edit",
        children: [
            { "label": "サウンドの追加", id: "add", handle: () => { ProjectEngine.add_sfx(); } }
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
    <PadView />
    <footer>
        <div class="flex" style="justify-content: space-between;">
            <button @click="ProjectEngine.stop_all_sfx()">すべて停止</button>
            <button @click="toggle_ui_mode()">{{ store.ui_mode == "live" ? "編集" : "完了" }}</button>
        </div>
    </footer>

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


footer {
    border-top: 1px solid var(--gray-5);
    position: fixed;
    bottom: 0;
    padding: 12px;
    left: 0;
    right: 0;
}
</style>
