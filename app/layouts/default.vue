<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const navigation: NavigationMenuItem[][] = [
  [
    { label: 'タスク', icon: 'i-lucide-list-checks', to: '/tasks' },
    { label: 'メモ', icon: 'i-lucide-notebook-pen', to: '/memos' },
    { label: 'カレンダー', icon: 'i-lucide-calendar-days', to: '/calendar' },
    { label: 'タグ', icon: 'i-lucide-tags', to: '/tags' },
  ],
  [
    { label: 'ゴミ箱', icon: 'i-lucide-trash-2', to: '/trash' },
    { label: '設定', icon: 'i-lucide-settings', to: '/settings' },
  ],
]
</script>

<template>
  <UDashboardGroup storage="local">
    <UDashboardSidebar collapsible resizable>
      <template #header="{ collapsed }">
        <div class="flex w-full items-center justify-between gap-2">
          <NuxtLink to="/tasks" class="text-primary flex items-center gap-3 font-bold">
            <span class="bg-primary grid size-9 shrink-0 place-items-center rounded-xl text-white">M</span>
            <span v-if="!collapsed">Memo</span> </NuxtLink
          ><UButton
            v-if="!collapsed"
            to="/search"
            icon="i-lucide-search"
            color="neutral"
            variant="ghost"
            aria-label="横断検索"
          />
        </div>
      </template>
      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="navigation" orientation="vertical" />
      </template>
      <template #footer="{ collapsed }">
        <div class="flex items-center" :class="collapsed ? 'justify-center' : 'justify-between'">
          <span v-if="!collapsed" class="text-muted text-xs">端末内に保存</span>
          <UColorModeButton />
        </div>
      </template>
    </UDashboardSidebar>
    <slot />
  </UDashboardGroup>
</template>
