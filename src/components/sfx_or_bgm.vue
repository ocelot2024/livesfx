<script setup lang="ts">
import { Disc3, LayersPlus } from '@lucide/vue';

</script>
<template>
    <div style="text-align: center;">
        <h2>どちらとして追加しますか？</h2>
        <div class="flex" style="gap: 12px; padding: 12px;">
            <button class="flex" style="flex: 1; align-items: center; flex-direction: column;">
                <LayersPlus />
                <h2>効果音</h2>
            </button>
            <button class="flex" style="flex: 1; align-items: center; flex-direction: column;">
                <Disc3 />
                <h2>BGM</h2>
            </button>
        </div>
    </div>
</template>
