"use client";

import { cn } from "@/lib/utils";

export type Priority = "critical" | "high" | "medium" | "low";

interface PriorityDotProps {
  priority: Priority;
  className?: string;
}

const PRIORITY_STYLES: Record<Priority, { dot: string; text: string; border: string }> = {
  critical: { dot: "bg-red-500", text: "text-red-600", border: "border-l-4 border-l-red-500" },
  high: { dot: "bg-orange-500", text: "text-orange-600", border: "border-l-4 border-l-orange-500" },
  medium: { dot: "bg-amber-500", text: "text-amber-600", border: "border-l-2 border-l-amber-500" },
  low: { dot: "bg-gray-400", text: "text-gray-500", border: "border-l-2 border-l-gray-300" },
};

const LABEL_MAP: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function getPriorityBorder(priority: Priority): string {
  return PRIORITY_STYLES[priority].border;
}

export default function PriorityDot({ priority, className }: PriorityDotProps) {
  const style = PRIORITY_STYLES[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", style.text, className)}>
      <span className={cn("h-2 w-2 rounded-full", style.dot)} />
      <span>{LABEL_MAP[priority]}</span>
    </span>
  );
}
