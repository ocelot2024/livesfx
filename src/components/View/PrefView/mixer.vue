<script setup lang="ts">
import Settinglist from '@/components/settinglist.vue';
import SettingsRow from '@/components/settingsRow.vue';
import SettingsSection from '@/components/settingsSection.vue';


</script>
<template>
    <div>
        <Settinglist>
            <SettingsSection title="フェーダー">
                <SettingsRow label="フェーダーカーブ"></SettingsRow>
                <SettingsRow label="最大db"></SettingsRow>
                <SettingsRow label="最小db"></SettingsRow>
                <SettingsRow label="ユニティ位置"></SettingsRow>
            </SettingsSection>
        </Settinglist>
    </div>
</template>
<style scoped></style>
