<script setup lang="ts">
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type ReminderOffset,
  type Task,
  type TaskInput,
} from '~/types/domain'

const props = defineProps<{ task?: Task | null; tasks: Task[]; tags: { id: string; name: string }[] }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()
const toast = useToast()
const saving = ref(false)
const form = reactive<TaskInput>({
  title: '',
  description: '',
  status: 'todo',
  priority: null,
  parentId: null,
  startAt: null,
  dueAt: null,
  estimatedMinutes: 0,
  actualMinutes: 0,
  tagIds: [],
  reminderOffsets: [],
  recurrence: null,
})

watch(
  () => props.task,
  (task) =>
    Object.assign(
      form,
      task
        ? {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            parentId: task.parentId,
            startAt: task.startAt?.slice(0, 16) ?? null,
            dueAt: task.dueAt?.slice(0, 16) ?? null,
            estimatedMinutes: task.estimatedMinutes,
            actualMinutes: task.actualMinutes,
            tagIds: task.tags.map((t) => t.id),
            reminderOffsets: [...task.reminderOffsets],
            recurrence: task.recurrence ? { ...task.recurrence } : null,
          }
        : {
            id: undefined,
            title: '',
            description: '',
            status: 'todo',
            priority: null,
            parentId: null,
            startAt: null,
            dueAt: null,
            estimatedMinutes: 0,
            actualMinutes: 0,
            tagIds: [],
            reminderOffsets: [],
            recurrence: null,
          },
    ),
  { immediate: true },
)
const statusItems = TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABELS[value] }))
const priorityItems = [
  { value: null, label: '未指定' },
  ...TASK_PRIORITIES.map((value) => ({ value, label: TASK_PRIORITY_LABELS[value] })),
]
const parentItems = computed(() => [
  { value: null, label: 'なし' },
  ...props.tasks.filter((t) => !t.parentId && t.id !== props.task?.id).map((t) => ({ value: t.id, label: t.title })),
])
const tagItems = computed(() => props.tags.map((t) => ({ value: t.id, label: t.name })))
const reminderItems = [
  { value: 0, label: '期限時' },
  { value: 5, label: '5分前' },
  { value: 60, label: '1時間前' },
  { value: 1440, label: '1日前' },
]
const startAtModel = computed({
  get: () => form.startAt ?? '',
  set: (value) => {
    form.startAt = value || null
  },
})
const dueAtModel = computed({
  get: () => form.dueAt ?? '',
  set: (value) => {
    form.dueAt = value || null
  },
})
const recurrenceEnabled = computed({
  get: () => !!form.recurrence,
  set: (value) => {
    form.recurrence = value ? { frequency: 'daily', interval: 1 } : null
  },
})
async function save() {
  saving.value = true
  try {
    await useDataService().saveTask({
      ...form,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
    })
    toast.add({ title: 'タスクを保存しました', color: 'success' })
    emit('saved')
  } catch (error) {
    toast.add({
      title: '保存できません',
      description: error instanceof Error ? error.message : String(error),
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <form class="grid gap-4" @submit.prevent="save">
    <UFormField label="タイトル" required
      ><UInput v-model="form.title" maxlength="200" class="w-full" autofocus
    /></UFormField>
    <UFormField label="説明"><UTextarea v-model="form.description" :rows="4" class="w-full" /></UFormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField label="状態"><USelect v-model="form.status" :items="statusItems" class="w-full" /></UFormField>
      <UFormField label="優先度"><USelect v-model="form.priority" :items="priorityItems" class="w-full" /></UFormField>
      <UFormField label="開始日時"><UInput v-model="startAtModel" type="datetime-local" class="w-full" /></UFormField>
      <UFormField label="期限日時"><UInput v-model="dueAtModel" type="datetime-local" class="w-full" /></UFormField>
      <UFormField label="見積（分）"
        ><UInputNumber v-model="form.estimatedMinutes" :min="0" class="w-full"
      /></UFormField>
      <UFormField label="実績（分）"><UInputNumber v-model="form.actualMinutes" :min="0" class="w-full" /></UFormField>
      <UFormField label="親タスク"><USelect v-model="form.parentId" :items="parentItems" class="w-full" /></UFormField>
      <UFormField label="タグ"
        ><USelectMenu v-model="form.tagIds" multiple :items="tagItems" value-key="value" class="w-full"
      /></UFormField>
    </div>
    <UFormField label="通知"
      ><div class="flex flex-wrap gap-4">
        <UCheckbox
          v-for="item in reminderItems"
          :key="item.value"
          :model-value="form.reminderOffsets?.includes(item.value as ReminderOffset)"
          :label="item.label"
          @update:model-value="
            (checked) =>
              (form.reminderOffsets = checked
                ? [...(form.reminderOffsets ?? []), item.value as ReminderOffset]
                : (form.reminderOffsets ?? []).filter((value) => value !== item.value))
          "
        /></div
    ></UFormField>
    <div class="border-muted rounded-lg border p-4">
      <USwitch v-model="recurrenceEnabled" label="繰り返す" />
      <div v-if="form.recurrence" class="mt-3 grid gap-3 sm:grid-cols-2">
        <USelect
          v-model="form.recurrence.frequency"
          :items="[
            { value: 'daily', label: '日' },
            { value: 'weekly', label: '週' },
            { value: 'monthly', label: '月' },
            { value: 'yearly', label: '年' },
          ]"
        />
        <UInputNumber v-model="form.recurrence.interval" :min="1" />
      </div>
    </div>
    <div class="flex justify-end gap-2">
      <UButton color="neutral" variant="ghost" label="キャンセル" @click="emit('cancel')" /><UButton
        type="submit"
        :loading="saving"
        label="保存"
      />
    </div>
  </form>
</template>
