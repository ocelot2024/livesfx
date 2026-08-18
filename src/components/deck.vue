<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue';
import DeckPlayer from './deckPlayer.vue';
import Settinglist from './settinglist.vue';
import SettingsRow from './settingsRow.vue';
import SettingsSection from './settingsSection.vue';


const calcColour = (v: number) => {
    const t = v / 100

    const indigo = { r: 109, g: 124, b: 255 }
    const yellow = { r: 255, g: 214, b: 0 }

    const r = Math.round(indigo.r + (yellow.r - indigo.r) * t)
    const g = Math.round(indigo.g + (yellow.g - indigo.g) * t)
    const b = Math.round(indigo.b + (yellow.b - indigo.b) * t)

    return `rgb(${r}, ${g}, ${b})`
}
const update = () => {
    thumbColour.value = calcColour(crossfade.value?.value as unknown as number ?? 50)
}
const crossfade = useTemplateRef("crossfader")
const thumbColour = ref(calcColour(50))
</script>
<template>
    <div style="padding: 12px;">
        <div class="container">
            <div class="grid">
                <DeckPlayer colour="indigo" />
                <DeckPlayer colour="yellow" />
            </div>
            <br>
            <input ref="crossfader" type="range" style="width: 100%;" :style="{ '--thumb-colour': thumbColour }"
                @input="update()">
        </div>
        <div style="background-color: var(--gray-5);
        padding: 12px 0; margin: 12px; border-radius: 12px;">
            <Settinglist>
                <SettingsSection title="曲一覧">
                    <SettingsRow label="蛍の光">
                        <div class="flex"><button>Aに</button><button>Bに</button></div>
                    </SettingsRow>
                </SettingsSection>
            </Settinglist>
        </div>
    </div>
</template>
<style scoped>
.container {
    padding: 12px;
}

.grid {
    display: grid;
    gap: 12px;
    grid-template-columns: 1fr 1fr;
}

.flex {
    gap: 12px;
}

.flex>button {
    flex: 1;
    width: 4rem;
}

input[type="range"] {
    appearance: none;
    background-color: var(--gray-5);
    border-radius: 12px;
}

input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    background-color: var(--thumb-colour);
    width: 15px;
    height: 15px;
    border-radius: 50%;
}

input[type="range"]::-moz-range-thumb {
    background-color: var(--thumb-colour);
    width: 15px;
    height: 15px;
    border-radius: 50%;
    border: none;
}
</style>
