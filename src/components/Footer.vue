<script setup lang="ts">
import { ProjectEngine } from '@/core';
import { useConfigStore } from '@/core/store/configstore';
import { useEngineState } from '@/core/store/enginestore';
import Toggle from './toggle.vue';

const configstore = useConfigStore();
const engine_store = useEngineState()

const toggle_ui_mode = () => {
    if (engine_store.ui_mode == "live") {
        const will = configstore.enterEditModeConfirm ? confirm('編集モードに入りますか?') : true;
        if (!will) return;
        engine_store.ui_mode = "edit"
    } else {
        engine_store.ui_mode = "live";
    }
}

const requestDucking = () => {
    ProjectEngine.ducking();
}
</script>
<template>
    <div class="flex" style="justify-content: space-between;">
        <button @click="ProjectEngine.stop_all_sfx()">すべての効果音を停止</button>
        <div class="flex"
            style="align-items: center; border: 1px solid var(--gray-4); padding: 2px 7px; border-radius: 12px;">
            <label style="margin-inline-end: 1rem;">ダッキング</label>
            <Toggle v-model="engine_store.ducking" />
        </div>
        <button @click="toggle_ui_mode()">{{ engine_store.ui_mode == "live" ? "編集" : "完了" }}</button>
    </div>
</template>
