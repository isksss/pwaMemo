import { z } from 'zod'
import { TASK_PRIORITIES, TASK_STATUSES } from '~/types/domain'

const nullableDateTime = z.iso.datetime({ offset: true }).nullable().optional()

export const recurrenceRuleSchema = z
  .object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.coerce.number().int().min(1).max(999),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    monthDay: z.number().int().min(1).max(31).optional(),
    useMonthEnd: z.boolean().optional(),
    yearMonth: z.number().int().min(1).max(12).optional(),
    yearDay: z.number().int().min(1).max(31).optional(),
  })
  .superRefine((rule, context) => {
    if (rule.frequency === 'weekly' && !rule.weekdays?.length)
      context.addIssue({ code: 'custom', path: ['weekdays'], message: '週次では曜日を1つ以上指定してください' })
    if (rule.frequency === 'monthly' && !rule.useMonthEnd && !rule.monthDay)
      context.addIssue({ code: 'custom', path: ['monthDay'], message: '月次では日または月末を指定してください' })
    if (rule.frequency === 'yearly' && (!rule.yearMonth || !rule.yearDay))
      context.addIssue({ code: 'custom', path: ['yearMonth'], message: '年次では月日を指定してください' })
  })

export const taskInputSchema = z
  .object({
    id: z.uuid().optional(),
    parentId: z.uuid().nullable().optional(),
    title: z.string().trim().min(1, 'タイトルを入力してください').max(200, 'タイトルは200文字以内です'),
    description: z.string().max(100_000).default(''),
    status: z.enum(TASK_STATUSES).default('todo'),
    priority: z.enum(TASK_PRIORITIES).nullable().default(null),
    startAt: nullableDateTime,
    dueAt: nullableDateTime,
    estimatedMinutes: z.coerce.number().int().min(0).max(5_256_000).default(0),
    actualMinutes: z.coerce.number().int().min(0).max(5_256_000).default(0),
    tagIds: z.array(z.uuid()).max(50).default([]),
    reminderOffsets: z
      .array(z.union([z.literal(0), z.literal(5), z.literal(60), z.literal(1440)]))
      .max(4)
      .default([]),
    recurrence: recurrenceRuleSchema.nullable().default(null),
  })
  .superRefine((task, context) => {
    if (task.startAt && task.dueAt && new Date(task.dueAt) < new Date(task.startAt))
      context.addIssue({ code: 'custom', path: ['dueAt'], message: '期限は開始日時以降にしてください' })
    if (task.reminderOffsets.length && !task.dueAt)
      context.addIssue({ code: 'custom', path: ['reminderOffsets'], message: '通知には期限日時が必要です' })
    if (task.id && task.parentId === task.id)
      context.addIssue({ code: 'custom', path: ['parentId'], message: '自分自身を親タスクにできません' })
  })

export const memoInputSchema = z.object({
  id: z.uuid().optional(),
  relatedTaskId: z.uuid().nullable().optional(),
  title: z.string().trim().min(1, 'タイトルを入力してください').max(200, 'タイトルは200文字以内です'),
  body: z.string().max(1_000_000).default(''),
  isPinned: z.boolean().default(false),
  tagIds: z.array(z.uuid()).max(50).default([]),
})

export const tagInputSchema = z.object({
  name: z.string().trim().min(1, 'タグ名を入力してください').max(50, 'タグ名は50文字以内です'),
  color: z.enum(['emerald', 'blue', 'amber', 'red', 'violet']).default('emerald'),
})

const backupRowSchema = z.record(z.string(), z.unknown())
export const backupEnvelopeSchema = z.object({
  format: z.literal('pwa-memo-backup'),
  version: z.literal(1),
  exportedAt: z.iso.datetime({ offset: true }),
  tables: z.object({
    tasks: z.array(backupRowSchema),
    memos: z.array(backupRowSchema),
    tags: z.array(backupRowSchema),
    task_tags: z.array(backupRowSchema),
    memo_tags: z.array(backupRowSchema),
    reminders: z.array(backupRowSchema),
    recurrence_rules: z.array(backupRowSchema),
    attachments: z.array(backupRowSchema),
    settings: z.array(backupRowSchema),
  }),
})

export function validationMessage(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join('、')
}
