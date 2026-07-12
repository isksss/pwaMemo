export const TASK_STATUSES = ['todo', 'planned', 'doing', 'paused', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '未着手',
  planned: '対応予定',
  doing: '進行中',
  paused: '保留',
  done: '完了',
}

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '緊急',
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ReminderOffset = 0 | 5 | 60 | 1440

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval: number
  weekdays?: number[]
  monthDay?: number
  useMonthEnd?: boolean
  yearMonth?: number
  yearDay?: number
}

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}
export interface Attachment {
  id: string
  fileName: string
  mimeType: string
  byteSize: number
  width: number
  height: number
  sortOrder: number
}
export interface Task {
  id: string
  seriesId: string | null
  parentId: string | null
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority | null
  startAt: string | null
  dueAt: string | null
  estimatedMinutes: number
  actualMinutes: number
  completedAt: string | null
  scheduledOccurrenceAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  tags: Tag[]
  reminderOffsets: ReminderOffset[]
  recurrence: RecurrenceRule | null
  attachments?: Attachment[]
}
export interface Memo {
  id: string
  relatedTaskId: string | null
  title: string
  body: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  tags: Tag[]
  attachments?: Attachment[]
}
export interface TaskInput {
  id?: string
  parentId?: string | null
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority | null
  startAt?: string | null
  dueAt?: string | null
  estimatedMinutes?: number
  actualMinutes?: number
  tagIds?: string[]
  reminderOffsets?: ReminderOffset[]
  recurrence?: RecurrenceRule | null
}
export interface MemoInput {
  id?: string
  relatedTaskId?: string | null
  title: string
  body?: string
  isPinned?: boolean
  tagIds?: string[]
}
export interface TaskQuery {
  search?: string
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
  tagId?: string
  includeDeleted?: boolean
  limit?: number
  cursor?: string
}
export interface SearchResult {
  tasks: Task[]
  memos: Memo[]
}
export interface BackupEnvelope {
  format: 'pwa-memo-backup'
  version: 1
  exportedAt: string
  tables: Record<string, unknown[]>
}
export interface RestoreResult {
  inserted: number
  updated: number
  skipped: number
}
export type RestoreMode = 'replace' | 'merge'
