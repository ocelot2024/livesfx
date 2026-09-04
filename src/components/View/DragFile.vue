<script setup lang="ts">
import { FilePlusCorner } from '@lucide/vue';
import { onMounted, onUnmounted, ref } from 'vue';
import Sfx_or_bgm from '../sfx_or_bgm.vue';
import Modal from '../Modal.vue';

const dragging = ref(false);
const sfx_or_bgm = ref(false);

let files: File[] = []
onMounted(() => {
    window.addEventListener("dragover", showFileDropArea)
    window.addEventListener('dragleave', hideFileDropArea)
    window.addEventListener("drop", ondrop)

})
onUnmounted(() => {
    window.removeEventListener("dragover", showFileDropArea)
    window.removeEventListener("dragleave", hideFileDropArea)
    window.removeEventListener("drop", ondrop)
})
const showFileDropArea = (e: DragEvent) => {
    e.preventDefault();
    dragging.value = true
}
const hideFileDropArea = (e: DragEvent) => {
    e.preventDefault();
    dragging.value = false
}
const ondrop = (e: DragEvent) => {
    e.preventDefault();
    dragging.value = false
    if (!e.dataTransfer) return
    if ([...e.dataTransfer.items].some((item) => item.kind === "file")) {
        files = [...e.dataTransfer.items].map(v => v.getAsFile()).filter(file => !!file)
        if (files.length > 1) {
            sfx_or_bgm.value = true;
        }
    }
}
</script>
<template>
    <div>
        <div class="drag-overlay" ref="drag-area" :class="{ dragging }">
            <FilePlusCorner v-show="dragging" />
            <p v-show="dragging">
                ここにファイルをドロップして開く・音源を追加できます
            </p>

        </div>
        <Modal :show="sfx_or_bgm" @close="sfx_or_bgm = false">
            <Sfx_or_bgm />
        </Modal>
    </div>
</template>
<style scoped>
.drag-overlay {
    pointer-events: none;
    position: fixed;
    inset: 0;
    z-index: 999;
    transition: all .1s ease-in-out;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
}

.dragging {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: inset 0px 0px 100vw 25vw rgba(0, 145, 255, 0.13);
}
</style>
