<script setup lang="ts">
import Settinglist from '@/components/settinglist.vue';
import SettingsRow from '@/components/settingsRow.vue';
import SettingsSection from '@/components/settingsSection.vue';
import Toggle from '@/components/toggle.vue';
import type { SFXPlayMode } from '@/core/audioEngine/sounds';
import { ref } from 'vue';

const defaultPlayMode = ref<SFXPlayMode>()

const autoDucking = ref(false)

</script>
<template>
    <div>
        <Settinglist>
            <SettingsSection title="効果音">
                <SettingsRow label="再生モードの初期値">
                </SettingsRow>
                <SettingsRow label="発音数の上限">
                </SettingsRow>
            </SettingsSection>
            <SettingsSection title="BGM">
                <SettingsRow label="自動リピート再生" />
                <SettingsRow label="デフォルト音量" />
                <SettingsRow label="自動ダッキング">
                    <Toggle v-model="autoDucking" />
                </SettingsRow>
            </SettingsSection>
        </Settinglist>
    </div>
</template>
<style scoped></style>
