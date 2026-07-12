<script setup lang="ts">
import type { BackupEnvelope, RestoreMode } from '~/types/domain'
import { resolvePwaInstallState } from '~/utils/pwa-install'
const toast = useToast()
const { $pwa } = useNuxtApp()
const storage = ref<{ usage?: number; quota?: number }>({})
const persistent = ref(false)
const restoring = ref(false)
const installing = ref(false)
const standalone = ref(false)
const installState = computed(() =>
  resolvePwaInstallState({
    showInstallPrompt: Boolean($pwa?.showInstallPrompt),
    isStandalone: standalone.value,
    isSecureContext: window.isSecureContext,
    serviceWorkerSupported: 'serviceWorker' in navigator,
  }),
)
onMounted(async () => {
  standalone.value = window.matchMedia('(display-mode: standalone)').matches
  if (navigator.storage?.estimate) storage.value = await navigator.storage.estimate()
  if (navigator.storage?.persisted) persistent.value = await navigator.storage.persisted()
})
async function install() {
  if (!installState.value.canInstall || installing.value) return
  installing.value = true
  try {
    await $pwa?.install()
    // vite-plugin-pwaはブラウザのuserChoiceを公開しないため、プロンプト消失を操作完了として扱う。
    // キャンセル時にも再度プロンプト可能になる場合があるので、断定せず利用者が確認できる文言にする。
    toast.add({
      title: 'インストール画面を閉じました',
      description: '完了していない場合は、ブラウザメニューからもう一度インストールできます。',
      color: 'success',
    })
  } catch (error) {
    toast.add({
      title: 'インストールできませんでした',
      description: error instanceof Error ? error.message : String(error),
      color: 'error',
    })
  } finally {
    installing.value = false
  }
}
const mb = (v?: number) => (v ? `${(v / 1024 / 1024).toFixed(1)} MB` : '不明')
async function backup() {
  const data = await useDataService().exportBackup()
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pwa-memo-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
async function restore(event: Event, mode: RestoreMode) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (mode === 'replace' && !confirm('現在のデータをすべて置き換えますか？')) return
  restoring.value = true
  try {
    const backup = JSON.parse(await file.text()) as BackupEnvelope
    const result = await useDataService().restoreBackup(backup, mode)
    toast.add({
      title: '復元しました',
      description: `処理: ${result.inserted + result.updated}件、スキップ: ${result.skipped}件`,
      color: 'success',
    })
    location.reload()
  } catch (e) {
    toast.add({ title: '復元できません', description: e instanceof Error ? e.message : String(e), color: 'error' })
  } finally {
    restoring.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}
async function notification() {
  if (!('Notification' in window)) {
    toast.add({ title: 'この環境は通知に対応していません', color: 'warning' })
    return
  }
  const result = await Notification.requestPermission()
  toast.add({
    title: result === 'granted' ? '通知を有効にしました' : '通知は許可されませんでした',
    color: result === 'granted' ? 'success' : 'warning',
  })
}
</script>
<template>
  <UDashboardPanel
    ><template #header><AppPageHeader title="設定" /></template
    ><template #body
      ><div class="mx-auto grid max-w-3xl gap-4">
        <UCard
          ><template #header><b>アプリ</b></template>
          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <UColorModeSelect /><UButton
                icon="i-lucide-download"
                label="アプリをインストール"
                :disabled="!installState.canInstall"
                :loading="installing"
                @click="install"
              /><UButton
                icon="i-lucide-bell"
                color="neutral"
                variant="outline"
                label="通知を有効化"
                @click="notification"
              />
            </div>
            <UAlert
              data-testid="pwa-install-status"
              :color="installState.canInstall ? 'success' : 'neutral'"
              variant="subtle"
              icon="i-lucide-monitor-down"
              :title="installState.title"
              :description="installState.description"
            /></div></UCard
        ><UCard
          ><template #header><b>ストレージ</b></template>
          <dl class="grid grid-cols-2 gap-2 text-sm">
            <dt class="text-muted">使用量</dt>
            <dd>{{ mb(storage.usage) }}</dd>
            <dt class="text-muted">上限</dt>
            <dd>{{ mb(storage.quota) }}</dd>
            <dt class="text-muted">永続化</dt>
            <dd>{{ persistent ? '有効' : '未保証' }}</dd>
          </dl>
          <UAlert
            class="mt-4"
            color="warning"
            variant="subtle"
            title="端末内データ"
            description="ブラウザデータを削除するとタスクとメモも失われます。定期的にバックアップしてください。" /></UCard
        ><UCard
          ><template #header><b>バックアップ</b></template>
          <div class="flex flex-wrap gap-2">
            <UButton icon="i-lucide-download" label="JSONを書き出す" @click="backup" /><label
              class="border-muted inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm"
              ><UIcon name="i-lucide-combine" class="mr-2" />統合して復元<input
                type="file"
                accept="application/json"
                class="hidden"
                :disabled="restoring"
                @change="(e) => restore(e, 'merge')" /></label
            ><label
              class="border-error text-error inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm"
              ><UIcon name="i-lucide-replace" class="mr-2" />全置換で復元<input
                type="file"
                accept="application/json"
                class="hidden"
                :disabled="restoring"
                @change="(e) => restore(e, 'replace')"
            /></label></div
        ></UCard></div></template
  ></UDashboardPanel>
</template>
