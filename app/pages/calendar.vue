<script setup lang="ts">
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Task } from '~/types/domain'
const current = ref(new Date())
const tasks = ref<Task[]>([])
const selectedDay = ref(new Date())
onMounted(async () => (tasks.value = await useDataService().listTasks({ limit: 100 })))
const days = computed(() =>
  eachDayOfInterval({
    start: startOfWeek(startOfMonth(current.value), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(current.value), { weekStartsOn: 0 }),
  }),
)
const tasksOn = (day: Date) =>
  tasks.value.filter(
    (t) => (t.dueAt && isSameDay(new Date(t.dueAt), day)) || (t.startAt && isSameDay(new Date(t.startAt), day)),
  )
function move(months: number) {
  current.value = new Date(current.value.getFullYear(), current.value.getMonth() + months, 1)
}
</script>
<template>
  <UDashboardPanel
    ><template #header
      ><AppPageHeader title="カレンダー" description="開始日と期限日を月ごとに確認できます"
        ><UButtonGroup
          ><UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" @click="move(-1)" /><UButton
            :label="format(current, 'yyyy年 M月', { locale: ja })"
            color="neutral"
            variant="outline"
            @click="current = new Date()" /><UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="outline"
            @click="move(1)" /></UButtonGroup></AppPageHeader></template
    ><template #body
      ><div class="border-muted grid grid-cols-7 overflow-hidden rounded-xl border">
        <div
          v-for="w in ['日', '月', '火', '水', '木', '金', '土']"
          :key="w"
          class="bg-elevated p-2 text-center text-xs font-semibold"
        >
          {{ w }}
        </div>
        <button
          v-for="day in days"
          :key="day.toISOString()"
          class="border-muted hover:bg-elevated min-h-24 border-t border-r p-2 text-left"
          :class="{
            'opacity-40': !isSameMonth(day, current),
            'ring-primary ring-2 ring-inset': isSameDay(day, selectedDay),
          }"
          @click="selectedDay = day"
        >
          <span class="text-sm">{{ day.getDate() }}</span>
          <div class="mt-1 space-y-1">
            <div
              v-for="task in tasksOn(day).slice(0, 3)"
              :key="task.id"
              class="bg-primary/10 text-primary truncate rounded px-1 text-xs"
            >
              {{ task.title }}
            </div>
            <span v-if="tasksOn(day).length > 3" class="text-muted text-xs">ほか{{ tasksOn(day).length - 3 }}件</span>
          </div>
        </button>
      </div>
      <UCard class="mt-4"
        ><template #header
          ><b>{{ format(selectedDay, 'M月d日(E)', { locale: ja }) }}</b></template
        ><UEmpty v-if="!tasksOn(selectedDay).length" title="予定はありません" icon="i-lucide-calendar-x" /><NuxtLink
          v-for="task in tasksOn(selectedDay)"
          :key="task.id"
          to="/tasks"
          class="border-muted flex items-center justify-between border-b py-2 last:border-0"
          ><span>{{ task.title }}</span
          ><TaskBadge :status="task.status" :priority="task.priority" /></NuxtLink></UCard></template
  ></UDashboardPanel>
</template>
