<script setup lang="ts">
import { ref } from 'vue';
import Settinglist from '../settinglist.vue';
import SettingsRow from '../settingsRow.vue';
import SettingsSection from '../settingsSection.vue';
import { ProjectEngine } from '@/core/index.ts';


const props = defineProps<{ id: string, filaname: string }>();
const emit = defineEmits(['saved'])
const filename = ref(props.filaname)
const save = () => {
    ProjectEngine.rename(props.id, filename.value)
    emit('saved')
}
</script>
<template>
    <div style="display: flex; flex-direction: column; padding: 20px;">
        <Settinglist>
            <SettingsSection title="その他">
                <SettingsRow label="ファイル名"><input type="text" v-model="filename"></SettingsRow>
            </SettingsSection>
        </Settinglist>
        <button @click="save" :disabled="!filename">変更を保存</button>
    </div>
</template>
