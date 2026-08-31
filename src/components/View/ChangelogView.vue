<script setup lang="ts">
import { changelog } from '@/core/changelog.ts';
</script>
<template>
    <div class="changelog">
        <section v-for="entry in changelog" :key="entry.version">
            <h2>v{{ entry.version }} <small>{{ entry.date }}</small></h2>
            <ul>
                <li v-for="note in entry.notes" :key="note">{{ note }}</li>
            </ul>
        </section>
    </div>
</template>
<style scoped>
.changelog {
    padding: 8px 16px;
}

h2 {
    font-size: 16px;
    margin: 16px 0 4px;
}

h2 small {
    font-weight: 400;
    font-size: 12px;
    color: var(--label-boring);
    margin-left: 6px;
}

ul {
    padding-left: 20px;
    margin: 0;
}

li {
    font-size: 14px;
    line-height: 1.5;
}
</style>
