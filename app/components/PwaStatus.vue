<script setup lang="ts">
const { $pwa } = useNuxtApp()
const updating = ref(false)
async function update() {
  updating.value = true
  await $pwa?.updateServiceWorker(true)
}
</script>
<template>
  <div v-if="$pwa?.needRefresh" class="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg">
    <UAlert
      color="info"
      icon="i-lucide-refresh-cw"
      title="新しいバージョンがあります"
      description="更新すると最新機能を利用できます。"
    >
      <template #actions><UButton size="xs" :loading="updating" label="更新" @click="update" /></template>
    </UAlert>
  </div>
</template>
