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
import { QrcodeStream, type DetectedBarcode } from 'vue-qrcode-reader';

const page = ref(0)

const offer = ref('')
const answer = ref('')
const src = ref();
onMounted(async () => {
    offer.value = JSON.stringify(await ProjectManager.create_host())
    if (offer.value.length > 4200) {
        return
    }
    src.value = await QRCode.toDataURL(offer.value);
})
const share = async () => {
    await navigator.share({ text: offer.value })
}

const detect = (value: DetectedBarcode[]) => {
    answer.value = value[0]?.rawValue ?? '';
    show_reader.value = false;
}
const err = () => {
    show_reader.value = false;
    err_cam.value = true
}
const show_reader = ref(false)
const err_cam = ref(false);
</script>
<template>
    <Settinglist>
        <SettingsSection title="接続情報" v-if="page == 0">
            <div class="flex"
                style="justify-content: center; align-items: center; gap:7px; padding: 12px; text-align: center; flex-direction: column;">
                <h2>接続するデバイスでQRコードを読み取る</h2>
                <img alt="QRコード" class="qr-area" v-if="offer && offer.length < 4201" :src="src">
                <div class="qr-area flex qr-dummy" v-else-if="offer">
                    <small>QRコードの作成に失敗しました</small>
                </div>
                <div class="qr-area flex qr-dummy" v-else>
                    <Spinner />
                    <small>読み込み中</small>
                </div>
                <p>または手動で共有</p>
                <textarea readonly v-model="offer" :disabled="!offer" name="offer">
                </textarea>
                <button v-if="offer && SupportedShareAPI" @click="share()">共有</button>
                <p>接続するデバイスで読み込みが成功したら次へをクリックしてください。</p>
            </div>
            <SettingsRow chevron label="次へ" @click="page++" />
        </SettingsSection>
        <div v-if="page == 1" style="display: flex; flex-direction: column;">
            <SettingsSection title="説明">
                <div class="flex"
                    style="justify-content: center; align-items: center; gap:7px; padding: 12px; text-align: center; flex-direction: column;">
                    最後に接続するデバイスに表示されている文字を入力するかQRコードを読み取ってください、
                </div>
            </SettingsSection>
            <SettingsSection title="説明">
                <SettingsRow :chevron="!err_cam" :label="err_cam ? 'カメラは使用できませんでした' : 'QRコードを読み込む'"
                    @click="show_reader = true" />
                <div style="padding: 7px 16px; gap: 12px; display: flex; flex-direction: column;">
                    <div>情報を入力</div>
                    <textarea v-model="answer" name="answer"></textarea>
                </div>
            </SettingsSection>
            <button style="margin: 0 16px; display: block;" :disabled="answer.length == 0">接続する</button>
        </div>
    </Settinglist>
    <Modal :show="show_reader">
        <h2>接続するデバイスに表示されたQRコードを読み込んでください</h2>
        <QrcodeStream v-if="show_reader" @error="err()" @detect="(deetected: DetectedBarcode[]) => detect(deetected)"
            :constraints="{
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }" :track="() => { }">
        </QrcodeStream>
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
