"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type TaskPriority = "critical" | "high" | "medium" | "low";

interface PriorityDotProps {
  priority: TaskPriority;
  className?: string;
}

const PRIORITY_MAP: Record<TaskPriority, { labelKey: string; color: string }> = {
  critical: { labelKey: "task.priority_CRITICAL", color: "#EF4444" },
  high: { labelKey: "task.priority_HIGH", color: "#F97316" },
  medium: { labelKey: "task.priority_MEDIUM", color: "#F59E0B" },
  low: { labelKey: "task.priority_LOW", color: "#6B7280" },
};

export default function PriorityDot({ priority, className }: PriorityDotProps) {
  const { t } = useTranslation();
  const cfg = PRIORITY_MAP[priority];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-gray-500", className)}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.color }} />
      <span>{t(cfg.labelKey, { defaultValue: priority })}</span>
    </span>
  );
}
