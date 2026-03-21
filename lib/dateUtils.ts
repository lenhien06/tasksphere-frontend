import { format, isToday, isYesterday, isThisWeek, differenceInCalendarWeeks } from 'date-fns'
import { enUS } from 'date-fns/locale'

export function formatMessageTimestamp(timestamp: string | number | Date): string {
  const messageDate = new Date(timestamp)
  const now = new Date()

  if (isToday(messageDate)) {
    return `Today, ${format(messageDate, 'p', { locale: enUS })}`
  }

  if (isYesterday(messageDate)) {
    return `Yesterday, ${format(messageDate, 'p', { locale: enUS })}`
  }

  if (isThisWeek(messageDate, { weekStartsOn: 1 })) {
    return format(messageDate, 'eeee, p', { locale: enUS })
  }

  if (differenceInCalendarWeeks(now, messageDate, { weekStartsOn: 1 }) === 1) {
    return `Last week, ${format(messageDate, 'eeee, p', { locale: enUS })}`
  }

  return format(messageDate, 'P p', { locale: enUS })
}
