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
import { useConfigStore } from '@/core/store/configstore.ts';
import Toggle from '@/components/toggle.vue';

const store = useEngineState()
const config_store = useConfigStore()
const mode = ref<'host' | 'visitor' | undefined>()

const disconnect = () => {
    const will = confirm('本当に切断してもよろしいですか？');
    if (will) {
        ProjectManager.disconnect();
    }
}

const clickConnect = () => {
    if (useConfigStore().alertBeforeLeave) {
        const will = confirm('ホストに接続した場合現在の状態は破棄されます。')
        if (!will) return
    }
    mode.value = 'visitor'
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
            <SettingsRow label="ホストに接続" chevron @click="clickConnect" />
        </SettingsSection>
        <SettingsSection v-else>
            <SettingsRow :label="store.sidecar_mode == 'host' ? 'ホストとして起動中' : 'ビジターとしてホストに接続中'" />
            <SettingsRow label="SideCarを切断" danger chevron @click="disconnect()" />
        </SettingsSection>
        <SettingsSection title="その他">
            <SettingsRow label="認証情報の自動選択">
                <Toggle v-model="config_store.autoSelectCredentials" />
            </SettingsRow>
        </SettingsSection>
    </Settinglist>
    <Modal :show="!!mode" @close="mode = undefined">
        <CreateHostView v-if="mode == 'host'" @close="mode = undefined" />
        <ConnectToHostView v-if="mode == 'visitor'" @close="mode = undefined" />
    </Modal>
</template>
