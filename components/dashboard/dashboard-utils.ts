import {
  DashboardRecentActivityItem,
  DashboardTaskItem,
  DashboardTaskPriority,
  DashboardTaskStatus,
} from "@/app/types/dashboard.schema";
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isPast,
  isToday,
  parseISO,
} from "date-fns";

export function formatDashboardDate(date: string | null, pattern = "MMM d, yyyy") {
  if (!date) return "No due date";
  try {
    return format(parseISO(date), pattern);
  } catch {
    return date;
  }
}

export function formatRelativeTimestamp(date: string) {
  try {
    return formatDistanceToNowStrict(parseISO(date), { addSuffix: true });
  } catch {
    return date;
  }
}

export function getTaskDueTone(task: DashboardTaskItem) {
  if (!task.dueDate) {
    return {
      label: "No due date",
      chipClass: "border-slate-200 bg-slate-100 text-slate-600",
      rowClass: "",
    };
  }

  const dueDate = parseISO(task.dueDate);
  if (task.overdue || (isPast(dueDate) && !isToday(dueDate))) {
    return {
      label: `Overdue • ${formatDashboardDate(task.dueDate, "MMM d")}`,
      chipClass: "border-rose-200 bg-rose-50 text-rose-700",
      rowClass: "border-rose-200/80 bg-rose-50/70",
    };
  }

  if (isToday(dueDate)) {
    return {
      label: "Due today",
      chipClass: "border-amber-200 bg-amber-50 text-amber-700",
      rowClass: "border-amber-200/80 bg-amber-50/70",
    };
  }

  const days = differenceInCalendarDays(dueDate, new Date());
  return {
    label: days <= 1 ? "Due tomorrow" : `Due in ${days} days`,
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
    rowClass: "",
  };
}

export function sortTasksByUrgency(tasks: DashboardTaskItem[]) {
  return [...tasks].sort((a, b) => {
    const aWeight = a.overdue ? 0 : a.dueDate && isToday(parseISO(a.dueDate)) ? 1 : 2;
    const bWeight = b.overdue ? 0 : b.dueDate && isToday(parseISO(b.dueDate)) ? 1 : 2;
    if (aWeight !== bWeight) return aWeight - bWeight;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
  });
}

export function getStatusLabel(status: DashboardTaskStatus) {
  switch (status) {
    case "IN_PROGRESS":
      return "In Progress";
    case "IN_REVIEW":
      return "In Review";
    default:
      return status.replaceAll("_", " ");
  }
}

export function getStatusClass(status: DashboardTaskStatus) {
  switch (status) {
    case "DONE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "IN_PROGRESS":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "IN_REVIEW":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "CANCELLED":
      return "border-slate-200 bg-slate-100 text-slate-500";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export function getPriorityClass(priority: DashboardTaskPriority) {
  switch (priority) {
    case "CRITICAL":
      return "text-rose-600";
    case "HIGH":
      return "text-orange-600";
    case "MEDIUM":
      return "text-amber-600";
    default:
      return "text-emerald-600";
  }
}

export function formatActivityAction(activity: DashboardRecentActivityItem) {
  const actor = activity.actorName || "Someone";
  const action = activity.action.replaceAll("_", " ").toLowerCase();
  return `${actor} ${action}`;
}

export function getActivityChangeSummary(activity: DashboardRecentActivityItem) {
  const oldValue = parseJsonRecord(activity.oldValues);
  const newValue = parseJsonRecord(activity.newValues);

  if (oldValue?.status || newValue?.status) {
    return `${oldValue?.status ?? "Unknown"} -> ${newValue?.status ?? "Unknown"}`;
  }

  if (oldValue?.priority || newValue?.priority) {
    return `${oldValue?.priority ?? "Unknown"} -> ${newValue?.priority ?? "Unknown"}`;
  }

  return null;
}

export function getInitials(name: string | null | undefined) {
  if (!name) return "TS";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "TS";
}

function parseJsonRecord(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, string>) : null;
  } catch {
    return null;
  }
}
