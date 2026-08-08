<script setup lang="ts">
defineEmits(['close'])
const props = defineProps<{ title?: string }>()
</script>
<template>
    <div class="full">
        <div class="dialog">
            <header>
                <div>
                    <h3>{{ props.title }}</h3>
                </div><button @click="$emit('close')">X</button>
            </header>
            <slot />
        </div>
    </div>
</template>
<style scoped>
.full {
    position: fixed;
    inset: 0;
    z-index: 999;
    background-color: rgba(136, 136, 136, 0.452);
    display: flex;
    justify-content: center;
    align-items: center;
}

header {
    display: flex;

    div {
        padding-left: 20px;
        flex: 1;
        text-align: left;
    }

    button {
        flex: 0
    }
}

.dialog {
    header {
        text-align: right;

        button {
            background-color: transparent;
            box-shadow: none;
            border: none;
        }
    }

    padding: 7px;
    border-radius: 12px;
    background-color: var(--gray-5);
    min-width: 100px;
    min-height: 100px;
}
</style>
