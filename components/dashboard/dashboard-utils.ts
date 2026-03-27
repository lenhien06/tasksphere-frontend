import {
  DashboardRecentActivityItem,
  DashboardTaskItem,
  DashboardTaskPriority,
  DashboardTaskStatus,
} from "@/app/types/dashboard.schema";
import { differenceInCalendarDays, format, isPast, isToday, parseISO } from "date-fns";
import type { TFunction } from "i18next";

export function formatDashboardDate(date: string | null, t: TFunction, variant: "full" | "short" = "full") {
  if (!date) return t("dashboard.common.noDueDate");
  try {
    return new Intl.DateTimeFormat(undefined, variant === "short"
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" }
    ).format(parseISO(date));
  } catch {
    return date;
  }
}

export function formatRelativeTimestamp(date: string) {
  try {
    const target = parseISO(date).getTime();
    const diffMs = target - Date.now();
    const diffMinutes = Math.round(diffMs / 60000);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

    if (Math.abs(diffMinutes) < 60) {
      return rtf.format(diffMinutes, "minute");
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, "hour");
    }

    const diffDays = Math.round(diffHours / 24);
    return rtf.format(diffDays, "day");
  } catch {
    return date;
  }
}

export function getTaskDueTone(task: DashboardTaskItem) {
  if (!task.dueDate) {
    return {
      kind: "none" as const,
      days: null,
      dateText: null,
      chipClass: "border-slate-200 bg-slate-100 text-slate-600",
      rowClass: "",
    };
  }

  const dueDate = parseISO(task.dueDate);
  if (task.overdue || (isPast(dueDate) && !isToday(dueDate))) {
    return {
      kind: "overdue" as const,
      days: null,
      dateText: format(task.dueDate ? parseISO(task.dueDate) : dueDate, "MMM d"),
      chipClass: "border-rose-200 bg-rose-50 text-rose-700",
      rowClass: "border-rose-200/80 bg-rose-50/70",
    };
  }

  if (isToday(dueDate)) {
    return {
      kind: "today" as const,
      days: 0,
      dateText: null,
      chipClass: "border-amber-200 bg-amber-50 text-amber-700",
      rowClass: "border-amber-200/80 bg-amber-50/70",
    };
  }

  const days = differenceInCalendarDays(dueDate, new Date());
  return {
    kind: days <= 1 ? ("tomorrow" as const) : ("upcoming" as const),
    days,
    dateText: null,
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

export function getStatusLabel(status: DashboardTaskStatus, t: TFunction) {
  return t(`task.status_${status}`, { defaultValue: status.replaceAll("_", " ") });
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

export function formatActivityAction(activity: DashboardRecentActivityItem, t: TFunction) {
  const actor = activity.actorName || t("dashboard.activity.someone");
  const action = t(`dashboard.activity.actions.${activity.action}`, {
    defaultValue: activity.action.replaceAll("_", " ").toLowerCase(),
  });
  return `${actor} ${action}`;
}

export function getInitials(name: string | null | undefined) {
  if (!name) return "TS";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "TS";
}
