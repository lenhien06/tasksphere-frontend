"use client";

import { Calendar, LayoutPanelTop, ListTodo, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import BurndownChart from "./BurndownChart";
import type { ProjectOverviewPageProps } from "./types";

interface SprintCardProps {
  activeSprint: ProjectOverviewPageProps["activeSprint"];
  burndown: ProjectOverviewPageProps["burndown"];
  userRole: ProjectOverviewPageProps["userRole"];
  onNavigateToBoard: () => void;
  onNavigateToBacklog: () => void;
  className?: string;
}

export default function SprintCard({
  activeSprint,
  burndown,
  userRole,
  onNavigateToBoard,
  onNavigateToBacklog,
  className,
}: SprintCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";

  if (!activeSprint) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full ${className ?? ""}`}>
        <div className="h-full min-h-[360px] grid place-items-center text-center">
          <div>
            <Sparkles className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-gray-500">{t("sprint.noActive", { defaultValue: "Chưa có sprint đang chạy" })}</p>
            {userRole === "PROJECT_MANAGER" && (
              <button className="mt-3 text-sm text-blue-600 hover:underline">
                {t("sprint.createNew", { defaultValue: "Tạo Sprint mới" })}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const workloadPct = activeSprint.totalStoryPoints > 0
    ? Math.round((activeSprint.completedStoryPoints / activeSprint.totalStoryPoints) * 100)
    : 0;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 ${className ?? ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <Sparkles className="text-amber-500" size={16} />
          <h3 className="text-sm font-semibold text-gray-700 break-words">{activeSprint.name}</h3>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 flex-wrap">
          <Calendar size={13} />
          {new Date(activeSprint.startDate).toLocaleDateString(locale)} - {new Date(activeSprint.endDate).toLocaleDateString(locale)}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 uppercase tracking-wide">{t("sprint.workload", { defaultValue: "Workload" })}</span>
          <span className="text-sm font-semibold text-blue-600">{workloadPct}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${workloadPct}%` }} />
        </div>
        <div className="mt-1 text-xs text-gray-500">
          {activeSprint.completedStoryPoints}/{activeSprint.totalStoryPoints} pts
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xl font-bold text-gray-900">{activeSprint.totalTasks}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400">{t("sprint.total", { defaultValue: "Total" })}</div>
        </div>
        <div>
          <div className="text-xl font-bold text-green-600">{activeSprint.doneTasks}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400">{t("sprint.done", { defaultValue: "Done" })}</div>
        </div>
        <div>
          <div className="text-xl font-bold text-blue-600">{activeSprint.inProgressTasks}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400">{t("task.status_IN_PROGRESS", { defaultValue: "In Progress" })}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs uppercase tracking-wide text-gray-500">{t("report.tab_burndown", { defaultValue: "Sprint Progress (Burn-down)" })}</h4>
          <div className="text-[11px] text-gray-400">● {t("report.actual", { defaultValue: "Actual" })} -- {t("report.ideal", { defaultValue: "Ideal" })}</div>
        </div>
        <BurndownChart data={burndown} />
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button onClick={onNavigateToBoard} className="border border-gray-200 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 inline-flex items-center justify-center gap-2">
          <LayoutPanelTop size={14} />
          {t("kanban.board", { defaultValue: "Board" })}
        </button>
        <button onClick={onNavigateToBacklog} className="border border-gray-200 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 inline-flex items-center justify-center gap-2">
          <ListTodo size={14} />
          {t("common.backlog", { defaultValue: "Backlog" })}
        </button>
      </div>
    </div>
  );
}
