"use client";

import { DashboardTaskItem } from "@/app/types/dashboard.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CalendarDays, FolderKanban, AlertTriangle, CircleCheckBig } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  formatDashboardDate,
  getPriorityClass,
  getStatusClass,
  getStatusLabel,
  getTaskDueTone,
} from "./dashboard-utils";

interface DashboardMyTasksSectionProps {
  tasks: DashboardTaskItem[];
  hasProjects: boolean;
  hasAssignedTasks: boolean;
  onTaskClick: (task: DashboardTaskItem) => void;
  onOpenProjects: () => void;
}

export function DashboardMyTasksSection({
  tasks,
  hasProjects,
  hasAssignedTasks,
  onTaskClick,
  onOpenProjects,
}: DashboardMyTasksSectionProps) {
  const { t } = useTranslation();
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-lg font-semibold leading-none text-slate-950">
            {t("dashboard.sections.myTasks")}
          </CardTitle>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {t("dashboard.sections.myTasksDesc")}
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          {t("dashboard.common.visibleCount", { count: tasks.length })}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!hasAssignedTasks ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
            <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
              <CircleCheckBig className="h-4 w-4 text-emerald-600" />
              {t("dashboard.empty.noAssignedTitle")}
            </div>
            <p className="max-w-xl text-slate-600">
              {t("dashboard.empty.noAssignedDesc")}
            </p>
            {hasProjects && (
              <Button
                variant="outline"
                size="sm"
                radius="full"
                className="mt-4 border-slate-200 bg-white"
                onClick={onOpenProjects}
              >
                {t("dashboard.header.exploreProjects")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          tasks.map((task) => {
            const dueTone = getTaskDueTone(task);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onTaskClick(task)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                  dueTone.rowClass || "border-slate-200 bg-white"
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                        {task.taskCode}
                      </span>
                      <Badge className={cn("border", getStatusClass(task.status))}>
                        {getStatusLabel(task.status, t)}
                      </Badge>
                    </div>
                    <div className="text-base font-semibold text-slate-950">{task.title}</div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <FolderKanban className="h-4 w-4 text-slate-400" />
                        {task.projectName}
                      </span>
                      <span className={cn("font-semibold uppercase", getPriorityClass(task.priority))}>
                        {t(`task.priority_${task.priority}`, { defaultValue: task.priority })}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                    <Badge className={cn("border", dueTone.chipClass)}>
                      {dueTone.kind === "none" && t("dashboard.common.noDueDate")}
                      {dueTone.kind === "overdue" && t("dashboard.common.overdueAt", { date: formatDashboardDate(task.dueDate, t, "short") })}
                      {dueTone.kind === "today" && t("dashboard.common.dueToday")}
                      {dueTone.kind === "tomorrow" && t("dashboard.common.dueTomorrow")}
                      {dueTone.kind === "upcoming" && t("dashboard.common.dueInDays", { count: dueTone.days })}
                    </Badge>
                    <div className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                      <CalendarDays className="h-4 w-4" />
                      {formatDashboardDate(task.dueDate, t)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}

        {hasAssignedTasks && tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
            <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {t("dashboard.empty.sectionTitle")}
            </div>
            <p>{t("dashboard.empty.sectionDesc")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
