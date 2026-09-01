<script setup lang="ts">
import { computed } from 'vue';
import { ProjectManager } from '@/core';
import { MIXER_MASTER_CHANNEL_ID } from '@/core/audioEngine/mixer.ts';
import ChannelComponent from '../Channel.vue';

const engine = ProjectManager;

const groups = computed(() => {
    return engine.get_group_names()
})

const set_gain = (e: number, id?: string) => {
    if (!id) return;
    engine.set_gain(id ?? MIXER_MASTER_CHANNEL_ID, e);
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
        <div v-for="groupName in groups.filter(v => v !== 'BGM')" :key="groupName">
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
            <p>グループボリューム</p>
        </div>
        <div class="groupContainer flex">
            <ChannelComponent channel-name="MAIN" :id="MIXER_MASTER_CHANNEL_ID"
                @update:volume="(e: number) => set_gain(e, MIXER_MASTER_CHANNEL_ID)"
                :initial_gain="get_gain(MIXER_MASTER_CHANNEL_ID)" />
            <div class="divider"></div>
            <ChannelComponent v-for="groupName in groups" :channel-name="`${groupName}`" :id="groupName"
                class="groupFader" @update:volume="(e: number) => set_gain(e, groupName)"
                :initial_gain="get_gain(groupName)" />
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
    position: relative;
    flex: 1;
    overflow-x: auto;
}

.groupName {
    text-align: center;
}

.groupFader {
    opacity: 0.85;
}

.divider {
    width: 1px;
    align-self: stretch;
    background-color: var(--gray-3);
    margin: 12px 0;
}
</style>
