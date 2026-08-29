<script setup lang="ts">
import { UserShield } from '@lucide/vue';
import Toggle from '../toggle.vue';
import { useConfigStore } from '@/core/store/configstore';

const store = useConfigStore();
</script>

<template>
    <div class="privacy-container">
        <UserShield color="var(--accent-bg)" :size="64" />

        <h2>プライバシー通知</h2>

        <p class="privacy-text">
            LiveSFXの改善にご協力ください。
            同意すると、アプリの品質向上と不具合の修正のため、
            匿名化された診断情報やエラー情報が送信されます。
            個人を特定できる情報は収集されません。
        </p>

        <div class="consent-row">
            <label for="analytics-toggle">
                情報の収集に同意する
            </label>

            <Toggle id="analytics-toggle" v-model="store.collecting_error_info_consent" />
        </div>
    </div>
</template>

<style scoped>
.privacy-container {
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
}

.privacy-text {
    margin: 0;
    line-height: 1.6;
    text-align: left;
}

.consent-row {
    width: 100%;
    margin-top: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}
</style>
