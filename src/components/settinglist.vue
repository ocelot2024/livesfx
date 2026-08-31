<script setup lang="ts">
interface Props {
    title?: string
}

withDefaults(defineProps<Props>(), {
    title: undefined,
})
</script>

<template>
    <div class="settings-list">
        <h1 v-if="title" class="settings-list__title">{{ title }}</h1>
        <slot />
    </div>
</template>

<style scoped>
.settings-list {
    overflow-y: auto;
    padding: 8px 0 32px;
    color: var(--label-normal);
    -webkit-overflow-scrolling: touch;
}

.settings-list__title {
    margin: 8px 0 20px 16px;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.01em;
}
</style>
