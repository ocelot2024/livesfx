<script setup lang="ts">
interface Props {
    title?: string
    footer?: string
}

withDefaults(defineProps<Props>(), {
    title: undefined,
    footer: undefined,
})
</script>

<template>
    <section class="settings-section">
        <small v-if="title" class="settings-section__title">{{ title }}</small>

        <div class="settings-section__group">
            <slot />
        </div>

        <p v-if="footer" class="settings-section__footer">{{ footer }}</p>
    </section>
</template>

<style scoped>
.settings-section {
    margin: 0 0 32px;
}

.settings-section__title {
    display: block;
    margin: 0 8px 8px 16px;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--label-boring);
}

.settings-section__group {
    margin: 0 16px;
    background: var(--gray-6);
    border-radius: 12px;
    overflow: hidden;
}

.settings-section__footer {
    margin: 8px 16px 0;
    font-size: 13px;
    line-height: 1.4;
    color: var(--label-boring);
}
</style>
