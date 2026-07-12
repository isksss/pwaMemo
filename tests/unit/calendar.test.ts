import { describe, expect, it } from 'vitest'
import { calendarTaskStartAt } from '~/utils/calendar'

/**
 * カレンダー起点タスクの日時初期値に関する詳細設計:
 * UTC変換を行わず、利用者がクリックしたローカル暦日の09:00をdatetime-local形式で返す。
 * 月末・年末でも日付が繰り上がらないことを境界値として固定する。
 */
describe('calendarTaskStartAt', () => {
  it.each([
    [new Date(2026, 6, 13), '2026-07-13T09:00'],
    [new Date(2026, 6, 31), '2026-07-31T09:00'],
    [new Date(2026, 11, 31), '2026-12-31T09:00'],
  ])('%sを同じローカル日付の09:00へ変換する', (day, expected) => {
    expect(calendarTaskStartAt(day)).toBe(expected)
  })
})
