<script setup lang="ts">
import AppBar, { type MenuList } from './components/AppBar.vue';
import { ProjectEngine, } from './core/index.ts';
import { useEngineState } from './core/store/enginestore.ts';
import NotifCentre from "./components/View/NotifCentre.vue";
import Spinner from "./components/Spinner.vue";
import { EngineProcState } from "./core/store/enginestore_type.ts";
import PadView from "./components/View/PadView.vue";
import Tab, { type TabItem } from "./components/Tab.vue";
import MixerView from "./components/View/MixerView.vue";
import { ref } from 'vue';

const store = useEngineState();

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
const tabitems: TabItem[] = [{
    id: "pad",
    label: "Pad"
}, {
    id: "mixer",
    label: "ミキサー"
}]

const selectedView = ref("pad");
</script>

<template>
    <AppBar v-bind:items="menu" />
    <Tab :tabs="tabitems" v-model="selectedView" />
    <PadView v-show="selectedView === 'pad'" />
    <!--ミキサーは少し重い操作がある可能性があるうえそんなに頻繁に使わないからv-ifで十分-->
    <MixerView v-if="selectedView === 'mixer'" />
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
