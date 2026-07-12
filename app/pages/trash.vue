<script setup lang="ts">
import type { Memo, Task } from '~/types/domain'
const tasks = ref<Task[]>([])
const memos = ref<Memo[]>([])
async function load() {
  ;[tasks.value, memos.value] = await Promise.all([
    useDataService().listTasks({ includeDeleted: true }),
    useDataService().listMemos(true),
  ])
}
onMounted(load)
async function restore(type: 'task' | 'memo', id: string) {
  if (type === 'task') await useDataService().restoreTask(id)
  else await useDataService().restoreMemo(id)
  await load()
}
async function remove(type: 'task' | 'memo', id: string) {
  if (!confirm('完全に削除します。この操作は取り消せません。')) return
  if (type === 'task') await useDataService().deleteTaskPermanently(id)
  else await useDataService().deleteMemoPermanently(id)
  await load()
}
const expiry = (deleted: string | null) =>
  deleted ? new Date(new Date(deleted).getTime() + 30 * 86400000).toLocaleDateString('ja-JP') : ''
</script>
<template>
  <UDashboardPanel
    ><template #header><AppPageHeader title="ゴミ箱" description="削除から30日後に自動で完全削除されます" /></template
    ><template #body
      ><UEmpty v-if="!tasks.length && !memos.length" icon="i-lucide-trash-2" title="ゴミ箱は空です" />
      <div v-else class="space-y-6">
        <section>
          <h2 class="mb-3 font-semibold">タスク</h2>
          <UCard v-for="item in tasks" :key="item.id" class="mb-2"
            ><div class="flex items-center justify-between gap-3">
              <div>
                <b>{{ item.title }}</b>
                <p class="text-muted text-xs">完全削除予定: {{ expiry(item.deletedAt) }}</p>
              </div>
              <div>
                <UButton
                  icon="i-lucide-undo-2"
                  color="neutral"
                  variant="ghost"
                  label="復元"
                  @click="restore('task', item.id)"
                /><UButton icon="i-lucide-trash-2" color="error" variant="ghost" @click="remove('task', item.id)" />
              </div></div
          ></UCard>
        </section>
        <section>
          <h2 class="mb-3 font-semibold">メモ</h2>
          <UCard v-for="item in memos" :key="item.id" class="mb-2"
            ><div class="flex items-center justify-between gap-3">
              <div>
                <b>{{ item.title }}</b>
                <p class="text-muted text-xs">完全削除予定: {{ expiry(item.deletedAt) }}</p>
              </div>
              <div>
                <UButton
                  icon="i-lucide-undo-2"
                  color="neutral"
                  variant="ghost"
                  label="復元"
                  @click="restore('memo', item.id)"
                /><UButton icon="i-lucide-trash-2" color="error" variant="ghost" @click="remove('memo', item.id)" />
              </div></div
          ></UCard>
        </section></div></template
  ></UDashboardPanel>
</template>
