<script setup lang="ts">
import Modal from '@/components/Modal.vue';
import Settinglist from '@/components/settinglist.vue';
import SettingsRow from '@/components/settingsRow.vue';
import SettingsSection from '@/components/settingsSection.vue';
import CreateHostView from '../createHostView.vue';
import { ref } from 'vue';
import ConnectToHostView from '../connectToHostView.vue';
import { useEngineState } from '@/core/store/enginestore.ts';
import { ProjectManager } from '@/core/index.ts';

const store = useEngineState()

const mode = ref<'host' | 'visitor' | undefined>()

const disconnect = () => {
    const will = confirm('本当に切断してもよろしいですか？');
    if (will) {
        ProjectManager;
    }
}
</script>
<template>

    <Settinglist>
        <SettingsSection title="説明">
            <div style="text-align: center; padding: 12px;">
                <h2>SideCar</h2>
                <p style="color: var(--label-boring);">LAN内の別のデバイスを接続し、そのデバイスからLiveSFXの効果音やBGMを遠隔操作できます。 </p>
            </div>
        </SettingsSection>
        <SettingsSection title="SideCar" v-if="!store.sidecar_mode">
            <SettingsRow label="ホストの作成" chevron @click="mode = 'host'" />
            <SettingsRow label="ホストに接続" chevron @click="mode = 'visitor'" />
        </SettingsSection>
        <SettingsSection v-else>
            <SettingsRow :label="store.sidecar_mode == 'host' ? 'ホストとして起動中' : 'ビジターとしてホストに接続中'" />
            <SettingsRow label="SideCarを切断" danger chevron @click="disconnect()" />
        </SettingsSection>
    </Settinglist>
    <Modal :show="!!mode" @close="mode = undefined">
        <CreateHostView v-if="mode == 'host'" @close="mode = undefined" />
        <ConnectToHostView v-if="mode == 'visitor'" @close="mode = undefined" />
    </Modal>
</template>
