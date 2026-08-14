<script setup lang="ts">
import { ref } from 'vue';
import Tab, { type TabItem } from '../Tab.vue';
import General from './PrefView/general.vue';
import Sounds from './PrefView/sounds.vue';

const tabItem: TabItem[] = [
    { id: "general", label: "一般" },
    { id: "sound", label: "サウンド" },
    { id: "mixer", label: "ミキサー" },
    { id: "look_and_feel", label: "外観" },
    { id: "project", label: "ファイル設定" },
    { id: "dev", label: "開発" },

]

const selectedView = ref("general")

</script>
<template>
    <div style="min-width: 800px;
    min-height: 600px; max-width: 100vw;">
        <Tab :tabs="tabItem" v-model="selectedView" />
        <General v-show="selectedView == 'general'" />
        <Sounds v-show="selectedView == 'sound'" />
    </div>
</template>
