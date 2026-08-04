<script setup lang="ts">
export interface TabItem {
    id: string;
    label: string;
}

const selected = defineModel<string>({ required: true });

const props = defineProps<{
    tabs: TabItem[];
}>();

const select = (id: string) => {
    selected.value = id;
};
</script>

<template>
    <div class="container">
        <div class="tabs">
            <button v-for="(tab, _index) in tabs" :key="tab.id" class="tab" :class="{ active: selected === tab.id }"
                @click="select(tab.id)">
                {{ tab.label }}
            </button>

            <div class="glider" :style="{
                width: `calc(100% / ${tabs.length})`,
                transform: `translateX(${tabs.findIndex(t => t.id === selected) * 100}%)`
            }" />
        </div>
    </div>
</template>

<style scoped>
.container {
    display: flex;
    justify-content: center;
}

.tabs {
    width: max-content;
    position: relative;
    display: flex;
    padding: 4px;
    border-radius: 12px;
}

.tab {
    width: 10rem;
    flex: 1;
    z-index: 1;
    border: none;
    background: transparent;
    padding: 10px 16px;
    cursor: pointer;
    border-radius: 8px;
    font: inherit;
    transition: color 0.2s;
    color: var(--label-boring);
}

.tab.active {
    color: var(--label-normal);
}

.glider {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    background-color: var(--gray-5);
    border-radius: 8px;
    transition: transform 0.25s ease;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
</style>
