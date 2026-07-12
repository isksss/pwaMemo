<script setup lang="ts">
import type { Task } from '~/types/domain'
import { renderMarkdown } from '~/utils/markdown'
const props = defineProps<{ id?: string }>()
const title = ref('')
const body = ref('')
const pinned = ref(false)
const relatedTaskId = ref<string | null>(null)
const tagIds = ref<string[]>([])
const tags = ref<{ id: string; name: string }[]>([])
const tasks = ref<Task[]>([])
const mode = ref<'edit' | 'split' | 'preview'>('split')
const saving = ref(false)
const toast = useToast()
let autosave: ReturnType<typeof setTimeout>
const loaded = ref(false)
onMounted(async () => {
  ;[tags.value, tasks.value] = await Promise.all([useDataService().listTags(), useDataService().listTasks()])
  if (props.id) {
    const memo = await useDataService().getMemo(props.id)
    if (memo) {
      title.value = memo.title
      body.value = memo.body
      pinned.value = memo.isPinned
      relatedTaskId.value = memo.relatedTaskId
      tagIds.value = memo.tags.map((t) => t.id)
    }
  }
  loaded.value = true
})
watch(
  [title, body, pinned, relatedTaskId, tagIds],
  () => {
    if (!loaded.value || !props.id) return
    clearTimeout(autosave)
    autosave = setTimeout(save, 1000)
  },
  { deep: true },
)
async function save() {
  if (!title.value.trim()) return
  saving.value = true
  try {
    const memo = await useDataService().saveMemo({
      id: props.id,
      title: title.value,
      body: body.value,
      isPinned: pinned.value,
      relatedTaskId: relatedTaskId.value,
      tagIds: tagIds.value,
    })
    if (!props.id) await navigateTo(`/memos/${memo.id}`, { replace: true })
  } catch (e) {
    toast.add({ title: '保存できません', description: e instanceof Error ? e.message : String(e), color: 'error' })
  } finally {
    saving.value = false
  }
}
const html = computed(() => renderMarkdown(body.value))
const tagItems = computed(() => tags.value.map((t) => ({ value: t.id, label: t.name })))
const taskItems = computed(() => [
  { value: null, label: 'なし' },
  ...tasks.value.map((t) => ({ value: t.id, label: t.title })),
])
</script>
<template>
  <UDashboardPanel
    ><template #header
      ><AppPageHeader :title="id ? 'メモを編集' : 'メモを作成'"
        ><span class="text-muted text-xs">{{ saving ? '保存中…' : '保存済み' }}</span
        ><UButton icon="i-lucide-save" label="保存" @click="save" /></AppPageHeader
      ><UDashboardToolbar
        ><template #left
          ><UButton to="/memos" icon="i-lucide-arrow-left" color="neutral" variant="ghost" /><UTabs
            v-model="mode"
            :items="[
              { value: 'edit', label: '編集' },
              { value: 'split', label: '分割' },
              { value: 'preview', label: 'プレビュー' },
            ]" /></template
        ><template #right><USwitch v-model="pinned" label="ピン留め" /></template></UDashboardToolbar></template
    ><template #body
      ><div class="grid gap-4">
        <UFormField label="タイトル" required><UInput v-model="title" maxlength="200" class="w-full" /></UFormField>
        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField label="関連タスク"
            ><USelect v-model="relatedTaskId" :items="taskItems" class="w-full" /></UFormField
          ><UFormField label="タグ"
            ><USelectMenu v-model="tagIds" :items="tagItems" multiple value-key="value" class="w-full"
          /></UFormField>
        </div>
        <div class="grid min-h-[55vh] gap-4" :class="mode === 'split' ? 'lg:grid-cols-2' : ''">
          <UTextarea
            v-if="mode !== 'preview'"
            v-model="body"
            class="h-full w-full font-mono"
            :ui="{ base: 'h-full min-h-[55vh]' }"
            placeholder="# メモ"
          /><!-- eslint-disable-next-line vue/no-v-html -->
          <article
            v-if="mode !== 'edit'"
            class="prose-memo border-muted overflow-auto rounded-lg border p-5"
            v-html="html"
          />
        </div></div></template
  ></UDashboardPanel>
</template>
