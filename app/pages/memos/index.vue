<script setup lang="ts">
import type { Memo } from '~/types/domain'
const memos = ref<Memo[]>([])
const query = ref('')
async function load() {
  memos.value = await useDataService().listMemos()
}
onMounted(load)
const filtered = computed(() =>
  memos.value.filter((m) => `${m.title} ${m.body}`.toLowerCase().includes(query.value.toLowerCase())),
)
async function trash(m: Memo) {
  if (confirm(`「${m.title}」をゴミ箱へ移しますか？`)) {
    await useDataService().moveMemoToTrash(m.id)
    await load()
  }
}
</script>
<template>
  <UDashboardPanel
    ><template #header
      ><AppPageHeader title="メモ"><UButton to="/memos/new" icon="i-lucide-plus" label="新規メモ" /></AppPageHeader
      ><UDashboardToolbar
        ><template #left
          ><UInput
            v-model="query"
            icon="i-lucide-search"
            placeholder="メモを検索" /></template></UDashboardToolbar></template
    ><template #body
      ><UEmpty v-if="!filtered.length" icon="i-lucide-notebook-pen" title="メモがありません"
        ><UButton to="/memos/new" label="メモを作成"
      /></UEmpty>
      <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <UCard v-for="memo in filtered" :key="memo.id"
          ><template #header
            ><div class="flex items-start justify-between">
              <NuxtLink :to="`/memos/${memo.id}`" class="hover:text-primary font-semibold"
                ><UIcon v-if="memo.isPinned" name="i-lucide-pin" class="text-primary mr-1" />{{ memo.title }}</NuxtLink
              ><UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click="trash(memo)"
              /></div></template
          ><NuxtLink :to="`/memos/${memo.id}`"
            ><p class="text-muted line-clamp-5 text-sm whitespace-pre-wrap">{{ memo.body || '本文なし' }}</p>
            <div class="mt-3 flex flex-wrap gap-1">
              <UBadge v-for="tag in memo.tags" :key="tag.id" color="neutral" variant="outline">{{ tag.name }}</UBadge>
            </div></NuxtLink
          ></UCard
        >
      </div></template
    ></UDashboardPanel
  >
</template>
