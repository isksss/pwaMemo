<script setup lang="ts">
import { TASK_STATUSES, TASK_STATUS_LABELS, type Task, type TaskStatus } from '~/types/domain'
const service = useDataService()
const tasks = ref<Task[]>([])
const tags = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const status = ref<'all' | TaskStatus>('all')
const view = ref<'list' | 'board'>('list')
const open = ref(false)
const selected = ref<Task | null>(null)
let timer: ReturnType<typeof setTimeout>
async function load() {
  loading.value = true
  ;[tasks.value, tags.value] = await Promise.all([
    service.listTasks({ search: search.value, status: status.value }),
    service.listTags(),
  ])
  loading.value = false
}
watch([search, status], () => {
  clearTimeout(timer)
  timer = setTimeout(load, 300)
})
onMounted(load)
function edit(task?: Task) {
  selected.value = task ?? null
  open.value = true
}
async function saved() {
  open.value = false
  await load()
}
async function changeStatus(task: Task, next: TaskStatus) {
  await service.saveTask({
    ...task,
    status: next,
    tagIds: task.tags.map((t) => t.id),
    reminderOffsets: task.reminderOffsets,
  })
  await load()
}
async function trash(task: Task) {
  if (confirm(`「${task.title}」をゴミ箱へ移しますか？`)) {
    await service.moveTaskToTrash(task.id)
    await load()
  }
}
const byStatus = (value: TaskStatus) => tasks.value.filter((task) => task.status === value)
</script>
<template>
  <div class="contents">
    <UDashboardPanel>
      <template #header
        ><AppPageHeader title="タスク"
          ><div class="flex items-center gap-2">
            <UColorModeButton data-testid="task-color-mode" />
            <UButton icon="i-lucide-plus" label="新規タスク" @click="edit()" /></div></AppPageHeader
        ><UDashboardToolbar
          ><template #left
            ><UInput v-model="search" icon="i-lucide-search" placeholder="タスクを検索" /><USelect
              v-model="status"
              :items="[
                { value: 'all', label: 'すべて' },
                ...TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABELS[value] })),
              ]" /></template
          ><template #right
            ><UTabs
              v-model="view"
              :items="[
                { value: 'list', label: '一覧', icon: 'i-lucide-list' },
                { value: 'board', label: 'カンバン', icon: 'i-lucide-columns-3' },
              ]" /></template></UDashboardToolbar
      ></template>
      <template #body>
        <div v-if="loading" class="space-y-3"><USkeleton v-for="n in 5" :key="n" class="h-16" /></div>
        <UEmpty
          v-else-if="!tasks.length"
          icon="i-lucide-list-checks"
          title="タスクがありません"
          description="最初のタスクを作成しましょう"
          ><UButton label="タスクを作成" @click="edit()"
        /></UEmpty>
        <div v-else-if="view === 'list'" class="space-y-2">
          <UCard v-for="task in tasks" :key="task.id" class="cursor-pointer" @click="edit(task)"
            ><div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-medium">{{ task.title }}</span
                  ><TaskBadge :status="task.status" :priority="task.priority" />
                </div>
                <p v-if="task.description" class="text-muted mt-1 line-clamp-2 text-sm">{{ task.description }}</p>
                <div class="text-muted mt-2 flex flex-wrap gap-2 text-xs">
                  <span v-if="task.dueAt"
                    ><UIcon name="i-lucide-calendar-clock" /> {{ new Date(task.dueAt).toLocaleString('ja-JP') }}</span
                  ><UBadge v-for="tag in task.tags" :key="tag.id" color="neutral" variant="outline">{{
                    tag.name
                  }}</UBadge>
                </div>
              </div>
              <div class="flex">
                <UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  aria-label="編集"
                  @click.stop="edit(task)"
                /><UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  aria-label="ゴミ箱へ移動"
                  @click.stop="trash(task)"
                />
              </div></div
          ></UCard>
        </div>
        <div v-else class="grid min-w-[900px] grid-cols-5 gap-3 overflow-x-auto">
          <section v-for="column in TASK_STATUSES" :key="column" class="bg-elevated rounded-xl p-3">
            <header class="mb-3 flex items-center justify-between">
              <span class="font-semibold">{{ TASK_STATUS_LABELS[column] }}</span
              ><UBadge color="neutral">{{ byStatus(column).length }}</UBadge>
            </header>
            <div class="space-y-2">
              <UCard v-for="task in byStatus(column)" :key="task.id"
                ><button class="w-full text-left font-medium" @click="edit(task)">{{ task.title }}</button>
                <div class="mt-2 flex items-center justify-between">
                  <TaskBadge :priority="task.priority" /><USelect
                    :model-value="task.status"
                    :items="TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABELS[value] }))"
                    size="xs"
                    aria-label="状態変更"
                    @update:model-value="(value) => changeStatus(task, value as TaskStatus)"
                  /></div
              ></UCard>
            </div>
          </section>
        </div>
      </template>
    </UDashboardPanel>
    <UModal v-model:open="open" :title="selected ? 'タスクを編集' : 'タスクを作成'" :ui="{ content: 'sm:max-w-3xl' }"
      ><template #body
        ><TaskForm :task="selected" :tasks="tasks" :tags="tags" @saved="saved" @cancel="open = false" /></template
    ></UModal>
  </div>
</template>
