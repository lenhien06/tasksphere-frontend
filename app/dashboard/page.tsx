"use client";

import { DashboardService } from "@/app/services/DashboardService";
import {
  DashboardRecentActivityItem,
  DashboardTaskItem,
} from "@/app/types/dashboard.schema";
import { DashboardActiveProjectsSection } from "@/components/dashboard/DashboardActiveProjectsSection";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardKpiCards } from "@/components/dashboard/DashboardKpiCards";
import { DashboardMyTasksSection } from "@/components/dashboard/DashboardMyTasksSection";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardRecentActivitySection } from "@/components/dashboard/DashboardRecentActivitySection";
import { DashboardUpcomingDeadlinesSection } from "@/components/dashboard/DashboardUpcomingDeadlinesSection";
import { sortTasksByUrgency } from "@/components/dashboard/dashboard-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TaskDetailPanel from "@/components/projects/TaskDetailPanel";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const DEFAULT_UPCOMING_DAYS = 5;

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const syncUnreadCount = useNotificationStore((state) => state.handleRealtimeUnreadCount);
  const [upcomingDays, setUpcomingDays] = useState(DEFAULT_UPCOMING_DAYS);
  const [selectedTask, setSelectedTask] = useState<{ taskId: string; projectId: string } | null>(null);
  const { selectedContext } = useWorkspace();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "me", upcomingDays],
    queryFn: () => DashboardService.getMe(upcomingDays),
    staleTime: 60_000,
  });

  const dashboard = dashboardQuery.data?.data;

  useEffect(() => {
    if (!dashboard) return;
    syncUnreadCount({
      unreadCount: dashboard.kpis.unreadNotifications,
      updatedAt: dashboard.generatedAt,
    });
  }, [dashboard, syncUnreadCount]);

  const userName =
    user?.fullName?.trim() ||
    user?.displayName?.trim() ||
    user?.email?.split("@")[0] ||
    "there";

  const handleTaskClick = (task: DashboardTaskItem) => {
    setSelectedTask({ taskId: task.id, projectId: task.projectId });
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleActivityClick = (activity: DashboardRecentActivityItem) => {
    if (activity.entityType === "TASK" && activity.projectId && activity.entityId) {
      router.push(`/projects/${activity.projectId}/tasks/${activity.entityId}`);
      return;
    }

    if (activity.projectId) {
      router.push(`/projects/${activity.projectId}`);
    }
  };

  const handleOpenProjects = () => {
    router.push("/projects");
  };

  const handleCreateProject = () => {
    const params = new URLSearchParams();
    if (selectedContext.kind === "workspace") {
      params.set("workspaceId", selectedContext.workspace.id);
    }
    router.push(params.toString() ? `/projects/new?${params.toString()}` : "/projects/new");
  };

  const handleCreateProjectWithAI = () => {
    if (selectedContext.kind === "workspace") {
      router.push(`/ws/${selectedContext.workspace.slug}/projects/new-with-ai`);
      return;
    }

    router.push("/projects/new-with-ai");
  };

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
  const upcomingDeadlines = sortTasksByUrgency(dashboard.upcomingDeadlines);
  const showFullOnboarding = !dashboard.hasProjects && !dashboard.hasTasks;

  return (
    <>
      <div className="mx-auto w-full max-w-[1680px] space-y-6 px-4 pb-6 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pt-6 2xl:px-10">
        {showFullOnboarding ? (
          <DashboardEmptyState
            userName={userName}
            onCreateProject={handleCreateProject}
            onCreateProjectWithAI={handleCreateProjectWithAI}
            onOpenProjects={handleOpenProjects}
          />
        ) : (
          <>
            <DashboardHeader
              userName={userName}
              dashboard={dashboard}
              onCreateProject={handleCreateProject}
              onOpenProjects={handleOpenProjects}
            />

            <DashboardKpiCards kpis={dashboard.kpis} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
              <div className="space-y-6">
                <DashboardMyTasksSection
                  tasks={myTasks}
                  hasProjects={dashboard.hasProjects}
                  hasAssignedTasks={dashboard.kpis.assignedOpenTasks > 0}
                  onTaskClick={handleTaskClick}
                  onOpenProjects={handleOpenProjects}
                />
                <DashboardActiveProjectsSection
                  projects={dashboard.activeProjects}
                  onProjectClick={handleProjectClick}
                />
              </div>

              <div className="space-y-6">
                <DashboardUpcomingDeadlinesSection
                  tasks={upcomingDeadlines}
                  upcomingDays={dashboard.upcomingDays}
                  selectedUpcomingDays={upcomingDays}
                  onUpcomingDaysChange={setUpcomingDays}
                  onTaskClick={handleTaskClick}
                />
                <DashboardRecentActivitySection
                  activities={dashboard.recentActivity}
                  onActivityClick={handleActivityClick}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {selectedTask && (
        <TaskDetailPanel
          taskId={selectedTask.taskId}
          projectId={selectedTask.projectId}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => dashboardQuery.refetch()}
        />
      )}
    </>
  );
}
