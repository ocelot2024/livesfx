<script setup lang="ts">
import { ref } from 'vue';
import Tab, { type TabItem } from '../Tab.vue';
import General from './PrefView/general.vue';
import Sounds from './PrefView/sounds.vue';
import Mixer from './PrefView/mixer.vue';


const tabItem: TabItem[] = [
    { id: "general", label: "一般" },
    { id: "sound", label: "サウンド" },
    { id: "mixer", label: "ミキサー" },
]

const selectedView = ref("general")

</script>
<template>
    <div style="min-width: 800px; height: 600px; max-width: 100vw; overflow-y: auto; overflow-x: hidden;">
        <Tab :tabs="tabItem" v-model="selectedView" />
        <General v-show="selectedView == 'general'" />
        <Sounds v-show="selectedView == 'sound'" />
        <Mixer v-show="selectedView == 'mixer'" />
    </div>
</template>
