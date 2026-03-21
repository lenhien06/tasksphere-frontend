"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface DueDateLabelProps {
  date: string | null;
  isOverdue: boolean;
}

export default function DueDateLabel({ date, isOverdue }: DueDateLabelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";
  const text = date ? new Date(date).toLocaleDateString(locale) : t("task.noDate", { defaultValue: "No date" });

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", isOverdue ? "text-red-500 font-medium" : "text-gray-500")}>
      {isOverdue && <AlertTriangle size={12} />}
      {text}
    </span>
  );
}
