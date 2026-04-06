"use client";

import { Calendar, LayoutPanelTop, ListTodo, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import BurndownChart from "./BurndownChart";
import type { ProjectOverviewPageProps } from "./types";

interface SprintOverviewCardProps {
  activeSprint: ProjectOverviewPageProps["activeSprint"];
  burndown: ProjectOverviewPageProps["burndown"];
  userRole: ProjectOverviewPageProps["userRole"];
  onNavigateToBoard: () => void;
  onNavigateToBacklog: () => void;
  className?: string;
}

export default function SprintOverviewCard({
  activeSprint,
  burndown,
  userRole,
  onNavigateToBoard,
  onNavigateToBacklog,
  className,
}: SprintOverviewCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";

  if (!activeSprint) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-4 h-full ${className ?? ""}`}>
        <div className="h-full min-h-[420px] grid place-items-center text-center">
          <div>
            <Sparkles className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-gray-500">
              {t("sprint.noActive", { defaultValue: "No active sprint" })}
            </p>
            {userRole === "PROJECT_MANAGER" && (
              <button className="mt-3 text-sm text-blue-600 hover:underline">
                {t("sprint.createNew", { defaultValue: "Create new sprint" })}
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
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 ${className ?? ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="inline-flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
            <Sparkles className="text-amber-500" size={16} />
          </span>
          <div>
            <h3 className="text-xl font-semibold leading-7 text-slate-800 break-words">
              {activeSprint.name}
            </h3>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">
              {t("common.overview", { defaultValue: "Overview" })}
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <Calendar size={14} />
          <span className="leading-5">
            {new Date(activeSprint.startDate).toLocaleDateString(locale)} - {new Date(activeSprint.endDate).toLocaleDateString(locale)}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 uppercase tracking-[0.2em]">
            {t("sprint.workload", { defaultValue: "Workload" })}
          </span>
          <span className="text-sm font-semibold text-blue-600">{workloadPct}%</span>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
            style={{ width: `${workloadPct}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-gray-500">
          {activeSprint.completedStoryPoints}/{activeSprint.totalStoryPoints} pts
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-slate-50 px-3 py-4">
          <div className="text-3xl font-bold text-slate-900">{activeSprint.totalTasks}</div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400">
            {t("sprint.total", { defaultValue: "Total" })}
          </div>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-3 py-4">
          <div className="text-3xl font-bold text-emerald-600">{activeSprint.doneTasks}</div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400">
            {t("sprint.done", { defaultValue: "Done" })}
          </div>
        </div>
        <div className="rounded-2xl bg-blue-50 px-3 py-4">
          <div className="text-3xl font-bold text-blue-600">{activeSprint.inProgressTasks}</div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400">
            {t("task.status_IN_PROGRESS", { defaultValue: "In Progress" })}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="text-xs uppercase tracking-[0.2em] text-gray-500">
            {t("report.tab_burndown", { defaultValue: "Burndown Chart" })}
          </h4>
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span>• {t("report.actual", { defaultValue: "Actual" })}</span>
            <span>-- {t("report.ideal", { defaultValue: "Ideal" })}</span>
          </div>
        </div>
        <BurndownChart data={burndown} />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={onNavigateToBoard}
          className="border border-gray-200 rounded-xl px-3 py-3 text-sm hover:bg-gray-50 inline-flex items-center justify-center gap-2"
        >
          <LayoutPanelTop size={14} />
          {t("kanban.board", { defaultValue: "Board" })}
        </button>
        <button
          onClick={onNavigateToBacklog}
          className="border border-gray-200 rounded-xl px-3 py-3 text-sm hover:bg-gray-50 inline-flex items-center justify-center gap-2"
        >
          <ListTodo size={14} />
          {t("common.backlog", { defaultValue: "Backlog" })}
        </button>
      </div>
    </div>
  );
}
