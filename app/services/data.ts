import { and, desc, eq, ilike, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'
import { getDatabase } from '~/db/client'
import { attachments, memos, memoTags, recurrenceRules, reminders, tags, tasks, taskTags } from '~/db/schema'
import { nextOccurrence } from '~/utils/recurrence'
import {
  backupEnvelopeSchema,
  memoInputSchema,
  tagInputSchema,
  taskInputSchema,
  validationMessage,
} from '~/validation/schemas'
import type {
  BackupEnvelope,
  Memo,
  MemoInput,
  RecurrenceRule,
  ReminderOffset,
  RestoreMode,
  RestoreResult,
  SearchResult,
  Tag,
  Task,
  TaskInput,
  TaskQuery,
} from '~/types/domain'

const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()
const tagRow = (row: typeof tags.$inferSelect): Tag => ({
  id: row.id,
  name: row.name,
  color: row.color,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

export class DataService {
  private async tagsFor(owner: 'task' | 'memo', ownerId: string) {
    const { db } = await getDatabase()
    const link = owner === 'task' ? taskTags : memoTags
    const ownerCol = owner === 'task' ? taskTags.taskId : memoTags.memoId
    const rows = await db
      .select({ tag: tags })
      .from(link)
      .innerJoin(tags, eq(link.tagId, tags.id))
      .where(eq(ownerCol, ownerId))
    return rows.map((row) => tagRow(row.tag))
  }

  private async taskFrom(row: typeof tasks.$inferSelect): Promise<Task> {
    const { db } = await getDatabase()
    const [rule] = await db.select().from(recurrenceRules).where(eq(recurrenceRules.taskId, row.id)).limit(1)
    const reminderRows = await db.select().from(reminders).where(eq(reminders.taskId, row.id))
    return {
      id: row.id,
      seriesId: row.seriesId,
      parentId: row.parentId,
      title: row.title,
      description: row.description,
      status: row.status as Task['status'],
      priority: row.priority as Task['priority'],
      startAt: row.startAt,
      dueAt: row.dueAt,
      estimatedMinutes: row.estimatedMinutes,
      actualMinutes: row.actualMinutes,
      completedAt: row.completedAt,
      scheduledOccurrenceAt: row.scheduledOccurrenceAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      tags: await this.tagsFor('task', row.id),
      reminderOffsets: reminderRows.map((r) => r.offsetMinutes as ReminderOffset),
      recurrence: rule
        ? ({
            frequency: rule.frequency,
            interval: rule.interval,
            weekdays: rule.weekdays ?? undefined,
            monthDay: rule.monthDay ?? undefined,
            useMonthEnd: rule.useMonthEnd,
            yearMonth: rule.yearMonth ?? undefined,
            yearDay: rule.yearDay ?? undefined,
          } as RecurrenceRule)
        : null,
    }
  }

  private async memoFrom(row: typeof memos.$inferSelect): Promise<Memo> {
    return {
      id: row.id,
      relatedTaskId: row.relatedTaskId,
      title: row.title,
      body: row.body,
      isPinned: row.isPinned,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      tags: await this.tagsFor('memo', row.id),
    }
  }

  async listTasks(query: TaskQuery = {}) {
    const { db } = await getDatabase()
    const filters = [query.includeDeleted ? isNotNull(tasks.deletedAt) : isNull(tasks.deletedAt)]
    if (query.status && query.status !== 'all') filters.push(eq(tasks.status, query.status))
    if (query.priority && query.priority !== 'all') filters.push(eq(tasks.priority, query.priority))
    if (query.search?.trim())
      filters.push(
        or(ilike(tasks.title, `%${query.search.trim()}%`), ilike(tasks.description, `%${query.search.trim()}%`))!,
      )
    if (query.cursor) filters.push(lt(tasks.updatedAt, query.cursor))
    let rows = await db
      .select()
      .from(tasks)
      .where(and(...filters))
      .orderBy(desc(tasks.updatedAt), desc(tasks.id))
      .limit(Math.min(query.limit ?? 100, 100))
    if (query.tagId) {
      const tagged = await db.select({ taskId: taskTags.taskId }).from(taskTags).where(eq(taskTags.tagId, query.tagId))
      const ids = new Set(tagged.map((x) => x.taskId))
      rows = rows.filter((x) => ids.has(x.id))
    }
    return Promise.all(rows.map((row) => this.taskFrom(row)))
  }

  async getTask(taskId: string) {
    const { db } = await getDatabase()
    const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
    return row ? this.taskFrom(row) : null
  }

  async saveTask(input: TaskInput) {
    const parsed = taskInputSchema.safeParse(input)
    if (!parsed.success) throw new Error(validationMessage(parsed.error))
    input = parsed.data
    const title = input.title
    const { db } = await getDatabase()
    const stamp = now()
    const taskId = input.id ?? id()
    let becameDone = false
    await db.transaction(async (tx) => {
      const [current] = input.id ? await tx.select().from(tasks).where(eq(tasks.id, input.id)).limit(1) : []
      if (input.parentId) {
        const [parent] = await tx.select().from(tasks).where(eq(tasks.id, input.parentId)).limit(1)
        if (!parent || parent.parentId || parent.deletedAt || parent.id === taskId)
          throw new Error('親タスクにはルートタスクだけを指定できます')
      }
      becameDone = input.status === 'done' && current?.status !== 'done'
      const values = {
        parentId: input.parentId ?? null,
        title,
        description: input.description ?? '',
        status: input.status ?? 'todo',
        priority: input.priority ?? null,
        startAt: input.startAt ?? null,
        dueAt: input.dueAt ?? null,
        estimatedMinutes: input.estimatedMinutes ?? 0,
        actualMinutes: input.actualMinutes ?? 0,
        completedAt: input.status === 'done' ? stamp : null,
        updatedAt: stamp,
      }
      if (current) await tx.update(tasks).set(values).where(eq(tasks.id, taskId))
      else
        await tx.insert(tasks).values({
          id: taskId,
          seriesId: null,
          scheduledOccurrenceAt: null,
          createdAt: stamp,
          deletedAt: null,
          ...values,
        })
      await tx.delete(taskTags).where(eq(taskTags.taskId, taskId))
      if (input.tagIds?.length)
        await tx.insert(taskTags).values(input.tagIds.slice(0, 50).map((tagId) => ({ taskId, tagId })))
      await tx.delete(reminders).where(eq(reminders.taskId, taskId))
      if (input.dueAt && input.reminderOffsets?.length)
        await tx.insert(reminders).values(
          input.reminderOffsets.map((offset) => ({
            id: id(),
            taskId,
            offsetMinutes: offset,
            targetDueAt: new Date(new Date(input.dueAt!).getTime() - offset * 60000).toISOString(),
            notifiedAt: null,
            createdAt: stamp,
          })),
        )
      await tx.delete(recurrenceRules).where(eq(recurrenceRules.taskId, taskId))
      if (input.recurrence)
        await tx.insert(recurrenceRules).values({
          id: id(),
          taskId,
          frequency: input.recurrence.frequency,
          interval: input.recurrence.interval,
          weekdays: input.recurrence.weekdays ?? null,
          monthDay: input.recurrence.monthDay ?? null,
          useMonthEnd: input.recurrence.useMonthEnd ?? false,
          yearMonth: input.recurrence.yearMonth ?? null,
          yearDay: input.recurrence.yearDay ?? null,
          createdAt: stamp,
          updatedAt: stamp,
        })
    })
    if (becameDone) await this.createNextOccurrence(taskId)
    return (await this.getTask(taskId))!
  }

  private async createNextOccurrence(taskId: string) {
    const task = await this.getTask(taskId)
    if (!task?.recurrence || (!task.dueAt && !task.startAt)) return
    const base = new Date(task.dueAt ?? task.startAt!)
    const next = nextOccurrence(base, task.recurrence)
    const delta = next.getTime() - base.getTime()
    const seriesId = task.seriesId ?? task.id
    const { db } = await getDatabase()
    const stamp = now()
    const nextId = id()
    try {
      await db.transaction(async (tx) => {
        await tx.update(tasks).set({ seriesId }).where(eq(tasks.id, taskId))
        await tx.insert(tasks).values({
          id: nextId,
          seriesId,
          parentId: task.parentId,
          title: task.title,
          description: task.description,
          status: 'todo',
          priority: task.priority,
          startAt: task.startAt ? new Date(new Date(task.startAt).getTime() + delta).toISOString() : null,
          dueAt: task.dueAt ? next.toISOString() : null,
          estimatedMinutes: task.estimatedMinutes,
          actualMinutes: 0,
          completedAt: null,
          scheduledOccurrenceAt: next.toISOString(),
          createdAt: stamp,
          updatedAt: stamp,
          deletedAt: null,
        })
        if (task.tags.length)
          await tx.insert(taskTags).values(task.tags.map((tag) => ({ taskId: nextId, tagId: tag.id })))
        await tx.insert(recurrenceRules).values({
          id: id(),
          taskId: nextId,
          frequency: task.recurrence!.frequency,
          interval: task.recurrence!.interval,
          weekdays: task.recurrence!.weekdays ?? null,
          monthDay: task.recurrence!.monthDay ?? null,
          useMonthEnd: task.recurrence!.useMonthEnd ?? false,
          yearMonth: task.recurrence!.yearMonth ?? null,
          yearDay: task.recurrence!.yearDay ?? null,
          createdAt: stamp,
          updatedAt: stamp,
        })
      })
    } catch (error: any) {
      if (!String(error?.message).includes('tasks_occurrence_idx')) throw error
    }
  }

  async moveTaskToTrash(taskId: string) {
    const { db } = await getDatabase()
    const stamp = now()
    await db.transaction(async (tx) => {
      await tx
        .update(tasks)
        .set({ deletedAt: stamp, updatedAt: stamp })
        .where(or(eq(tasks.id, taskId), eq(tasks.parentId, taskId)))
    })
  }
  async restoreTask(taskId: string) {
    const { db } = await getDatabase()
    await db
      .update(tasks)
      .set({ deletedAt: null, updatedAt: now() })
      .where(or(eq(tasks.id, taskId), eq(tasks.parentId, taskId)))
  }
  async deleteTaskPermanently(taskId: string) {
    const { db } = await getDatabase()
    await db.transaction(async (tx) => {
      await tx.delete(tasks).where(eq(tasks.parentId, taskId))
      await tx.delete(tasks).where(eq(tasks.id, taskId))
    })
  }

  async listMemos(includeDeleted = false) {
    const { db } = await getDatabase()
    const rows = await db
      .select()
      .from(memos)
      .where(includeDeleted ? isNotNull(memos.deletedAt) : isNull(memos.deletedAt))
      .orderBy(desc(memos.isPinned), desc(memos.updatedAt))
      .limit(100)
    return Promise.all(rows.map((row) => this.memoFrom(row)))
  }
  async getMemo(memoId: string) {
    const { db } = await getDatabase()
    const [row] = await db.select().from(memos).where(eq(memos.id, memoId)).limit(1)
    return row ? this.memoFrom(row) : null
  }
  async saveMemo(input: MemoInput) {
    const parsed = memoInputSchema.safeParse(input)
    if (!parsed.success) throw new Error(validationMessage(parsed.error))
    input = parsed.data
    const title = input.title
    const { db } = await getDatabase()
    const memoId = input.id ?? id()
    const stamp = now()
    await db.transaction(async (tx) => {
      const [current] = input.id ? await tx.select().from(memos).where(eq(memos.id, input.id)).limit(1) : []
      const values = {
        title,
        body: input.body ?? '',
        relatedTaskId: input.relatedTaskId ?? null,
        isPinned: input.isPinned ?? false,
        updatedAt: stamp,
      }
      if (current) await tx.update(memos).set(values).where(eq(memos.id, memoId))
      else await tx.insert(memos).values({ id: memoId, ...values, createdAt: stamp, deletedAt: null })
      await tx.delete(memoTags).where(eq(memoTags.memoId, memoId))
      if (input.tagIds?.length)
        await tx.insert(memoTags).values(input.tagIds.slice(0, 50).map((tagId) => ({ memoId, tagId })))
    })
    return (await this.getMemo(memoId))!
  }
  async moveMemoToTrash(memoId: string) {
    const { db } = await getDatabase()
    await db.update(memos).set({ deletedAt: now(), updatedAt: now() }).where(eq(memos.id, memoId))
  }
  async restoreMemo(memoId: string) {
    const { db } = await getDatabase()
    await db.update(memos).set({ deletedAt: null, updatedAt: now() }).where(eq(memos.id, memoId))
  }
  async deleteMemoPermanently(memoId: string) {
    const { db } = await getDatabase()
    await db.delete(memos).where(eq(memos.id, memoId))
  }

  async listTags() {
    const { db } = await getDatabase()
    return (await db.select().from(tags).orderBy(tags.normalizedName)).map(tagRow)
  }
  async saveTag(name: string, color = 'emerald', tagId?: string) {
    const parsed = tagInputSchema.safeParse({ name, color })
    if (!parsed.success) throw new Error(validationMessage(parsed.error))
    const { name: clean, color: safeColor } = parsed.data
    const { db } = await getDatabase()
    const stamp = now()
    if (tagId)
      await db
        .update(tags)
        .set({ name: clean, normalizedName: clean.toLocaleLowerCase('ja'), color: safeColor, updatedAt: stamp })
        .where(eq(tags.id, tagId))
    else
      await db.insert(tags).values({
        id: id(),
        name: clean,
        normalizedName: clean.toLocaleLowerCase('ja'),
        color: safeColor,
        createdAt: stamp,
        updatedAt: stamp,
      })
    return this.listTags()
  }
  async deleteTag(tagId: string) {
    const { db } = await getDatabase()
    await db.delete(tags).where(eq(tags.id, tagId))
  }

  async search(term: string): Promise<SearchResult> {
    const q = term.trim()
    if (!q) return { tasks: [], memos: [] }
    const { db } = await getDatabase()
    const taskRows = await db
      .select()
      .from(tasks)
      .where(and(isNull(tasks.deletedAt), or(ilike(tasks.title, `%${q}%`), ilike(tasks.description, `%${q}%`))))
      .orderBy(desc(tasks.updatedAt))
      .limit(50)
    const memoRows = await db
      .select()
      .from(memos)
      .where(and(isNull(memos.deletedAt), or(ilike(memos.title, `%${q}%`), ilike(memos.body, `%${q}%`))))
      .orderBy(desc(memos.updatedAt))
      .limit(50)
    return {
      tasks: await Promise.all(taskRows.map((row) => this.taskFrom(row))),
      memos: await Promise.all(memoRows.map((row) => this.memoFrom(row))),
    }
  }

  async dueReminders() {
    const { db } = await getDatabase()
    return db
      .select({ reminder: reminders, task: tasks })
      .from(reminders)
      .innerJoin(tasks, eq(reminders.taskId, tasks.id))
      .where(
        and(
          isNull(reminders.notifiedAt),
          isNull(tasks.deletedAt),
          sql`${reminders.targetDueAt} <= now()`,
          sql`${tasks.status} <> 'done'`,
        ),
      )
  }
  async markReminderSent(reminderId: string) {
    const { db } = await getDatabase()
    await db.update(reminders).set({ notifiedAt: now() }).where(eq(reminders.id, reminderId))
  }

  async addAttachment(
    owner: 'task' | 'memo',
    ownerId: string,
    file: { fileName: string; data: Uint8Array; width: number; height: number },
  ) {
    if (file.data.byteLength > 2 * 1024 * 1024) throw new Error('画像は2MB以下にしてください')
    const { db } = await getDatabase()
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(attachments)
      .where(owner === 'task' ? eq(attachments.taskId, ownerId) : eq(attachments.memoId, ownerId))
    if (Number(countRows[0]?.count ?? 0) >= 10) throw new Error('画像は10枚までです')
    await db.insert(attachments).values({
      id: id(),
      ownerType: owner,
      taskId: owner === 'task' ? ownerId : null,
      memoId: owner === 'memo' ? ownerId : null,
      fileName: file.fileName,
      mimeType: 'image/webp',
      byteSize: file.data.byteLength,
      width: file.width,
      height: file.height,
      sortOrder: Number(countRows[0]?.count ?? 0),
      data: file.data,
      createdAt: now(),
    })
  }
  async listAttachments(owner: 'task' | 'memo', ownerId: string) {
    const { db } = await getDatabase()
    return db
      .select()
      .from(attachments)
      .where(owner === 'task' ? eq(attachments.taskId, ownerId) : eq(attachments.memoId, ownerId))
      .orderBy(attachments.sortOrder)
  }
  async deleteAttachment(attachmentId: string) {
    const { db } = await getDatabase()
    await db.delete(attachments).where(eq(attachments.id, attachmentId))
  }

  async exportBackup(): Promise<BackupEnvelope> {
    const { client } = await getDatabase()
    const names = [
      'tasks',
      'memos',
      'tags',
      'task_tags',
      'memo_tags',
      'reminders',
      'recurrence_rules',
      'attachments',
      'settings',
    ]
    const tables: Record<string, unknown[]> = {}
    for (const name of names) {
      const result = await client.query(`SELECT * FROM ${name}`)
      tables[name] = result.rows.map((row: any) => {
        if (name === 'attachments' && row.data instanceof Uint8Array)
          return { ...row, data: btoa(String.fromCharCode(...row.data)) }
        return row
      })
    }
    return { format: 'pwa-memo-backup', version: 1, exportedAt: now(), tables }
  }
  async restoreBackup(backup: BackupEnvelope, mode: RestoreMode): Promise<RestoreResult> {
    const parsed = backupEnvelopeSchema.safeParse(backup)
    if (!parsed.success) throw new Error(`対応していないバックアップです: ${validationMessage(parsed.error)}`)
    backup = parsed.data
    const { client } = await getDatabase()
    let inserted = 0
    const updated = 0
    let skipped = 0
    await client.transaction(async (tx) => {
      const order = [
        'task_tags',
        'memo_tags',
        'reminders',
        'recurrence_rules',
        'attachments',
        'memos',
        'tasks',
        'tags',
        'settings',
      ]
      if (mode === 'replace') for (const name of order) await tx.exec(`DELETE FROM ${name}`)
      const insertOrder = [
        'tags',
        'tasks',
        'memos',
        'task_tags',
        'memo_tags',
        'reminders',
        'recurrence_rules',
        'attachments',
        'settings',
      ]
      for (const name of insertOrder)
        for (const raw of backup.tables[name] ?? []) {
          const row: any = { ...(raw as any) }
          if (name === 'attachments' && typeof row.data === 'string')
            row.data = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0))
          const columns = Object.keys(row)
          const values = Object.values(row)
          const placeholders = columns.map((_, index) => `$${index + 1}`).join(',')
          let conflict = 'NOTHING'
          if (mode === 'merge' && columns.includes('updated_at'))
            conflict = `UPDATE SET ${columns
              .filter((c) => c !== 'id')
              .map((c) => `${c}=EXCLUDED.${c}`)
              .join(',')} WHERE EXCLUDED.updated_at > ${name}.updated_at`
          const result = await tx.query(
            `INSERT INTO ${name} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT DO ${conflict}`,
            values,
          )
          if (result.affectedRows) inserted += result.affectedRows
          else skipped++
        }
    })
    return { inserted, updated, skipped }
  }
}
