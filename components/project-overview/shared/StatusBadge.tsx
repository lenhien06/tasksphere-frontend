"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "in_review" | "testing" | "done" | "cancelled";

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-50 text-blue-700",
  in_review: "bg-purple-50 text-purple-700",
  testing: "bg-purple-100 text-purple-700",
  done: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  const STATUS_LABEL_KEY: Record<TaskStatus, string> = {
    todo: "task.status_TODO",
    in_progress: "task.status_IN_PROGRESS",
    in_review: "task.status_IN_REVIEW",
    testing: "task.status_TESTING",
    done: "task.status_DONE",
    cancelled: "task.status_CANCELLED",
  };

  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide", STATUS_STYLES[status], className)}>
      {t(STATUS_LABEL_KEY[status], { defaultValue: status.replace("_", " ") })}
    </span>
  );
}
