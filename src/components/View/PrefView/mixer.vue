<script setup lang="ts">
import Settinglist from '@/components/settinglist.vue';
import SettingsRow from '@/components/settingsRow.vue';
import SettingsSection from '@/components/settingsSection.vue';
import Channel from '@/components/Channel.vue';
import { useConfigStore } from '@/core/store/configstore';

const store = useConfigStore();

</script>
<template>
    <div>
        <Settinglist>
            <SettingsSection title="フェーダー">
                <SettingsRow label="フェーダーカーブ">
                    <input type="number" min="1" step="0.5" v-model.number="store.faderCurve">
                </SettingsRow>
                <SettingsRow label="最大db">
                    <input type="number" step="1" v-model.number="store.faderMaxDb">
                </SettingsRow>
                <SettingsRow label="最小db">
                    <input type="number" step="1" v-model.number="store.faderMinDb">
                </SettingsRow>
                <SettingsRow label="ユニティ位置">
                    <input type="number" min="0.05" max="0.95" step="0.05" v-model.number="store.faderUnityPosition">
                </SettingsRow>
            </SettingsSection>
            <SettingsSection title="プレビュー" footer="実際に動かして、上の設定がフェーダーの挙動にどう反映されるか確認できます。実際のチャンネルには影響しません。">
                <div class="preview">
                    <!-- 実チャンネルとは繋がっていないダミー。設定した値をそのまま読むので操作感の確認用 -->
                    <Channel channel-name="プレビュー" id="pref-preview-channel" />
                </div>
            </SettingsSection>
        </Settinglist>
    </div>
</template>
<style scoped>
.preview {
    display: flex;
    justify-content: center;
    padding: 8px 0 16px;
}
</style>
