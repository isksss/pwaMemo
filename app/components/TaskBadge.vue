<script setup lang="ts">
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type TaskPriority, type TaskStatus } from '~/types/domain'
const props = defineProps<{ status?: TaskStatus; priority?: TaskPriority | null }>()
const statusColor = computed(
  () =>
    ({ todo: 'neutral', planned: 'info', doing: 'primary', paused: 'warning', done: 'success' })[
      props.status ?? 'todo'
    ] as any,
)
const priorityColor = computed(
  () => ({ low: 'neutral', medium: 'info', high: 'warning', urgent: 'error' })[props.priority ?? 'low'] as any,
)
</script>
<template>
  <UBadge v-if="status" :color="statusColor" variant="subtle">{{ TASK_STATUS_LABELS[status] }}</UBadge>
  <UBadge v-if="priority" :color="priorityColor" variant="subtle">{{ TASK_PRIORITY_LABELS[priority] }}</UBadge>
</template>
