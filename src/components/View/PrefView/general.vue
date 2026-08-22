<script setup lang="ts">
import Modal from '@/components/Modal.vue';
import Settinglist from '@/components/settinglist.vue';
import SettingsRow from '@/components/settingsRow.vue';
import SettingsSection from '@/components/settingsSection.vue';
import Toggle from '@/components/toggle.vue';
import { useConfigStore } from '@/core/store/configstore.ts';
import { defineAsyncComponent, ref } from 'vue';

const alertNotSaved = ref(true)

const store = useConfigStore()

const showLicense = ref(false);

const licenseView = defineAsyncComponent({
    loader: () => import('../license.vue')
})

function resetSettings() {
    const will = confirm('すべての設定を初期値に戻します。よろしいですか？')
    if (!will) return
    store.$reset()
}
</script>
<template>
    <div>
        <Settinglist>
            <SettingsSection title="動作">
                <SettingsRow label="編集モード繊維の確認">
                    <Toggle v-model="store.enterEditModeConfirm" />
                </SettingsRow>
                <SettingsRow label="プロジェクト未保存時の警告">
                    <Toggle v-model="store.alertBeforeLeave" />
                </SettingsRow>
            </SettingsSection>
            <SettingsSection title="アニメーション">
                <SettingsRow label="編集モードのアニメーション">
                    <Toggle v-model="store.editModeAnimation" />
                </SettingsRow>
                <SettingsRow label="モーダルのアニメーション">
                    <Toggle v-model="store.modalAnimation" />
                </SettingsRow>
            </SettingsSection>
            <SettingsSection title="その他">
                <SettingsRow label="ドラッグのしきい値">
                    <input type="number" min="0" step="1" v-model.number="store.dragThreshold">
                </SettingsRow>
                <SettingsRow label="カード入れ替えのしきい値">
                    <input type="number" min="0" max="1" step="0.1" v-model.number="store.swapInnerRatio">
                </SettingsRow>
                <SettingsRow label="入れ替えのクールダウン">
                    <input type="number" min="0" step="10" v-model.number="store.swapCooldownMs">
                </SettingsRow>
                <SettingsRow label="最後に開いていたタブの記憶">
                    <Toggle v-model="store.memoryLastTab" />
                </SettingsRow>
            </SettingsSection>
            <SettingsSection title="情報">
                <div style="text-align:  center; padding: 8px;">
                    <img src="@/img/logo.png">
                    <h2>LiveSFX</h2>
                    <small>0.1.1</small>
                </div>
                <SettingsRow label="ライセンス一覧" chevron @click="showLicense = true" />
            </SettingsSection>
            <SettingsSection title="リセット">
                <SettingsRow label="設定を初期値に戻す" chevron danger @click="resetSettings" />
            </SettingsSection>
        </Settinglist>
        <Modal :show="showLicense" @close="showLicense = false">
            <licenseView />
        </Modal>
    </div>
</template>
