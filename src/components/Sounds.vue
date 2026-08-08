<script setup lang="ts">
import { defineAsyncComponent, ref, reactive, computed, nextTick, watch } from 'vue';
import { ProjectEngine } from '../core/index.ts';
import { useEngineState } from '../core/store/enginestore.ts';
import Modal from './Modal.vue';

const selectedSound = ref();
const store = useEngineState();

const editor = defineAsyncComponent({
    loader: () => import('./View/SoundEditor.vue'),
})

const order = ref<string[]>(store.library.map(s => s.id));

watch(
    () => store.library.map(s => s.id),
    (ids) => {
        if (dragState.id !== null) return;
        order.value = ids;
    }
);

const soundsById = computed(() => {
    const map = new Map<string, typeof store.library[number]>();
    for (const s of store.library) map.set(s.id, s);
    return map;
});

const cardRefs = new Map<string, HTMLElement>();
const setCardRef = (id: string, el: Element | { $el: Element } | null) => {
    if (!el) {
        cardRefs.delete(id);
        return;
    }
    const node = el instanceof Element ? el : el.$el;
    if (node instanceof HTMLElement) {
        cardRefs.set(id, node);
    }
}
//TODO 環境設定
const DRAG_THRESHOLD = 8;
const SWAP_INNER_RATIO = 1; // 0〜1。対象カード中心からこの割合の範囲に入るまでswapしない
const SWAP_COOLDOWN_MS = 160;
let lastSwapAt = 0;

const dragState = reactive<{
    id: string | null;
    active: boolean;
    hasDragged: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
}>({
    id: null,
    active: false,
    hasDragged: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
});

let dragOriginRect: DOMRect | null = null;

const ghostStyle = computed(() => {
    if (!dragState.active || !dragOriginRect) return {};
    return {
        position: 'fixed' as const,
        left: `${dragOriginRect.left + dragState.dx}px`,
        top: `${dragOriginRect.top + dragState.dy}px`,
        width: `${dragOriginRect.width}px`,
        height: `${dragOriginRect.height}px`,
        transform: 'scale(1.06)',
        pointerEvents: 'none' as const,
        zIndex: 999,
    };
});

const resetDragState = () => {
    dragState.id = null;
    dragState.active = false;
    dragState.pointerId = null;
    dragState.dx = 0;
    dragState.dy = 0;
    dragOriginRect = null;
}

const onGridPointerDown = (e: PointerEvent) => {
    if (store.ui_mode !== 'edit') return;
    const cardEl = (e.target as HTMLElement)?.closest('[data-sound-id]');
    if (!cardEl) return;
    const id = cardEl.getAttribute('data-sound-id');
    if (!id) return;

    const container = e.currentTarget as HTMLElement;
    container.setPointerCapture(e.pointerId);

    dragState.id = id;
    dragState.active = false;
    dragState.hasDragged = false;
    dragState.pointerId = e.pointerId;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    dragState.dx = 0;
    dragState.dy = 0;

    dragOriginRect = cardEl.getBoundingClientRect();
}

const onGridPointerMove = (e: PointerEvent) => {
    if (dragState.id === null || e.pointerId !== dragState.pointerId) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const draggedId = dragState.id;

    if (!dragState.active) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        dragState.active = true;
        dragState.hasDragged = true;
    }

    e.preventDefault();
    dragState.dx = dx;
    dragState.dy = dy;

    const hoveredEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-sound-id]');
    const hoveredId = hoveredEl?.getAttribute('data-sound-id');
    if (!hoveredEl || !hoveredId || hoveredId === draggedId) return;

    const fromIndex = order.value.indexOf(draggedId);
    const toIndex = order.value.indexOf(hoveredId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const now = performance.now();
    if (now - lastSwapAt < SWAP_COOLDOWN_MS) return;

    const hoveredRect = hoveredEl.getBoundingClientRect();
    const centerX = hoveredRect.left + hoveredRect.width / 2;
    const centerY = hoveredRect.top + hoveredRect.height / 2;
    const halfW = (hoveredRect.width / 2) * SWAP_INNER_RATIO;
    const halfH = (hoveredRect.height / 2) * SWAP_INNER_RATIO;
    if (Math.abs(e.clientX - centerX) > halfW || Math.abs(e.clientY - centerY) > halfH) {
        return;
    }

    lastSwapAt = now;
    reorderWithFlip(fromIndex, toIndex, draggedId);
}

const finishDrag = async (committed: boolean) => {
    const id = dragState.id;
    const wasActive = dragState.active;

    if (!committed || id === null) {
        order.value = store.library.map(s => s.id);
        resetDragState();
        return;
    }

    const finalIndex = order.value.indexOf(id);
    resetDragState();

    if (wasActive && finalIndex !== -1) {
        const result = await ProjectEngine.move_sound(id, finalIndex);
        if (!result.ok) {
            order.value = store.library.map(s => s.id);
            console.error('move_sound failed, reverted order:', result.value);
        }
    }
}

const onGridPointerUp = async (e: PointerEvent) => {
    if (dragState.id === null || e.pointerId !== dragState.pointerId) return;
    await finishDrag(true);
}

const onGridPointerCancel = (e: PointerEvent) => {
    if (dragState.id === null || e.pointerId !== dragState.pointerId) return;
    void finishDrag(false);
}

const onGridLostPointerCapture = (e: PointerEvent) => {
    if (dragState.id === null || e.pointerId !== dragState.pointerId) return;
    void finishDrag(false);
}

const reorderWithFlip = async (fromIndex: number, toIndex: number, draggedId: string) => {
    const firstRects = new Map<string, DOMRect>();
    for (const [id, el] of cardRefs) {
        if (id === draggedId) continue;
        firstRects.set(id, el.getBoundingClientRect());
    }

    const next = order.value.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved as string);
    order.value = next;

    await nextTick();

    if (dragState.id !== draggedId) return;

    for (const [id, el] of cardRefs) {
        if (id === draggedId) continue;
        const first = firstRects.get(id);
        if (!first) continue;
        const last = el.getBoundingClientRect();
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        if (deltaX === 0 && deltaY === 0) continue;

        el.style.transition = 'none';
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        requestAnimationFrame(() => {
            el.style.transition = 'transform 0.25s ease-out';
            el.style.transform = '';
        });
    }
}

const onClick = async (id: string) => {
    if (dragState.hasDragged) {
        dragState.hasDragged = false;
        return;
    }
    const is_live = store.ui_mode == "live";
    if (is_live) {
        await ProjectEngine.play(id)
    } else {
        selectedSound.value = id;
    }
}
</script>

<template>
    <div>
        <div class="grid" @pointerdown="onGridPointerDown" @pointermove="onGridPointerMove" @pointerup="onGridPointerUp"
            @pointercancel="onGridPointerCancel" @lostpointercapture="onGridLostPointerCapture">
            <button v-for="id in order" :key="id" :data-sound-id="id" :ref="(el) => setCardRef(id, el as Element)"
                @click="onClick(id)" :class="{ 'edit-mode': store.ui_mode === 'edit' }">
                <div class="card" :class="{
                    vibrate: store.ui_mode === 'edit' && dragState.id !== id,
                    'is-dragging-source': dragState.id === id,
                }">
                    <h3>{{ soundsById.get(id)?.filename }}</h3>
                </div>
            </button>
        </div>
        <Teleport to="body">
            <div v-if="dragState.active && dragState.id" class="drag-ghost card" :style="ghostStyle">
                <h3>{{ soundsById.get(dragState.id)?.filename }}</h3>
            </div>
        </Teleport>

        <Modal :show="selectedSound" @close="selectedSound = undefined"
            :title="soundsById.get(selectedSound)?.filename">
            <editor :sound-id="selectedSound" />
        </Modal>
    </div>
</template>

<style scoped>
.grid button {
    background-color: transparent;
    border: none;
    padding: 0;
    touch-action: none;
}

.grid {
    display: grid;
    gap: 32px;
    padding: 32px;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.card {
    cursor: pointer;
    background-color: var(--gray-5);
    border-radius: 12px;
    padding: 12px;
    aspect-ratio: 1/1;
    transition: opacity .1s ease-in-out;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.08), 0 12px 32px rgba(0, 0, 0, 0.06);
}

button:active .card {
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04), inset 0 4px 12px rgba(0, 0, 0, 0.08), inset 0 12px 32px rgba(0, 0, 0, 0.06);
}

.is-dragging-source {
    opacity: 0.25;
}

.edit-mode:nth-child(2n) .vibrate {
    animation: wobble-a 0.25s infinite;
    transform-origin: 50% 10%;
}

.edit-mode:nth-child(2n-1) .vibrate {
    animation: wobble-b 0.25s infinite alternate;
    transform-origin: 30% 5%;
}

.drag-ghost {
    background-color: var(--gray-5);
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08), 0 8px 20px rgba(0, 0, 0, 0.14), 0 20px 48px rgba(0, 0, 0, 0.1);
    box-sizing: border-box;
    display: flex;
    text-align: center;
}
</style>

<style>
@keyframes wobble-a {
    0% {
        transform: rotate(-2deg);
        animation-timing-function: ease-in;
    }

    50% {
        transform: rotate(3deg);
        animation-timing-function: ease-out;
    }
}

@keyframes wobble-b {
    0% {
        transform: rotate(2deg);
        animation-timing-function: ease-in;
    }

    50% {
        transform: rotate(-3deg);
        animation-timing-function: ease-out;
    }
}
</style>
