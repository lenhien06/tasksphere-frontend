"use client";

import { DashboardService } from "@/app/services/DashboardService";
import { DashboardMyTasksSection } from "@/components/dashboard/DashboardMyTasksSection";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { sortTasksByUrgency } from "@/components/dashboard/dashboard-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

const DEFAULT_UPCOMING_DAYS = 5;

export default function MyTasksPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "my-tasks", DEFAULT_UPCOMING_DAYS],
    queryFn: () => DashboardService.getMe(DEFAULT_UPCOMING_DAYS),
    staleTime: 60_000,
  });

  const dashboard = dashboardQuery.data?.data;

  if (dashboardQuery.isLoading) {
    return <DashboardPageSkeleton />;
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <Card className="border-rose-200 bg-rose-50/60 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="rounded-2xl border border-rose-200 bg-white p-4 text-rose-600 shadow-sm">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-950">
              {t("dashboard.error.title")}
            </h1>
            <p className="max-w-xl text-sm text-slate-600">
              {t("dashboard.error.desc")}
            </p>
          </div>
          <Button
            variant="outline"
            size="md"
            radius="full"
            className="border-slate-200 bg-white"
            onClick={() => dashboardQuery.refetch()}
          >
            <RefreshCcw className="h-4 w-4" />
            {t("common.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const myTasks = sortTasksByUrgency(dashboard.myTasks);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          My Tasks
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Focused personal queue across the projects you belong to.
        </p>
      </div>

      <DashboardMyTasksSection
        tasks={myTasks}
        hasProjects={dashboard.hasProjects}
        hasAssignedTasks={dashboard.kpis.assignedOpenTasks > 0}
        onTaskClick={(task) => router.push(`/projects/${task.projectId}/tasks/${task.id}`)}
        onOpenProjects={() => router.push("/projects")}
      />
    </div>
  );
}
