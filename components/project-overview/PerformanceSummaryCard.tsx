"use client";

import { AlertTriangle, Lock, Trophy, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import type { ProjectOverviewPageProps } from "./types";
import AssigneeAvatar from "./shared/AssigneeAvatar";

interface PerformanceSummaryCardProps {
  memberPerformance: ProjectOverviewPageProps["memberPerformance"];
  canViewMemberPerformance: boolean;
  className?: string;
}

function sortByDone(
  a: ProjectOverviewPageProps["memberPerformance"][number],
  b: ProjectOverviewPageProps["memberPerformance"][number]
) {
  if (b.tasksDone !== a.tasksDone) return b.tasksDone - a.tasksDone;
  if (b.storyPointsCompleted !== a.storyPointsCompleted) {
    return b.storyPointsCompleted - a.storyPointsCompleted;
  }
  return b.completionRate - a.completionRate;
}

function sortByOverdue(
  a: ProjectOverviewPageProps["memberPerformance"][number],
  b: ProjectOverviewPageProps["memberPerformance"][number]
) {
  if (b.tasksOverdue !== a.tasksOverdue) return b.tasksOverdue - a.tasksOverdue;
  return a.completionRate - b.completionRate;
}

export default function PerformanceSummaryCard({
  memberPerformance,
  canViewMemberPerformance,
  className,
}: PerformanceSummaryCardProps) {
  const { t } = useTranslation();

  if (!canViewMemberPerformance) {
    return (
      <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full", className)}>
        <h3 className="text-sm font-semibold text-gray-700">
          {t("overview.performanceTitle", { defaultValue: "Performance" })}
        </h3>
        <div className="h-[250px] mt-3 rounded-2xl border border-dashed border-gray-200 grid place-items-center text-center px-6">
          <div>
            <Lock className="mx-auto h-5 w-5 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              {t("report.pmOnly", { defaultValue: "Only PM can view member performance reports" })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (memberPerformance.length === 0) {
    return (
      <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full", className)}>
        <h3 className="text-sm font-semibold text-gray-700">
          {t("overview.performanceTitle", { defaultValue: "Performance" })}
        </h3>
        <div className="h-[250px] mt-3 rounded-2xl border border-dashed border-gray-200 grid place-items-center text-center px-6">
          <div>
            <Users className="mx-auto h-5 w-5 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              {t("report.noMemberData", { defaultValue: "No member performance data available" })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const rankedByDone = [...memberPerformance].sort(sortByDone);
  const rankedByOverdue = [...memberPerformance].sort(sortByOverdue);
  const topCompleter = rankedByDone[0];
  const mostOverdue = rankedByOverdue[0];

  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">
            {t("overview.performanceTitle", { defaultValue: "Performance" })}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {t("overview.performanceSubtitle", {
              defaultValue: "Who closes the most tasks and who slips deadlines the most",
            })}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          {memberPerformance.length} {t("common.members", { defaultValue: "members" }).toLowerCase()}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700/80">
                {t("overview.topCompleter", { defaultValue: "Top completer" })}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <AssigneeAvatar assignee={topCompleter.user} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{topCompleter.user.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {topCompleter.tasksDone} {t("report.tasksCompleted", { defaultValue: "tasks completed" }).toLowerCase()}
                  </p>
                </div>
              </div>
            </div>
            <Trophy className="h-5 w-5 text-emerald-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700/80">
                {t("overview.mostOverdue", { defaultValue: "Most overdue" })}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <AssigneeAvatar assignee={mostOverdue.user} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{mostOverdue.user.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {mostOverdue.tasksOverdue > 0
                      ? `${mostOverdue.tasksOverdue} ${t("overview.lateTasks", { defaultValue: "late tasks" })}`
                      : t("overview.onTrack", { defaultValue: "No overdue tasks" })}
                  </p>
                </div>
              </div>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
              <th className="pb-2 font-medium">{t("common.members", { defaultValue: "Members" })}</th>
              <th className="pb-2 font-medium text-center">{t("report.tasksCompleted", { defaultValue: "Tasks completed" })}</th>
              <th className="pb-2 font-medium text-center">{t("task.overdue", { defaultValue: "Overdue" })}</th>
              <th className="pb-2 font-medium text-right">{t("report.completionRate", { defaultValue: "Completion rate" })}</th>
            </tr>
          </thead>
          <tbody>
            {rankedByDone.slice(0, 4).map((member) => {
              const progressColor =
                member.completionRate >= 80
                  ? "bg-emerald-500"
                  : member.completionRate >= 50
                    ? "bg-amber-400"
                    : "bg-rose-500";

              return (
                <tr key={member.user.id} className="border-b border-gray-50 last:border-b-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3 min-w-[190px]">
                      <AssigneeAvatar assignee={member.user} size={28} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{member.user.fullName}</p>
                        <p className="text-xs text-gray-400">{member.storyPointsCompleted} pts</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-center font-semibold text-slate-800">{member.tasksDone}</td>
                  <td className="py-3 text-center font-semibold text-amber-600">{member.tasksOverdue}</td>
                  <td className="py-3 pl-3">
                    <div className="flex items-center justify-end gap-3">
                      <div className="hidden sm:block w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", progressColor)}
                          style={{ width: `${Math.min(member.completionRate, 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-semibold text-slate-700">
                        {Math.round(member.completionRate)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
