import { describe, expect, it } from 'vitest'
import {
  backupEnvelopeSchema,
  memoInputSchema,
  recurrenceRuleSchema,
  tagInputSchema,
  taskInputSchema,
} from '../../app/validation/schemas'

/**
 * 入力検証の詳細設計:
 * UI部品のmin/max属性は操作支援に過ぎず、復元データや将来の別UIからは回避できる。
 * そのためService層の直前で必ず同じZodスキーマを通し、DBへ不正状態を到達させない。
 */
describe('taskInputSchema', () => {
  it.each(['', '   '])('空または空白だけのタイトル「%s」を拒否する', (title) => {
    expect(taskInputSchema.safeParse({ title }).success).toBe(false)
  })

  it('前後空白を除去して有効なタイトルを返す', () => {
    const result = taskInputSchema.parse({ title: '  買い物  ' })
    expect(result.title).toBe('買い物')
    expect(result.status).toBe('todo')
  })

  it('200文字を許可し201文字を拒否する', () => {
    expect(taskInputSchema.safeParse({ title: 'あ'.repeat(200) }).success).toBe(true)
    expect(taskInputSchema.safeParse({ title: 'あ'.repeat(201) }).success).toBe(false)
  })

  it('期限が開始日時より前なら拒否する', () => {
    const result = taskInputSchema.safeParse({
      title: '逆転',
      startAt: '2026-07-13T10:00:00+09:00',
      dueAt: '2026-07-13T09:59:00+09:00',
    })
    expect(result.success).toBe(false)
  })

  it('通知があるのに期限がなければ拒否する', () => {
    expect(taskInputSchema.safeParse({ title: '通知', reminderOffsets: [60] }).success).toBe(false)
  })

  it.each([-1, 5_256_001, 1.5])('仕様外の時間値 %s を拒否する', (estimatedMinutes) => {
    expect(taskInputSchema.safeParse({ title: '時間', estimatedMinutes }).success).toBe(false)
  })

  it('自分自身を親に指定した循環を拒否する', () => {
    const same = crypto.randomUUID()
    expect(taskInputSchema.safeParse({ id: same, parentId: same, title: '循環' }).success).toBe(false)
  })

  it('定義外の状態・優先度・通知値を拒否する', () => {
    expect(taskInputSchema.safeParse({ title: '不正', status: 'unknown' }).success).toBe(false)
    expect(taskInputSchema.safeParse({ title: '不正', priority: 'critical' }).success).toBe(false)
    expect(
      taskInputSchema.safeParse({ title: '不正', dueAt: '2026-07-13T10:00:00+09:00', reminderOffsets: [30] }).success,
    ).toBe(false)
  })
})

describe('recurrenceRuleSchema', () => {
  it('週次では少なくとも1曜日を要求する', () =>
    expect(recurrenceRuleSchema.safeParse({ frequency: 'weekly', interval: 1 }).success).toBe(false))
  it('月次では月内日または月末指定を要求する', () =>
    expect(recurrenceRuleSchema.safeParse({ frequency: 'monthly', interval: 1 }).success).toBe(false))
  it('年次では月日を要求する', () =>
    expect(recurrenceRuleSchema.safeParse({ frequency: 'yearly', interval: 1, yearMonth: 4 }).success).toBe(false))
  it('月末指定の月次を許可する', () =>
    expect(recurrenceRuleSchema.safeParse({ frequency: 'monthly', interval: 1, useMonthEnd: true }).success).toBe(true))
})

describe('memoInputSchema / tagInputSchema', () => {
  it('メモ本文は100万文字を境界として検証する', () => {
    expect(memoInputSchema.safeParse({ title: 'メモ', body: 'x'.repeat(1_000_000) }).success).toBe(true)
    expect(memoInputSchema.safeParse({ title: 'メモ', body: 'x'.repeat(1_000_001) }).success).toBe(false)
  })
  it('タグは正規化前に空白除去し50文字へ制限する', () => {
    expect(tagInputSchema.parse({ name: '  仕事  ' }).name).toBe('仕事')
    expect(tagInputSchema.safeParse({ name: 'x'.repeat(51) }).success).toBe(false)
  })
})

describe('backupEnvelopeSchema', () => {
  const valid = {
    format: 'pwa-memo-backup',
    version: 1,
    exportedAt: '2026-07-13T00:00:00Z',
    tables: {
      tasks: [],
      memos: [],
      tags: [],
      task_tags: [],
      memo_tags: [],
      reminders: [],
      recurrence_rules: [],
      attachments: [],
      settings: [],
    },
  }
  it('正しい形式・版・全テーブルを受け入れる', () => expect(backupEnvelopeSchema.safeParse(valid).success).toBe(true))
  it('未知の将来版を拒否し、誤った移行による破損を防ぐ', () =>
    expect(backupEnvelopeSchema.safeParse({ ...valid, version: 2 }).success).toBe(false))
  it('必須テーブル欠落を拒否し、部分復元を開始しない', () => {
    const broken = structuredClone(valid)
    delete (broken.tables as any).tasks
    expect(backupEnvelopeSchema.safeParse(broken).success).toBe(false)
  })
})
