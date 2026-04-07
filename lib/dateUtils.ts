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

/**
 * Calculate hours remaining until expiration (for invites, etc.)
 * Returns { hours, minutes, isExpired }
 */
export function calculateHoursRemaining(expiresAt: string | null | undefined): {
  hours: number;
  minutes: number;
  isExpired: boolean;
  display: string;
} | null {
  if (!expiresAt) return null;

  const now = new Date();
  const expiration = new Date(expiresAt);
  const diffMs = expiration.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      hours: 0,
      minutes: 0,
      isExpired: true,
      display: "🔴 Hết hạn",
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Format display: "3h 25m" or "45m"
  let display = "";
  if (hours > 0) {
    display = `${hours}h`;
    if (minutes > 0) {
      display += ` ${minutes}m`;
    }
  } else {
    display = `${minutes}m`;
  }

  return {
    hours,
    minutes: minutes,
    isExpired: false,
    display: `(còn ${display})`,
  };
}

/**
 * Sprint Timeline Validation Utilities
 */

export interface SprintValidationError {
  code: "SPRINT_BEFORE_PROJECT_START" | "SPRINT_AFTER_PROJECT_END" | "SPRINT_OVERLAP" | "SPRINT_INVALID_DATES" | null;
  message: string;
}

/**
 * Validate that sprint dates are within project bounds
 * @returns error object or null if valid
 */
export function validateSprintDatesWithinProject(
  sprintStart: string,
  sprintEnd: string,
  projectStart: string | null,
  projectEnd: string | null
): SprintValidationError | null {
  // Validate sprint dates themselves
  if (!sprintStart || !sprintEnd) {
    return null; // Handled elsewhere
  }

  const sprintStartDate = new Date(sprintStart);
  const sprintEndDate = new Date(sprintEnd);

  if (sprintEndDate < sprintStartDate) {
    return {
      code: "SPRINT_INVALID_DATES",
      message: "Sprint end date must be after start date",
    };
  }

  // If no project boundaries, validation passes
  if (!projectStart || !projectEnd) {
    return null;
  }

  const projectStartDate = new Date(projectStart);
  const projectEndDate = new Date(projectEnd);

  // Check if sprint is before project start
  if (sprintStartDate < projectStartDate) {
    return {
      code: "SPRINT_BEFORE_PROJECT_START",
      message: `Sprint cannot start before project start date (${projectStart})`,
    };
  }

  // Check if sprint is after project end
  if (sprintEndDate > projectEndDate) {
    return {
      code: "SPRINT_AFTER_PROJECT_END",
      message: `Sprint cannot end after project end date (${projectEnd})`,
    };
  }

  return null;
}

export interface SprintDetail {
  id: string;
  startDate: string;
  endDate: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  name: string;
}

/**
 * Check if new sprint overlaps with existing sprints
 * Excludes the sprint being edited (if providedExistingSprintId)
 * @returns error object or null if no overlap
 */
export function checkSprintOverlap(
  newSprintStart: string,
  newSprintEnd: string,
  existingSprints: SprintDetail[],
  existingSprintIdToExclude?: string
): SprintValidationError | null {
  const newStart = new Date(newSprintStart);
  const newEnd = new Date(newSprintEnd);

  for (const existing of existingSprints) {
    // Skip the sprint being edited
    if (existingSprintIdToExclude && existing.id === existingSprintIdToExclude) {
      continue;
    }

    // Skip completed sprints
    if (existing.status === "COMPLETED") {
      continue;
    }

    const existingStart = new Date(existing.startDate);
    const existingEnd = new Date(existing.endDate);

    // Check for overlap: new sprint starts before existing ends AND new sprint ends after existing starts
    if (newStart <= existingEnd && newEnd >= existingStart) {
      return {
        code: "SPRINT_OVERLAP",
        message: `Sprint overlaps with existing sprint "${existing.name}" (${existing.startDate} to ${existing.endDate})`,
      };
    }
  }

  return null;
}

/**
 * Check if an active sprint already exists
 * @returns the active sprint if found, null otherwise
 */
export function detectActiveSprintConflict(sprints: SprintDetail[]): SprintDetail | null {
  return sprints.find((s) => s.status === "ACTIVE") ?? null;
}
