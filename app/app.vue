<script setup lang="ts">
import { ja } from '@nuxt/ui/locale'

const ready = ref(false)
const error = ref('')
onMounted(async () => {
  try {
    await useDataService().listTags()
    if (navigator.storage?.persist) await navigator.storage.persist()
    ready.value = true
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
})
const reload = () => window.location.reload()
</script>

<template>
  <UApp :locale="ja">
    <NuxtPwaManifest />
    <div v-if="!ready" class="grid min-h-screen place-items-center p-6">
      <UCard class="w-full max-w-md text-center">
        <UIcon v-if="!error" name="i-lucide-loader-circle" class="text-primary mx-auto size-10 animate-spin" />
        <UIcon v-else name="i-lucide-database-zap" class="text-error mx-auto size-10" />
        <h1 class="mt-4 text-xl font-semibold">
          {{ error ? 'データベースを起動できません' : 'Memoを準備しています' }}
        </h1>
        <p v-if="error" class="text-muted mt-2 text-sm">{{ error }}</p>
        <UButton v-if="error" class="mt-4" label="再試行" @click="reload" />
      </UCard>
    </div>
    <NuxtLayout v-else><NuxtPage /></NuxtLayout>
    <PwaStatus />
  </UApp>
</template>
