<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Settinglist from '../settinglist.vue';
import SettingsSection from '../settingsSection.vue';
import Spinner from '../Spinner.vue';
import { ProjectManager } from '@/core/index.ts';
import QRCode from 'qrcode';
import { SupportedShareAPI } from '@/core/util/compatibility.ts';
import SettingsRow from '../settingsRow.vue';
import Modal from '../Modal.vue';
import QRreader from '../QRreader.vue';

const page = ref(0)

const offer = ref('')
const answer = ref('')
const src = ref();
const share = async () => {
    await navigator.share({ text: offer.value })
}

const detect = (value: string[]) => {
    offer.value = value[0] ?? '';
    show_reader.value = false;
}
const err = () => {
    show_reader.value = false;
    err_cam.value = true
}
const show_reader = ref(false)
const err_cam = ref(false);
const connecting = ref(false)
const join_host = async () => {
    connecting.value = true
    const res = await ProjectManager.join_host(JSON.parse(offer.value));
    console.log(res)
}
</script>
<template>
    <Settinglist>
        <div v-if="page == 0" style="display: flex; flex-direction: column;">
            <SettingsSection title="説明">
                <div class="flex"
                    style="justify-content: center; align-items: center; gap:7px; padding: 12px; text-align: center; flex-direction: column;">
                    ホストのQRコードを読み取るか情報を入力してください。
                </div>
            </SettingsSection>
            <SettingsSection title="説明">
                <SettingsRow :chevron="!err_cam" :label="err_cam ? 'カメラは使用できませんでした' : 'QRコードを読み込む'"
                    @click="show_reader = true" />
                <div style="padding: 7px 16px; gap: 12px; display: flex; flex-direction: column;">
                    <div>情報を入力</div>
                    <textarea v-model="offer" name="offer"></textarea>
                </div>
            </SettingsSection>
            <button style="margin: 0 16px; display: block;" :disabled="offer.length == 0 || connecting"
                @click="join_host">次へ</button>
        </div>
    </Settinglist>
    <Modal :show="show_reader" @close="show_reader = false">
        <h2>接続するデバイスに表示されたQRコードを読み込んでください</h2>
        <QRreader @detect="detect" @error="err()" />
    </Modal>
</template>
<style scoped>
.qr-area {
    display: block;
    width: 50%;
    border-radius: 12px;
    border: 1px solid var(--gray-5);
    aspect-ratio: 1/1;
}

.qr-dummy {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 12px;
}
</style>
