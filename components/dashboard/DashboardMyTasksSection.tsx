"use client";

import { DashboardTaskItem } from "@/app/types/dashboard.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CalendarDays, FolderKanban, AlertTriangle, CircleCheckBig } from "lucide-react";
import { cn } from "@/lib/utils";
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
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-xl font-semibold text-slate-950">My Tasks</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Personal work queue with urgency surfaced first.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
          {tasks.length} visible
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!hasAssignedTasks ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
            <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
              <CircleCheckBig className="h-4 w-4 text-emerald-600" />
              You currently have no assigned open tasks.
            </div>
            <p className="max-w-xl text-slate-600">
              Your projects are still available on the right. Open a project to review work,
              or create a new task if your role allows it.
            </p>
            {hasProjects && (
              <Button
                variant="outline"
                size="sm"
                radius="full"
                className="mt-4 border-slate-200 bg-white"
                onClick={onOpenProjects}
              >
                Explore projects
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
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                    <div className="text-base font-semibold text-slate-950">{task.title}</div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <FolderKanban className="h-4 w-4 text-slate-400" />
                        {task.projectName}
                      </span>
                      <span className={cn("font-semibold uppercase", getPriorityClass(task.priority))}>
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                    <Badge className={cn("border", dueTone.chipClass)}>{dueTone.label}</Badge>
                    <div className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                      <CalendarDays className="h-4 w-4" />
                      {formatDashboardDate(task.dueDate)}
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
              Your dashboard data is available, but this section is empty.
            </div>
            <p>No open assignments matched the current dashboard response.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
