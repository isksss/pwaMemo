import { addDays, addMonths, addWeeks, addYears, endOfMonth, getDay, setDate, setMonth } from 'date-fns'
import type { RecurrenceRule } from '~/types/domain'

export function nextOccurrence(base: Date, rule: RecurrenceRule, now = new Date()) {
  let next = new Date(base)
  const advance = () => {
    if (rule.frequency === 'daily') next = addDays(next, rule.interval)
    if (rule.frequency === 'weekly') next = addWeeks(next, rule.interval)
    if (rule.frequency === 'monthly') next = addMonths(next, rule.interval)
    if (rule.frequency === 'yearly') next = addYears(next, rule.interval)
    if (rule.frequency === 'monthly')
      next = rule.useMonthEnd
        ? endOfMonth(next)
        : setDate(next, Math.min(rule.monthDay ?? base.getDate(), endOfMonth(next).getDate()))
    if (rule.frequency === 'yearly' && rule.yearMonth) next = setMonth(next, rule.yearMonth - 1)
  }
  advance()
  if (rule.frequency === 'weekly' && rule.weekdays?.length) {
    while (!rule.weekdays.includes(getDay(next))) next = addDays(next, 1)
  }
  while (next <= now) advance()
  return next
}
