<script setup lang="ts">
import { computed } from 'vue';
import { ProjectEngine } from '@/core';
import { MIXER_MASTER_CHANNEL_ID } from '@/core/audioEngine/mixer.ts';
import ChannelComponent from '../Channel.vue';

const engine = ProjectEngine;

// engine.get_group_names() は自動生成分も含めミキサー上の全グループを
// 正として返す(SFXの`group`メタとの二重管理を廃止)。
const groups = computed(() => engine.get_group_names())

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
        <div v-for="groupName in groups">
            <div class="groupName" style="margin-top: 24px;">
                <p>{{ groupName }}</p>
            </div>
            <div class="groupContainer flex" :key="groupName">
                <ChannelComponent channel-name="グループ" :id="groupName" class="groupFader"
                    @update:volume="(e: number) => set_gain(e, groupName)" :initial_gain="get_gain(groupName)" />
                <div class="divider"></div>
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
