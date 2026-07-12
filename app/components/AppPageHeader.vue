<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>
<template>
  <UDashboardNavbar :title="title">
    <template #leading><UDashboardSidebarCollapse data-testid="sidebar-toggle" /></template>
    <template #right><slot /></template>
  </UDashboardNavbar>
  <div v-if="description" class="border-muted text-muted border-b px-4 py-2 text-sm">{{ description }}</div>
</template>
