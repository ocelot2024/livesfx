<script setup lang="ts">
interface Props {
    modelValue: boolean
    disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean], clicked: [] }>()

function toggle() {
    if (props.disabled) return
    emit('clicked')
    emit('update:modelValue', !props.modelValue)
}
</script>

<template>
    <button type="button" class="toggle-switch" :class="{
        'toggle-switch--on': modelValue,
        'toggle-switch--disabled': disabled,
    }" role="switch" :aria-checked="modelValue" :disabled="disabled" @click="toggle">
        <span class="toggle-switch__thumb" />
    </button>
</template>

<style scoped>
.toggle-switch {
    --w: 51px;
    --h: 31px;
    --thumb: 27px;

    width: var(--w);
    height: var(--h);
    padding: 0;
    border: none;
    border-radius: calc(var(--h) / 2);
    background: var(--gray-3);
    position: relative;
    flex-shrink: 0;
    cursor: pointer;
    transition: background 0.15s ease;
}

.toggle-switch--on {
    background: var(--accent-bg);
}

.toggle-switch--disabled {
    opacity: 0.4;
    cursor: default;
}

.toggle-switch__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: var(--thumb);
    height: var(--thumb);
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    transition: transform 0.15s ease;
}

.toggle-switch--on .toggle-switch__thumb {
    transform: translateX(calc(var(--w) - var(--thumb) - 4px));
}
</style>
