<script setup lang="ts">
import AppBar, { type MenuList } from './components/AppBar.vue';
import { EngineEvent, ProjectManager } from './engine/index.ts';
import { useEngineState } from './engine/store/enginestore.ts';

const menu: MenuList[] = [
    {
        label: "ファイル",
        id: "file",
        children: [
            {
                label: "新規",
                id: "new",
                handle: () => {
                    new ProjectManager().add_sound()
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
</template>

<style scoped></style>
