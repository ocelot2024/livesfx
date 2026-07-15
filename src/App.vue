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
                label: "環境設定",
                id: "pref",
                handle: () => { }
            }
        ]
    }
]

</script>

<template>
    <AppBar v-bind:items="menu" />
    <button @click="ProjectEngine.add_sound">追加</button>
    <button v-for="value in store.library" @click="ProjectEngine.play(value.id)">
        {{ value.filename }}
    </button>
</template>

<style scoped></style>
