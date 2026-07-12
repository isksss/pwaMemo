import { describe, expect, it } from 'vitest'
import { nextOccurrence } from '../../app/utils/recurrence'

/**
 * 繰り返し計算の詳細設計:
 * 次回日は「完了した日時」ではなく「元の予定日時」を基準にする。
 * これを単体テストに固定する理由は、遅延完了のたびに周期が後ろへずれると、
 * 毎朝・毎月末など利用者が意図した予定を長期的に維持できなくなるためである。
 */
describe('nextOccurrence', () => {
  it('遅れて完了しても元の時刻を保ち、現在より未来の最初の日次回を返す', () => {
    const result = nextOccurrence(
      new Date('2026-01-01T09:00:00Z'),
      { frequency: 'daily', interval: 1 },
      new Date('2026-01-03T10:00:00Z'),
    )
    expect(result.toISOString()).toBe('2026-01-04T09:00:00.000Z')
  })

  it('間隔が2の週次では2週間単位で進める', () => {
    const result = nextOccurrence(
      new Date('2026-01-05T09:00:00Z'),
      { frequency: 'weekly', interval: 2 },
      new Date('2026-01-05T10:00:00Z'),
    )
    expect(result.toISOString()).toBe('2026-01-19T09:00:00.000Z')
  })

  it('週次の曜日指定では指定曜日に到達するまで日単位で進める', () => {
    const result = nextOccurrence(
      new Date('2026-01-05T09:00:00Z'),
      { frequency: 'weekly', interval: 1, weekdays: [3] },
      new Date('2026-01-05T10:00:00Z'),
    )
    expect(result.getUTCDay()).toBe(3)
  })

  it('存在しない月内日は月末へ丸め、月を跨いで日付をあふれさせない', () => {
    const result = nextOccurrence(
      new Date('2026-01-31T09:00:00Z'),
      { frequency: 'monthly', interval: 1, monthDay: 31 },
      new Date('2026-01-31T10:00:00Z'),
    )
    expect(result.toISOString()).toContain('2026-02-28')
  })

  it('月末指定は各月の日数に応じた末日を返す', () => {
    const result = nextOccurrence(
      new Date('2028-01-31T09:00:00Z'),
      { frequency: 'monthly', interval: 1, useMonthEnd: true },
      new Date('2028-01-31T10:00:00Z'),
    )
    expect(result.toISOString()).toContain('2028-02-29')
  })

  it('年次では年の間隔を維持する', () => {
    const result = nextOccurrence(
      new Date('2026-04-01T09:00:00Z'),
      { frequency: 'yearly', interval: 2, yearMonth: 4, yearDay: 1 },
      new Date('2026-04-02T09:00:00Z'),
    )
    expect(result.getUTCFullYear()).toBe(2028)
  })
})
