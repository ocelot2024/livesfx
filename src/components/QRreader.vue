<script setup lang="ts">
import { QrcodeStream } from 'vue-qrcode-reader';
import { ref } from 'vue';
import type { DetectedBarcode } from 'vue-qrcode-reader';
const detected = ref<string[]>()
const emit = defineEmits(['error', 'detect'])
const onDetect = (value: DetectedBarcode[]) => {
    detected.value = value.map(v => v.rawValue)
    emit('detect', detected.value)
}
</script>
<template>
    <QrcodeStream @error="emit('error')" @detect="onDetect" :constraints="{
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
    }" :track="() => { }">
    </QrcodeStream>
</template>
