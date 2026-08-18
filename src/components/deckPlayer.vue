<script setup lang="ts">
import { useTemplateRef } from 'vue';

const props = defineProps<{ colour: string }>()

const seek = useTemplateRef('seekbar');

const handleDrag = (e: PointerEvent) => {
    const seekbar = seek.value;
    if (!seekbar) return
    const rect = seekbar.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width * 100;
    seekbar.value = progress;
}

const handleDragEnd = (_e: PointerEvent) => {
    document.removeEventListener('pointermove', handleDrag);
    document.removeEventListener('pointerup', handleDragEnd)
}

const handleDrafStart = (e: PointerEvent) => {
    const seekbar = seek.value;
    if (!seekbar) return
    const rect = seekbar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const progress = (offsetX / rect.width) * 100;
    seekbar.value = progress;

    document.addEventListener('pointermove', handleDrag);
    document.addEventListener('pointerup', handleDragEnd)
}
</script>
<template>
    <div class="playercard" :style="{ borderBottom: `3px solid var(--${props.colour})` }">
        <div class="flex">
            <div class="ctrl">
                <div class="flex" style="justify-content: space-between;">
                    <h2>BGM</h2>
                    <button style="background-color: transparent; border: 0;">X</button>
                </div>
                <div class="flex player">
                    <button>▶</button>
                    <progress @pointerdown="handleDrafStart" value="0" max="100" ref="seekbar"></progress>
                    <small>MM:SS</small>
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
</style>
