<script setup lang="ts">
import { computed, onMounted } from 'vue';
import Channel from '../Channel.vue';
import { useEngineState } from '@/core/store/enginestore';
import { ProjectEngine } from '@/core';

const store = useEngineState();
const engine = ProjectEngine;

const init = () => {
    console.log(store.library)
}
const groups = computed(() =>
    [...new Set(
        store.library
            .map(v => v.group)
            .filter((g): g is string => !!g)
    )]
)
onMounted(() => init())
</script>

<template>
    <div class="mixer flex">
        <div v-for="groupName in groups">
            <div class="groupName" style="margin-top: 24px;">
                <p>{{ groupName }}</p>
            </div>
            <div class="groupContainer flex" :key="groupName">
                <Channel v-for="value in engine.get_group_children(groupName)" :channel-name="value.name"
                    :id="value.id ?? 'MASTER'" />
            </div>
        </div>
        <div class="groupName">
            <p>MASTER</p>
        </div>
        <div class="groupContainer">
            <Channel channel-name="MAIN" id="MAIN" />
        </div>
    </div>
</template>

<style scoped>
.mixer {
    padding: 12px;
    gap: 24px;
    justify-content: center;
    flex-direction: column;
}

.groupContainer {
    background-color: var(--gray-5);
    border-radius: 12px;
    border: var(--gray-3) 1px solid;
    position: relative;
    flex: 1;
    overflow-x: auto;
}

.groupName {
    text-align: center;
}
</style>
