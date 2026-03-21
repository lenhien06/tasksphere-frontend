"use client";

import { cn } from "@/lib/utils";

type TaskType = "task" | "bug" | "story" | "epic" | "sub_task";

interface TypeBadgeProps {
  type: TaskType;
  className?: string;
}

const TYPE_LABEL: Record<TaskType, string> = {
  task: "TASK",
  bug: "BUG",
  story: "STORY",
  epic: "EPIC",
  sub_task: "SUB-TASK",
};

export default function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] leading-none text-gray-600",
        className
      )}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}
