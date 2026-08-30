<script setup lang="ts">
import AppBar, { type MenuList } from './components/AppBar.vue';
import { ProjectManager, } from './core/index.ts';
import { useEngineState } from './core/store/enginestore.ts';
import NotifCentre from "./components/View/NotifCentre.vue";
import Spinner from "./components/Spinner.vue";
import { EngineProcState } from "./core/store/enginestore_type.ts";
import PadView from "./components/View/PadView.vue";
import Tab, { type TabItem } from "./components/Tab.vue";
import { defineAsyncComponent, onMounted, ref } from 'vue';
import Modal from './components/Modal.vue';
import UpdateModal from './components/View/UpdateModal.vue';
import { useConfigStore } from './core/store/configstore.ts';
import { useUiState } from './core/store/ui_state.ts';
import { storeToRefs } from 'pinia';


const MixerView = defineAsyncComponent({
    loader: () => import('./components/View/MixerView.vue'),
    loadingComponent: Spinner
})
const BGMView = defineAsyncComponent({
    loader: () => import('./components/View/BGMView.vue'),
    loadingComponent: Spinner
})
const prefView = defineAsyncComponent({
    loader: () => import('./components/View/PreferencesView.vue'),
    loadingComponent: Spinner
})

const consentView = defineAsyncComponent({
    loader: () => import('./components/View/consent.vue'),
    loadingComponent: Spinner
})

const Footer = defineAsyncComponent({
    loader: () => import('./components/Footer.vue')
})
const engine_store = useEngineState();
const ui_store = useUiState();
const config_store = useConfigStore();
const menu: MenuList[] = [
    {
        label: "ファイル",
        id: "file",
        children: [
            {
                label: "新規", id: "new", handle: () => {
                    ProjectManager.start_with_blank();
                }
            },
            { label: "名前を付けて保存", id: "save", handle: () => { ProjectManager.export(); } },
            { label: "開く", id: "open", handle: () => { ProjectManager.start_from_file(); } },
            {
                label: "環境設定", id: "pref", handle: () => {
                    showPrefView.value = true;
                }
            }
        ]
    },
    {
        label: "編集",
        id: "edit",
        children: [
            { "label": "サウンドの追加", id: "add", handle: () => { ProjectManager.add_sfx(); } },
            { "label": "BGMの追加", id: "add_bgm", handle: () => { ProjectManager.add_bgm(); } }
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


const tabitems: TabItem[] = [{
    id: "pad",
    label: "Pad"
}, {
    id: "bgm",
    label: "BGM"
}, {
    id: "mixer",
    label: "ミキサー"
}]

const { tab } = storeToRefs(ui_store)
const selectedView = config_store.memoryLastTab
    ? tab
    : ref("pad")

const showPrefView = ref<boolean>(false);
const showConsentView = ref<boolean>(false);

onMounted(() => {
    if (config_store.is_first) {
        config_store.is_first = false;
        showConsentView.value = true
    }
})
</script>

<template>
    <main>
        <AppBar v-bind:items="menu" />
        <Tab :tabs="tabitems" v-model="selectedView" />
        <PadView v-show="selectedView === 'pad'" />
        <BGMView v-show="selectedView === 'bgm'" />
        <!--ミキサーは少し重い操作がある可能性があるうえそんなに頻繁に使わないからv-ifで十分-->
        <MixerView v-if="selectedView === 'mixer'" />
        <footer>
            <Footer />
        </footer>

        <NotifCentre />
        <div class="full" v-if="engine_store.EngineState !== EngineProcState.Idle">
            <div class="spinner_container">
                <Spinner />
                <p>{{ message[engine_store.EngineState] }}</p>
            </div>
        </div>
        <Modal :show="showPrefView" @close="showPrefView = false">
            <prefView />
        </Modal>
        <Modal :show="showConsentView" @close="showConsentView = false">
            <consentView />
        </Modal>
        <UpdateModal />
    </main>
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
    background-color: var(--gray-6);
}
</style>
