<script setup lang="ts">
import { defineAsyncComponent, ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { ProjectEngine, } from '../core/index.ts';
import { useEngineState } from '../core/store/enginestore.ts';
import Modal from './Modal.vue';

const selectedSound = ref();

const store = useEngineState();

const editor = defineAsyncComponent({
    loader: () => import('./View/SoundEditor.vue'),
})


const onClick = async (id: string, e: MouseEvent) => {
    const is_live = store.ui_mode == "live";
    if (is_live) {
        await ProjectEngine.play(id)
    } else {
        selectedSound.value = id;
    }
}

</script>

<template>
    <div>
        <div class="grid">
            <button v-for="sound in store.library" :key="sound.id" @click="onClick(sound.id, $event)"
                :class="{ 'edit-mode': store.ui_mode === 'edit' }">
                <div class="card" :class="{ vibrate: store.ui_mode === 'edit' }">
                    <h3>{{ sound.filename }}</h3>
                </div>
            </button>
        </div>

        <Modal v-if="selectedSound" @close="selectedSound = undefined"
            :title="store.library.find(v => v.id == selectedSound)?.filename">
            <editor :sound-id="selectedSound" />
        </Modal>
    </div>
</template>

<style scoped>
.grid button {
    background-color: transparent;
    border: none;
    padding: 0;
}

.grid {
    display: grid;
    gap: 32px;
    padding: 32px;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.card {
    cursor: pointer;
    background-color: var(--gray-5);
    border-radius: 12px;
    padding: 12px;
    aspect-ratio: 1/1;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.08), 0 12px 32px rgba(0, 0, 0, 0.06);
}

button:active .card {
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04), inset 0 4px 12px rgba(0, 0, 0, 0.08), inset 0 12px 32px rgba(0, 0, 0, 0.06);
}


.edit-mode:nth-child(2n) .vibrate {
    animation: wobble-a 0.25s infinite;
    transform-origin: 50% 10%;
}

.edit-mode:nth-child(2n-1) .vibrate {
    animation: wobble-b 0.25s infinite alternate;
    transform-origin: 30% 5%;
}
</style>

<style>
@keyframes wobble-a {
    0% {
        transform: rotate(-2deg);
        animation-timing-function: ease-in;
    }

    50% {
        transform: rotate(3deg);
        animation-timing-function: ease-out;
    }
}

@keyframes wobble-b {
    0% {
        transform: rotate(2deg);
        animation-timing-function: ease-in;
    }

    50% {
        transform: rotate(-3deg);
        animation-timing-function: ease-out;
    }
}
</style>
