<script setup lang="ts"></script>
<template>
    <div class="container">
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
    </div>
</template>
<style scoped>
@keyframes blink {
    0% {
        opacity: .2;
    }

    15% {
        opacity: 1;
    }

    100% {
        opacity: .2;
    }
}

.container {
    width: 64px;
    height: 64px;
    position: relative;
}

.bar {
    opacity: .2;
    position: absolute;
    width: 6px;
    height: 19px;
    background-color: var(--label-normal);
    left: 28px;
    border-radius: 12px;
    animation: blink 1.2s infinite;
    transform-origin: 50% 32px;
}

.bar.bar:nth-child(1) {
    transform: rotate(45deg);
    animation-delay: .15s;
}

.bar:nth-child(2) {
    animation-delay: .3s;
    transform: rotate(90deg);
}

.bar:nth-child(3) {
    animation-delay: .45s;
    transform: rotate(135deg);
}

.bar:nth-child(4) {
    animation-delay: .6s;
    transform: rotate(180deg);
}

.bar:nth-child(5) {
    animation-delay: .75s;
    transform: rotate(225deg);
}

.bar:nth-child(6) {
    transform: rotate(270deg);
    animation-delay: .9s;
}

.bar:nth-child(7) {
    transform: rotate(315deg);
    animation-delay: 1.05s;
}
</style>
