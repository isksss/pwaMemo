<script setup lang="ts">
const memoId = computed(() => String(useRoute().params.id))
</script>
<template><MemoEditor :id="memoId" /></template>
