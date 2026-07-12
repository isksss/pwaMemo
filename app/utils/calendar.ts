import { format } from 'date-fns'

/**
 * datetime-localへ渡す値はUTCへ変換せず、利用端末のローカル日付を維持する。
 * ISO文字列化するとタイムゾーン差で前日・翌日になるため、date-fnsで各要素を直接整形する。
 */
export function calendarTaskStartAt(day: Date): string {
  return `${format(day, 'yyyy-MM-dd')}T09:00`
}
