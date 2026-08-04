<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useEngineState } from '@/core/store/enginestore';
import { ProjectEngine } from '@/core';
import { Channel, MIXER_MASTER_CHANNEL_ID } from '@/core/audioEngine/mixer.ts';
import ChannelComponent from '../Channel.vue';

const store = useEngineState();
const engine = ProjectEngine;

const groups = computed(() =>
    [...new Set(
        store.library
            .map(v => v.group)
            .filter((g): g is string => !!g)
    )]
)

const set_gain = (e: number, id?: string) => {
    if (!id) return;
    console.log(id, e)
    const result = engine.set_gain(id ?? MIXER_MASTER_CHANNEL_ID, e);
    console.log(result)
}
const get_gain = (id?: string) => {
    if (id === undefined) return 1
    const result = engine.get_gain(id)
    if (!result.ok) return 1
    return result.value ?? 1
}
</script>

<template>
    <div class="mixer flex">
        <div v-for="groupName in groups">
            <div class="groupName" style="margin-top: 24px;">
                <p>{{ groupName }}</p>
            </div>
            <div class="groupContainer flex" :key="groupName">
                <ChannelComponent v-for="value in engine.get_group_children(groupName)" :channel-name="value.name"
                    :id="value.id ?? ''" @update:volume="(e: number) => set_gain(e, value.id)"
                    :initial_gain="get_gain(value.id)" />
            </div>
        </div>
        <div class="groupName">
            <p>MASTER</p>
        </div>
        <div class="groupContainer">
            <ChannelComponent channel-name="MAIN" :id="MIXER_MASTER_CHANNEL_ID"
                @update:volume="(e: number) => set_gain(e, MIXER_MASTER_CHANNEL_ID)"
                :initial_gain="get_gain(MIXER_MASTER_CHANNEL_ID)" />
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
