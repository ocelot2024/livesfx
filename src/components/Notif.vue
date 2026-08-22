<script setup lang="ts">
import type { Notificatin } from '@/core/store/enginestore_type';

const props = defineProps<Notificatin>()

</script>
<template>
    <div class="notification-container">
        <!--実装が一通り終わったらアイコン追加-->
        <div class="icon"></div>
        <section>
            <h2>{{ props.title }}</h2>
            <p>{{ props.message }}</p>
        </section>
    </div>
</template>
<style scoped>
.notification-container {
    background-color: var(--blur);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 12px;
    border-radius: 12px;
    display: flex;
    gap: 7px;
}
</style>
