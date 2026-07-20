<script setup lang="ts">
import AppBar, { type MenuList } from './components/AppBar.vue';
import { EngineEvent, ProjectEngine, } from './engine/index.ts';
import { useEngineState } from './engine/store/enginestore.ts';

const store = useEngineState();

const menu: MenuList[] = [
    {
        label: "ファイル",
        id: "file",
        children: [
            {
                label: "新規",
                id: "new",
                handle: () => {
                    ProjectEngine.start_with_blank()
                }
            }, {
                label: "名前を付けて保存",
                id: "save",
                handle: () => { ProjectEngine.export() }
            },
            {
                label: "開く",
                id: "open",
                handle: () => {
                    ProjectEngine.start_from_file();
                }
            },
            {
                label: "サウンドの追加",
                id: "add",
                handle: () => {
                    ProjectEngine.add_sound();
                }
            }, {
                label: "環境設定",
                id: "pref",
                handle: () => { }
            }
        ]
    },
    {
        label: "編集",
        id: "edit",
        children: [
            {
                "label": "サウンドの追加",
                id: "add",
                handle: () => {
                    ProjectEngine.add_sound();
                }
            }
        ]
    }
]

</script>

<template>
    <AppBar v-bind:items="menu" />
    <div class="grid">
        <button v-for="sound in store.library" @click="ProjectEngine.play(sound.id)">
            <div class="card">
                <h3>{{ sound.filename }}</h3>
            </div>
        </button>
    </div>
    <footer>
        <button @click="ProjectEngine.stop_all_sfx()">すべて停止</button>
    </footer>
</template>

<style scoped>
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
    box-shadow:
        0 1px 2px rgba(0, 0, 0, 0.04),
        0 4px 12px rgba(0, 0, 0, 0.08),
        0 12px 32px rgba(0, 0, 0, 0.06);
}

button:active {
    .card {
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04),
            inset 0 4px 12px rgba(0, 0, 0, 0.08),
            inset 0 12px 32px rgba(0, 0, 0, 0.06);
    }
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
