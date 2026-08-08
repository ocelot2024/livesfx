<script setup lang="ts">
import { Transition } from 'vue';

defineEmits(['close'])

const props = defineProps<{ title?: string, show: boolean }>()
</script>
<template>
    <Transition>
        <div class="full" v-if="props.show">
            <div class="dialog">
                <header>
                    <div>
                        <h3>{{ props.title }}</h3>
                    </div><button @click="$emit('close')">X</button>
                </header>
                <slot />
            </div>
        </div>
    </Transition>
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


.v-enter-active,
.v-leave-active {
    transition: background-color .2s ease-out;
}

.v-enter-from,
.v-leave-to {
    background-color: rgba(136, 136, 136, 0);
}

.v-enter-active .dialog,
.v-leave-active .dialog {
    transition: transform .2s ease-out;
}

.v-enter-from .dialog {
    transform: scale(0.8);
}

.v-leave-to .dialog {
    transform: scale(0.5);
    opacity: 0;
}

.v-enter-to .dialog,
.v-leave-from .dialog {
    transform: scale(1);
}
</style>
