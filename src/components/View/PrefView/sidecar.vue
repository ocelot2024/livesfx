<script setup lang="ts">
import Modal from '@/components/Modal.vue';
import Settinglist from '@/components/settinglist.vue';
import SettingsRow from '@/components/settingsRow.vue';
import SettingsSection from '@/components/settingsSection.vue';
import CreateHostView from '../createHostView.vue';
import { ref } from 'vue';
import ConnectToHostView from '../connectToHostView.vue';

const mode = ref<'host' | 'visitor' | undefined>()
</script>
<template>

    <Settinglist>
        <SettingsSection title="説明">
            <div style="text-align: center; padding: 12px;">
                <h2>SideCar</h2>
                <p style="color: var(--label-boring);">LAN内の別のデバイスを接続し、そのデバイスからLiveSFXの効果音やBGMを遠隔操作できます。 </p>
            </div>
        </SettingsSection>
        <SettingsSection title="SideCar">
            <SettingsRow label="ホストの作成" chevron @click="mode = 'host'" />
            <SettingsRow label="ホストに接続" chevron @click="mode = 'visitor'" />
        </SettingsSection>
    </Settinglist>
    <Modal :show="!!mode" @close="mode = undefined">
        <CreateHostView v-if="mode == 'host'" />
        <ConnectToHostView v-if="mode == 'visitor'" />
    </Modal>
</template>
