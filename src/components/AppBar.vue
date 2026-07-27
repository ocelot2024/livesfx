<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

export interface MenuItem {
    label: string
    id: string
    handle: () => void
}

export interface MenuList {
    label: string
    id: string
    children: MenuItem[]
}

defineProps<{
    items: MenuList[]
}>()

const openId = ref<string | null>(null)
const rootEl = ref<HTMLElement | null>(null)

const toggleMenu = (id: string) => {
    openId.value = openId.value === id ? null : id
}

const hoverMenu = (id: string) => {
    if (openId.value !== null) {
        openId.value = id
    }
}

const closeMenu = () => {
    openId.value = null
}

const handleItemClick = (item: MenuItem) => {
    item.handle()
    closeMenu()
}

const handleOutsideClick = (e: MouseEvent) => {
    if (rootEl.value && !rootEl.value.contains(e.target as Node)) {
        closeMenu()
    }
}

const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
        closeMenu()
    }
}

onMounted(() => {
    document.addEventListener('click', handleOutsideClick)
    document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', handleOutsideClick)
    document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
    <header class="app-bar" ref="rootEl">
        <nav class="menu-bar">
            <div v-for="menu in items" :key="menu.id" class="menu">
                <button class="menu-button" :class="{ active: openId === menu.id }" @click="toggleMenu(menu.id)"
                    @mouseenter="hoverMenu(menu.id)" :aria-expanded="openId === menu.id" aria-haspopup="true">
                    {{ menu.label }}
                </button>

                <Transition name="dropdown">
                    <div v-if="openId === menu.id" class="dropdown" role="menu">
                        <button v-for="item in menu.children" :key="item.id" class="menu-item" role="menuitem"
                            @click="handleItemClick(item)">
                            {{ item.label }}
                        </button>
                    </div>
                </Transition>
            </div>
        </nav>
    </header>
</template>

<style scoped>
.app-bar {
    background-color: var(--blur);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--gray-5);
    user-select: none;
}

.menu-bar {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
}

.menu {
    position: relative;
}

.menu-button {
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    cursor: pointer;
}

.menu-button:hover,
.menu-button.active {
    background: var(--gray-4);
}

.dropdown {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;

    min-width: 180px;

    display: flex;
    flex-direction: column;

    background: var(--background);
    border: 1px solid var(--gray-5);
    border-radius: 8px;

    box-shadow: 0 8px 24px rgb(0 0 0 / 20%);

    overflow: hidden;
    z-index: 100;

    transform-origin: top left;
}

.dropdown-enter-active,
.dropdown-leave-active {
    transition: opacity 0.12s ease, transform 0.12s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
}


button.menu-item {
    border: none;
    color: inherit;
    font: inherit;

    text-align: left;

    padding: 0.6rem 1rem;
    cursor: pointer;
}

.menu-item:hover {
    background-color: var(--gray-4);
}
</style>
