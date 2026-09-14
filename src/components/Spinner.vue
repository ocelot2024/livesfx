<script setup lang="ts">
defineProps<{
    size?: number;
}>();
</script>

<template>
    <div class="container" :style="{
        '--size': `${size ?? 64}px`,
    }">
        <div v-for="i in 8" :key="i" class="bar" :style="{
            transform: `rotate(${i * 45}deg)`,
            animationDelay: `${i * 0.15}s`,
        }" />
    </div>
</template>
<style scoped>
@keyframes blink {
    0% {
        opacity: .2;
    }

    15% {
        opacity: 1;
    }

    100% {
        opacity: .2;
    }
}

.container {
    width: var(--size);
    height: var(--size);
    position: relative;
}

.bar {
    position: absolute;
    width: calc(var(--size) * 0.094);
    height: calc(var(--size) * 0.297);
    left: calc(var(--size) * 0.438);
    border-radius: 999px;
    transform-origin: 50% calc(var(--size) * 0.5);
    background: var(--label-normal);
    opacity: .2;
    animation: blink 1.2s infinite;
}
</style>
