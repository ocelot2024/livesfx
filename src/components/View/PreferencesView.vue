<script setup lang="ts">
import { computed, ref } from 'vue';
import Tab, { type TabItem } from '../Tab.vue';
import General from './PrefView/general.vue';
import Sounds from './PrefView/sounds.vue';
import Mixer from './PrefView/mixer.vue';
import SideCar from './PrefView/sidecar.vue';
import { useConfigStore } from '@/core/store/configstore.ts';

const selectedView = ref('general')

const configstore = useConfigStore();

const tabItem = computed<TabItem[]>(() => {
    const items: TabItem[] = [
        { id: "general", label: "一般" },
        { id: "sound", label: "サウンド" },
        { id: "mixer", label: "ミキサー" },
        {
            id: "sidecar",
            label: "SideCar",
        }
    ];


    return items;
});

</script>
<template>
    <div>
        <Tab :tabs="tabItem" v-model="selectedView" />
        <General v-show="selectedView == 'general'" />
        <Sounds v-show="selectedView == 'sound'" />
        <Mixer v-show="selectedView == 'mixer'" />
        <SideCar v-if="selectedView == 'sidecar'" />
    </div>
</template>
