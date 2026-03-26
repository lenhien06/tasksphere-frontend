"use client";

import { DashboardTaskItem } from "@/app/types/dashboard.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDashboardDate, getTaskDueTone, getStatusClass, getStatusLabel } from "./dashboard-utils";

interface DashboardUpcomingDeadlinesSectionProps {
  tasks: DashboardTaskItem[];
  upcomingDays: number;
  selectedUpcomingDays: number;
  onUpcomingDaysChange: (days: number) => void;
  onTaskClick: (task: DashboardTaskItem) => void;
}

const RANGE_OPTIONS = [3, 5, 7, 14] as const;

export function DashboardUpcomingDeadlinesSection({
  tasks,
  upcomingDays,
  selectedUpcomingDays,
  onUpcomingDaysChange,
  onTaskClick,
}: DashboardUpcomingDeadlinesSectionProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-950">Upcoming Deadlines</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Tasks due in the next {upcomingDays} days.
            </p>
          </div>
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option}
                variant={selectedUpcomingDays === option ? "primary" : "ghost"}
                size="xs"
                radius="full"
                className={cn(
                  "min-w-10",
                  selectedUpcomingDays === option
                    ? "bg-slate-950 text-white hover:bg-slate-800"
                    : "text-slate-600"
                )}
                onClick={() => onUpcomingDaysChange(option)}
              >
                {option}d
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
            No upcoming deadlines in the selected range.
          </div>
        ) : (
          tasks.map((task) => {
            const dueTone = getTaskDueTone(task);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onTaskClick(task)}
                className="flex w-full items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {task.taskCode}
                    </span>
                    <Badge className={cn("border", getStatusClass(task.status))}>
                      {getStatusLabel(task.status)}
                    </Badge>
                  </div>
                  <div className="line-clamp-2 text-sm font-semibold text-slate-950">{task.title}</div>
                  <div className="text-sm text-slate-500">{task.projectName}</div>
                </div>
                <div className="ml-4 flex shrink-0 flex-col items-end gap-2">
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <CalendarClock className="h-4 w-4 text-slate-400" />
                    {formatDashboardDate(task.dueDate)}
                  </div>
                  <Badge className={cn("border", dueTone.chipClass)}>{dueTone.label}</Badge>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
