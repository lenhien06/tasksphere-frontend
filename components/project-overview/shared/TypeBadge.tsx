"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type TaskType = "task" | "bug" | "story" | "epic" | "sub_task";

interface TypeBadgeProps {
  type: TaskType;
  className?: string;
}

const TYPE_STYLES: Record<TaskType, string> = {
  task: "border-blue-200 text-blue-600 bg-blue-50",
  bug: "border-red-200 text-red-600 bg-red-50",
  story: "border-purple-200 text-purple-600 bg-purple-50",
  epic: "border-orange-200 text-orange-600 bg-orange-50",
  sub_task: "border-gray-200 text-gray-500 bg-gray-50",
};

export default function TypeBadge({ type, className }: TypeBadgeProps) {
  const { t } = useTranslation();
  const TYPE_LABEL_KEY: Record<TaskType, string> = {
    task: "task.type_TASK",
    bug: "task.type_BUG",
    story: "task.type_STORY",
    epic: "task.type_EPIC",
    sub_task: "task.type_SUB_TASK",
  };

  return (
    <span
      className={cn(
        "text-[10px] font-mono px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide",
        TYPE_STYLES[type],
        className
      )}
    >
      {t(TYPE_LABEL_KEY[type], { defaultValue: type.replace("_", "-") })}
    </span>
  );
}
