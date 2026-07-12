<script setup lang="ts">
import type { SearchResult } from '~/types/domain'
const query = ref(useRoute().query.q?.toString() ?? '')
const result = ref<SearchResult>({ tasks: [], memos: [] })
const searching = ref(false)
let timer: ReturnType<typeof setTimeout>
watch(query, () => {
  clearTimeout(timer)
  timer = setTimeout(run, 300)
})
onMounted(run)
async function run() {
  searching.value = true
  result.value = await useDataService().search(query.value)
  searching.value = false
}
</script>
<template>
  <UDashboardPanel
    ><template #header
      ><AppPageHeader title="横断検索" /><UDashboardToolbar
        ><template #left
          ><UInput
            v-model="query"
            icon="i-lucide-search"
            placeholder="タスク、メモ、タグを検索"
            class="w-full max-w-xl"
            autofocus /></template></UDashboardToolbar></template
    ><template #body
      ><USkeleton v-if="searching" class="h-32" /><UEmpty
        v-else-if="!result.tasks.length && !result.memos.length"
        icon="i-lucide-search-x"
        title="結果がありません"
      />
      <div v-else class="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 class="mb-3 font-semibold">タスク（{{ result.tasks.length }}）</h2>
          <NuxtLink v-for="task in result.tasks" :key="task.id" to="/tasks"
            ><UCard class="mb-2"
              ><div class="flex justify-between">
                <span>{{ task.title }}</span
                ><TaskBadge :status="task.status" /></div></UCard
          ></NuxtLink>
        </section>
        <section>
          <h2 class="mb-3 font-semibold">メモ（{{ result.memos.length }}）</h2>
          <NuxtLink v-for="memo in result.memos" :key="memo.id" :to="`/memos/${memo.id}`"
            ><UCard class="mb-2"
              ><b>{{ memo.title }}</b>
              <p class="text-muted line-clamp-2 text-sm">{{ memo.body }}</p></UCard
            ></NuxtLink
          >
        </section>
      </div></template
    ></UDashboardPanel
  >
</template>
