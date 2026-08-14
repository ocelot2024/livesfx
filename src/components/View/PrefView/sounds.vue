<script setup lang="ts">
import Settinglist from '@/components/settinglist.vue';
import SettingsRow from '@/components/settingsRow.vue';
import SettingsSection from '@/components/settingsSection.vue';
import Toggle from '@/components/toggle.vue';
import { SFXPlayMode } from '@/core/audioEngine/sounds';
import { useConfigStore } from '@/core/store/configstore';
import { ref } from 'vue';


const store = useConfigStore();


</script>
<template>
    <div>
        <Settinglist>
            <SettingsSection title="効果音">
                <SettingsRow label="再生モードの初期値">
                    <select name="PlaybackOption" v-model="store.defaultPlayMode">
                        <option :value="SFXPlayMode.OverLap">上書き再生</option>
                        <option :value="SFXPlayMode.Restart">再生しなおす</option>
                        <option :value="SFXPlayMode.Ignore">無視する</option>
                        <option :value="SFXPlayMode.Stop">とめる</option>
                    </select>
                </SettingsRow>
                <SettingsRow label="発音数の上限">
                    <input type="number" min="1" step="1" v-model.number="store.maxPoly">
                </SettingsRow>
            </SettingsSection>
            <SettingsSection title="BGM">
                <SettingsRow label="自動リピート再生">
                    <Toggle v-model="store.autoRepeat"></Toggle>
                </SettingsRow>
                <SettingsRow label="自動ダッキング">
                    <Toggle v-model="store.autoDucking" />
                </SettingsRow>
                <SettingsRow label="ダッキング量">
                    <input type="number" min="0" max="1" step="0.05" v-model.number="store.duckingAmount"
                        :disabled="!store.autoDucking">
                </SettingsRow>
            </SettingsSection>
        </Settinglist>
    </div>
</template>
<style scoped></style>
