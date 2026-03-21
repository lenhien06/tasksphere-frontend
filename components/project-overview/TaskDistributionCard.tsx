"use client";

import { useMemo } from "react";
import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProjectOverviewPageProps } from "./types";

interface TaskDistributionCardProps {
  statusDistribution: ProjectOverviewPageProps["overview"]["statusDistribution"];
}

const STATUS_CONFIG: Record<ProjectOverviewPageProps["overview"]["statusDistribution"][number]["status"], { labelKey: string; color: string }> = {
  todo: { labelKey: "task.status_TODO", color: "#9CA3AF" },
  in_progress: { labelKey: "task.status_IN_PROGRESS", color: "#3B82F6" },
  in_review: { labelKey: "task.status_IN_REVIEW", color: "#A855F7" },
  done: { labelKey: "task.status_DONE", color: "#22C55E" },
  cancelled: { labelKey: "task.status_CANCELLED", color: "#EF4444" },
};

const FALLBACK_ORDER: Array<ProjectOverviewPageProps["overview"]["statusDistribution"][number]["status"]> = [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
];

export default function TaskDistributionCard({ statusDistribution }: TaskDistributionCardProps) {
  const { t } = useTranslation();
  const normalized = statusDistribution.length > 0
    ? statusDistribution
    : FALLBACK_ORDER.map((status) => ({ status, count: 0, percentage: 0 }));
  const safeNormalized = normalized.map((item) => ({
    ...item,
    count: Number(item.count) || 0,
    percentage: Number(item.percentage) || 0,
  }));
  const totalTasks = safeNormalized.reduce((sum, item) => sum + item.count, 0);
  const donutBackground = useMemo(() => {
    if (totalTasks <= 0) return "conic-gradient(#E5E7EB 0deg 360deg)";

    let current = 0;
    const segments = safeNormalized
      .filter((item) => item.count > 0)
      .map((item) => {
        const angle = (item.count / totalTasks) * 360;
        const start = current;
        const end = current + angle;
        current = end;
        return `${STATUS_CONFIG[item.status].color} ${start}deg ${end}deg`;
      });

    if (segments.length === 0) return "conic-gradient(#E5E7EB 0deg 360deg)";
    return `conic-gradient(${segments.join(", ")})`;
  }, [safeNormalized, totalTasks]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{t("report.statusDistribution", { defaultValue: "Task Distribution" })}</h3>

      <div className="grid grid-cols-1 gap-2 items-center">
        <div className="h-[150px] sm:h-[170px] relative">
          <div className="h-[150px] sm:h-[170px] w-full flex items-center justify-center">
            <div
              className="relative w-[132px] h-[132px] sm:w-[150px] sm:h-[150px] rounded-full"
              style={{ background: donutBackground }}
              aria-label="status-distribution-donut"
            >
              <div className="absolute inset-[20px] sm:inset-[22px] rounded-full bg-white" />
            </div>
          </div>
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{totalTasks}</div>
              <div className="text-xs text-gray-400">{t("task.title", { defaultValue: "Tasks" })}</div>
            </div>
          </div>
        </div>

        {totalTasks === 0 && (
          <div className="text-center text-[11px] text-gray-400 -mt-1 mb-1 inline-flex items-center justify-center gap-1">
            <Inbox size={13} />
            {t("common.noData", { defaultValue: "Chưa có task nào trong dự án" })}
          </div>
        )}

        <div className="space-y-1">
          {safeNormalized.map((item) => (
            <div key={item.status} className="flex items-center justify-between text-xs">
              <div className="inline-flex items-center gap-2 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG[item.status].color }} />
                {t(STATUS_CONFIG[item.status].labelKey, { defaultValue: item.status })}
              </div>
              <div className="inline-flex items-center gap-3">
                <span className="text-gray-500">{item.count}</span>
                <span className="text-gray-400">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
