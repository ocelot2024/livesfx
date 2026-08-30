<script setup lang="ts">
import { ProjectManager } from '@/core';
import { useEngineState, type BGMPlayerInfo } from '@/core/store/enginestore';
import { Eject, Pause, Play, X } from '@lucide/vue';
import { storeToRefs } from 'pinia';
import { computed, ref, useTemplateRef } from 'vue';

const props = defineProps<{ colour: string, deckId: "deckA" | "deckB", deck_info: BGMPlayerInfo }>()

const seek = useTemplateRef('seekbar');

const store = useEngineState();
const { deck } = storeToRefs(store);

// While the user is actively dragging we show the drag position instead of
// the (slightly lagging) real playback position, then commit the seek on release.
const dragProgress = ref<number | null>(null);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const progressFromEvent = (e: PointerEvent): number | null => {
    const seekbar = seek.value;
    if (!seekbar) return null;
    const rect = seekbar.getBoundingClientRect();
    return clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
}

const displayProgress = computed(() => {
    if (dragProgress.value !== null) return dragProgress.value;
    if (!props.deck_info.duration) return 0;
    return clamp((props.deck_info.current_time / props.deck_info.duration) * 100, 0, 100);
});

const format_time = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const handleDrag = (e: PointerEvent) => {
    const progress = progressFromEvent(e);
    if (progress === null) return
    dragProgress.value = progress;
}

const handleDragEnd = (_e: PointerEvent) => {
    document.removeEventListener('pointermove', handleDrag);
    document.removeEventListener('pointerup', handleDragEnd)

    if (dragProgress.value !== null && props.deck_info.duration) {
        const time = (dragProgress.value / 100) * props.deck_info.duration;
        ProjectManager.seek_bgm(props.deckId, time);
    }
    dragProgress.value = null;
}

const handleDragStart = (e: PointerEvent) => {
    const progress = progressFromEvent(e);
    if (progress === null) return
    dragProgress.value = progress;

    document.addEventListener('pointermove', handleDrag);
    document.addEventListener('pointerup', handleDragEnd)
}

const toggle_play = () => {
    if (props.deck_info.playing) {
        ProjectManager.pause_bgm(props.deckId);
    } else {
        ProjectManager.play_bgm(props.deckId);
    }
}

const eject = () => {
    ProjectManager.eject_bgm(props.deckId);
}

// A single source of truth for "which slot in the deck array is this instance".
const deckIndex = computed(() => (props.deckId === "deckA" ? 0 : 1));
// computed, NOT ref: this must re-evaluate whenever the store replaces
// deck.value[index] with a fresh object (on load/unload/play/pause/seek/...).
// ref(deck.value[deckIndex]) would only ever capture the object that existed
// at mount time and never see later replacements.
const deckData = computed(() => deck.value[deckIndex.value]);
</script>
<template>
    <div class="playercard" :style="{ borderBottom: `3px solid var(--${props.colour})` }">
        <div class="flex">
            <div class="ctrl">
                <div class="flex" style="justify-content: space-between;">
                    <h2 style="white-space: pre-wrap;">{{ deckData.meta?.filename ?? ' ' }}
                    </h2>
                    <button style="background-color: transparent; border: 0;" @click="eject()" v-if="deckData.meta">
                        <Eject fill="var(--label-normal)" :size="16" />
                    </button>
                </div>
                <div class="flex player" v-if="deckData.meta">
                    <button @click="toggle_play()" class="play-button">
                        <Play v-if="!props.deck_info.playing" fill="var(--label-normal)" :size="16" />
                        <Pause v-else fill="var(--label-normal)" :size="16" />
                    </button>
                    <progress @pointerdown="handleDragStart" :value="displayProgress" max="100"
                        ref="seekbar"></progress>
                    <small>{{ format_time(props.deck_info.current_time) }} / {{ format_time(props.deck_info.duration)
                    }}</small>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.playercard {
    padding: 12px;
    background-color: var(--gray-5);
    border-radius: 12px;
}

progress {
    cursor: pointer;
    width: 100%;
}

.player {
    align-items: center;
    gap: 6px;
}

.ctrl {
    flex: 1;
}

.channel {
    flex: 0;
}

.play-button {
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
