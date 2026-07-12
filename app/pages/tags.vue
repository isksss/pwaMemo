<script setup lang="ts">
import type { Tag } from '~/types/domain'
const tags = ref<Tag[]>([])
const name = ref('')
const color = ref('emerald')
const editing = ref<Tag | null>(null)
const toast = useToast()
async function load() {
  tags.value = await useDataService().listTags()
}
onMounted(load)
async function save() {
  try {
    await useDataService().saveTag(name.value, color.value, editing.value?.id)
    name.value = ''
    editing.value = null
    await load()
  } catch (e) {
    toast.add({ title: '保存できません', description: e instanceof Error ? e.message : String(e), color: 'error' })
  }
}
function edit(tag: Tag) {
  editing.value = tag
  name.value = tag.name
  color.value = tag.color
}
function cancelEdit() {
  editing.value = null
  name.value = ''
}
async function remove(tag: Tag) {
  if (confirm(`タグ「${tag.name}」を削除しますか？`)) {
    await useDataService().deleteTag(tag.id)
    await load()
  }
}
</script>
<template>
  <UDashboardPanel
    ><template #header><AppPageHeader title="タグ" description="タスクとメモで共通利用するタグを管理します" /></template
    ><template #body
      ><div class="grid gap-6 lg:grid-cols-[360px_1fr]">
        <UCard
          ><template #header
            ><b>{{ editing ? 'タグを編集' : 'タグを作成' }}</b></template
          >
          <form class="space-y-4" @submit.prevent="save">
            <UFormField label="名前" required><UInput v-model="name" maxlength="50" class="w-full" /></UFormField
            ><UFormField label="色"
              ><USelect v-model="color" :items="['emerald', 'blue', 'amber', 'red', 'violet']" class="w-full"
            /></UFormField>
            <div class="flex justify-end gap-2">
              <UButton v-if="editing" color="neutral" variant="ghost" label="取消" @click="cancelEdit" /><UButton
                type="submit"
                label="保存"
              />
            </div></form
        ></UCard>
        <div>
          <UEmpty v-if="!tags.length" title="タグがありません" icon="i-lucide-tags" /><UCard
            v-for="tag in tags"
            v-else
            :key="tag.id"
            class="mb-2"
            ><div class="flex items-center justify-between">
              <UBadge :color="tag.color as any" variant="subtle">{{ tag.name }}</UBadge>
              <div>
                <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" @click="edit(tag)" /><UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  @click="remove(tag)"
                />
              </div></div
          ></UCard>
        </div></div></template
  ></UDashboardPanel>
</template>
