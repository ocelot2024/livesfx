<script setup lang="ts">
interface Props {
    label: string
    value?: string
    chevron?: boolean
    danger?: boolean
    unimplemented?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    value: undefined,
    chevron: false,
    danger: false,
    unimplemented: false,
})

const emit = defineEmits<{ click: [] }>()

function handleClick() {
    if (props.unimplemented || !props.chevron) return
    emit('click')
}
</script>

<template>
    <div class="settings-row" :class="{
        'settings-row--navigable': chevron && !unimplemented,
        'settings-row--disabled': unimplemented,
    }" :role="chevron ? 'button' : undefined" :tabindex="chevron && !unimplemented ? 0 : undefined"
        @click="handleClick">
        <span class="settings-row__label" :class="{ 'settings-row__label--danger': danger }">{{ label }}</span>
        <span v-if="unimplemented" class="settings-row__badge">未実装</span>
        <span v-if="value" class="settings-row__value">{{ value }}</span>
        <slot />

        <svg v-if="chevron && !unimplemented" class="settings-row__chevron" viewBox="0 0 8 14" width="8" height="14">
            <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
                stroke-linejoin="round" />
        </svg>
    </div>
</template>

<style scoped>
.settings-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
    position: relative;
    color: var(--label-normal);
    font-size: 15px;
}

.settings-row:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 16px;
    right: 0;
    bottom: 0;
    height: 1px;
    background: var(--gray-4);
}

.settings-row--navigable {
    cursor: pointer;
}

.settings-row--navigable:active {
    background: var(--gray-5);
}

.settings-row__label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.settings-row__label--danger {
    color: var(--label-danger);
}

.settings-row__value {
    color: var(--label-boring);
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.settings-row__badge {
    flex-shrink: 0;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 5px;
    background: var(--gray-4);
    color: var(--label-boring);
}

.settings-row__chevron {
    flex-shrink: 0;
    color: var(--gray-2);
}

.settings-row--disabled .settings-row__label {
    color: var(--label-boring);
}
</style>
