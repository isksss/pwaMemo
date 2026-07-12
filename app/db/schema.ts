import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({ dataType: () => 'bytea' })
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
}

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey(),
    seriesId: uuid('series_id'),
    parentId: uuid('parent_id'),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: text('status').notNull(),
    priority: text('priority'),
    startAt: timestamp('start_at', { withTimezone: true, mode: 'string' }),
    dueAt: timestamp('due_at', { withTimezone: true, mode: 'string' }),
    estimatedMinutes: integer('estimated_minutes').notNull().default(0),
    actualMinutes: integer('actual_minutes').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
    scheduledOccurrenceAt: timestamp('scheduled_occurrence_at', { withTimezone: true, mode: 'string' }),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('tasks_status_idx').on(table.status, table.deletedAt, table.updatedAt),
    index('tasks_due_idx').on(table.dueAt, table.deletedAt),
    index('tasks_parent_idx').on(table.parentId, table.deletedAt),
    uniqueIndex('tasks_occurrence_idx').on(table.seriesId, table.scheduledOccurrenceAt),
  ],
)

export const memos = pgTable(
  'memos',
  {
    id: uuid('id').primaryKey(),
    relatedTaskId: uuid('related_task_id'),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    isPinned: boolean('is_pinned').notNull().default(false),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('memos_order_idx').on(table.isPinned, table.updatedAt),
    index('memos_task_idx').on(table.relatedTaskId, table.deletedAt),
  ],
)

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
  color: text('color').notNull().default('emerald'),
  ...timestamps,
})
export const taskTags = pgTable(
  'task_tags',
  { taskId: uuid('task_id').notNull(), tagId: uuid('tag_id').notNull() },
  (table) => [
    primaryKey({ columns: [table.taskId, table.tagId] }),
    index('task_tags_tag_idx').on(table.tagId, table.taskId),
  ],
)
export const memoTags = pgTable(
  'memo_tags',
  { memoId: uuid('memo_id').notNull(), tagId: uuid('tag_id').notNull() },
  (table) => [
    primaryKey({ columns: [table.memoId, table.tagId] }),
    index('memo_tags_tag_idx').on(table.tagId, table.memoId),
  ],
)
export const reminders = pgTable(
  'reminders',
  {
    id: uuid('id').primaryKey(),
    taskId: uuid('task_id').notNull(),
    offsetMinutes: integer('offset_minutes').notNull(),
    targetDueAt: timestamp('target_due_at', { withTimezone: true, mode: 'string' }),
    notifiedAt: timestamp('notified_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [index('reminders_due_idx').on(table.targetDueAt, table.notifiedAt)],
)
export const recurrenceRules = pgTable('recurrence_rules', {
  id: uuid('id').primaryKey(),
  taskId: uuid('task_id').notNull().unique(),
  frequency: text('frequency').notNull(),
  interval: integer('interval').notNull(),
  weekdays: jsonb('weekdays').$type<number[]>(),
  monthDay: integer('month_day'),
  useMonthEnd: boolean('use_month_end').notNull().default(false),
  yearMonth: integer('year_month'),
  yearDay: integer('year_day'),
  ...timestamps,
})
export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey(),
  ownerType: text('owner_type').notNull(),
  taskId: uuid('task_id'),
  memoId: uuid('memo_id'),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  byteSize: integer('byte_size').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  sortOrder: integer('sort_order').notNull(),
  data: bytea('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
})
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
})
export const schemaMigrations = pgTable('schema_migrations', {
  version: integer('version').primaryKey(),
  name: text('name').notNull(),
  checksum: text('checksum').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true, mode: 'string' }).notNull(),
})
