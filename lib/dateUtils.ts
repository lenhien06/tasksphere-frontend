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

/**
 * Calculate days remaining until due date
 */
export function getDaysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null
  
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Format days remaining as human-readable string
 */
export function formatDaysUntilDue(dueDate: string | null, isOverdue: boolean): string {
  if (isOverdue) return "🔴 Overdue"
  
  const days = getDaysUntilDue(dueDate)
  if (days === null) return "—"
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days < 0) return "🔴 Overdue"
  
  return `${days}d`
}

/**
 * Get urgency color for days remaining
 */
export function getUrgencyColor(daysUntilDue: number | null, isOverdue: boolean): string {
  if (isOverdue) return "text-red-600 bg-red-50"
  if (daysUntilDue === null) return "text-gray-400"
  if (daysUntilDue === 0) return "text-orange-600 bg-orange-50"
  if (daysUntilDue === 1) return "text-orange-600 bg-orange-50"
  if (daysUntilDue <= 3) return "text-yellow-600 bg-yellow-50"
  return "text-green-600 bg-green-50"
}
