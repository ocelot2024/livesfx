<script setup lang="ts">
import Settinglist from '@/components/settinglist.vue';
import SettingsRow from '@/components/settingsRow.vue';
import SettingsSection from '@/components/settingsSection.vue';
import Toggle from '@/components/toggle.vue';
import type { SFXPlayMode } from '@/core/audioEngine/sounds';
import { ref } from 'vue';

const defaultPlayMode = ref<SFXPlayMode>()



const showLicense = ref(false);
</script>
<template>
    <div>
        <Settinglist>
            <SettingsSection title="効果音">
                <SettingsRow label="編集モード繊維の確認">
                </SettingsRow>
                <SettingsRow label="プロジェクト未保存時の警告">
                </SettingsRow>
            </SettingsSection>
        </Settinglist>
    </div>
</template>
<style scoped></style>
