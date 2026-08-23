<script setup lang="ts">
import Modal from '@/components/Modal.vue';
import { useUpdateStore } from '@/core/store/updatestore.ts';

const store = useUpdateStore();
</script>
<template>
    <Modal :show="store.showUpdateModal" title="アップデート" @close="store.dismissModal()">
        <div class="update-modal">
            <p class="version-line">
                v{{ store.currentVersion }} → v{{ store.newVersion?.version ?? '?' }}
            </p>
            <p v-if="store.newVersion?.date" class="date">{{ store.newVersion.date }}</p>

            <h3>更新内容</h3>
            <ul v-if="store.newVersion?.notes.length">
                <li v-for="note in store.newVersion.notes" :key="note">{{ note }}</li>
            </ul>
            <p v-else class="no-notes">更新内容の詳細を取得できませんでした。</p>

            <div class="actions">
                <button @click="store.dismissModal()">あとで</button>
                <button class="primary" @click="store.applyUpdate()">今すぐ更新</button>
            </div>
        </div>
    </Modal>
</template>
<style scoped>
.update-modal {
    padding: 16px;
    width: 300px;
    max-width: 80vw;
}

.version-line {
    font-size: 18px;
    font-weight: 700;
    text-align: center;
}

.date {
    text-align: center;
    color: var(--label-boring);
    font-size: 13px;
    margin: 2px 0 12px;
}

h3 {
    font-size: 14px;
    margin: 12px 0 4px;
    color: var(--label-boring);
}

ul {
    padding-left: 20px;
    margin: 0 0 16px;
}

li {
    margin-bottom: 4px;
    font-size: 14px;
    line-height: 1.4;
}

.no-notes {
    color: var(--label-boring);
    font-size: 13px;
    margin: 0 0 16px;
}

.actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.actions .primary {
    background-color: var(--accent-bg);
    color: var(--accent-fg);
    border-color: var(--accent-bg);
}
</style>
