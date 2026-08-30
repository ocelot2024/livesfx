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
        </Settinglist>
    </div>
</template>
<style scoped></style>
