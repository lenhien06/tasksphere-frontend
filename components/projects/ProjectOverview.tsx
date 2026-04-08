"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ProjectService } from "@/app/services/ProjectService";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { useProjectOverview } from "@/hooks/useProjectOverview";
import { useActiveSprint } from "@/hooks/useActiveSprint";
import { useBurndownData } from "@/hooks/useBurndownData";
import { useVelocityData } from "@/hooks/useVelocityData";
import { useDueSoonTasks } from "@/hooks/useDueSoonTasks";
import { useMemberPerformanceData } from "@/hooks/useMemberPerformanceData";
import { useCreateTask } from "@/hooks/useTaskQueries";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { useAuthStore } from "@/stores/useAuthStore";
import { AnimatePresence } from "framer-motion";

import ProjectOverviewPage, { type ProjectOverviewPageProps } from "@/components/project-overview/ProjectOverviewPage";
import { FullCreateTask, type CreateTaskPayload } from "./TaskFormModals";
import { toKanbanUserRole } from "@/lib/projectRole";
import { useAISkillModalStore } from "@/stores/useAISkillModalStore";

interface ProjectOverviewProps {
  projectId: string;
}

type UiRole = "PROJECT_MANAGER" | "MEMBER" | "VIEWER";

function normalizeStatus(
  status: string
): "todo" | "in_progress" | "in_review" | "testing" | "done" | "cancelled" {
  const s = status.toLowerCase();
  if (s === "todo" || s === "to_do") return "todo";
  if (s === "in_progress" || s === "inprogress") return "in_progress";
  if (s === "in_review" || s === "review") return "in_review";
  if (s === "testing") return "testing";
  if (s === "done" || s === "completed") return "done";
  if (s === "cancelled") return "cancelled";
  return "cancelled";
}

export default function ProjectOverview({ projectId }: ProjectOverviewProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [showCreateTask, setShowCreateTask] = useState(false);

  const currentUserId = useAuthStore((s) => String(s.user?.id ?? ""));
  const openSkillModal = useAISkillModalStore((s) => s.open);

  const { data: projectData, isLoading: isProjectLoading } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn: () => ProjectService.getById(projectId),
    enabled: !!projectId,
  });
  const kanbanRole = projectData?.data
    ? toKanbanUserRole(projectData.data.myRole, projectData.data.isOwner)
    : null;
  const canViewMemberPerformance = kanbanRole === "PROJECT_MANAGER";

  const { data: overviewData, isLoading: isOverviewLoading } = useProjectOverview(projectId);
  const { data: activeSprint } = useActiveSprint(projectId);
  const { data: burndownData, isLoading: isBurndownLoading } = useBurndownData(activeSprint?.id);
  const { data: velocityData } = useVelocityData(projectId);
  const { data: memberPerformanceData } = useMemberPerformanceData(
    projectId,
    activeSprint?.id,
    canViewMemberPerformance
  );
  const { data: dueSoonTasks } = useDueSoonTasks(projectId);
  const { data: membersData } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => ProjectMemberService.getMembers(projectId),
    enabled: !!projectId,
  });
  const { data: columnsData } = useKanbanColumns(projectId);

  const createTask = useCreateTask(projectId);

  const isLoading = isProjectLoading || isOverviewLoading;
  if (isLoading || !projectData?.data || !overviewData) {
    return (
      <div className="h-[60vh] grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const kr = kanbanRole ?? toKanbanUserRole(projectData.data.myRole, projectData.data.isOwner);
  const userRole: UiRole =
    kr === "SYSTEM_ADMIN" || kr === "PROJECT_MANAGER"
      ? "PROJECT_MANAGER"
      : kr === "MEMBER"
        ? "MEMBER"
        : "VIEWER";
  const distribution = overviewData.statusDistribution;
  const mappedDistribution: ProjectOverviewPageProps["overview"]["statusDistribution"] = distribution.map((item) => ({
    status: normalizeStatus(item.status),
    count: item.count,
    percentage: item.percentage,
  }));

  const activeSprintTotalStoryPoints = Number(
    burndownData?.totalPoints
    ?? activeSprint?.totalStoryPoints
    ?? 0
  );
  const latestBurndownActual = [...(burndownData?.data ?? [])]
    .reverse()
    .find((point) => point.actual != null)?.actual ?? null;
  const activeSprintCompletedStoryPoints = Math.max(
    0,
    Number(
      latestBurndownActual == null
        ? activeSprint?.completedStoryPoints ?? 0
        : activeSprintTotalStoryPoints - latestBurndownActual
    )
  );
  const activeSprintDoneTasks = Number(activeSprint?.doneTasks ?? 0);
  const activeSprintTotalTasks = Number(activeSprint?.totalTasks ?? 0);
  const activeSprintInProgressTasks = Number(
    activeSprint?.inProgressTasks
    ?? Math.max(activeSprintTotalTasks - activeSprintDoneTasks, 0)
  );
  const velocityFromApi = [...(velocityData?.sprints ?? [])].reverse().map((item) => ({
    sprintId: item.sprintId,
    sprintName: item.sprintName,
    velocity: item.velocity,
    status: "completed" as const,
  }));
  const velocity =
    velocityFromApi.length > 0
      ? velocityFromApi
      : activeSprint
      ? [
          {
            sprintId: activeSprint.id,
            sprintName: activeSprint.name,
            velocity: Number(activeSprintCompletedStoryPoints ?? 0),
            status: "active" as const,
          },
        ]
      : [];
  // ── Compute member list before props so onOpenAISkillModal can reference it ──
  const projectMembers = (() => {
    const raw = membersData as unknown;
    const list = (
      raw && typeof raw === "object" && "data" in raw
        ? (raw as { data?: Array<{ user?: { id: string; fullName: string; avatarUrl?: string | null; skillTags?: string[]; skills?: string[] }; id?: string; fullName?: string; avatarUrl?: string | null; skillTags?: string[]; skills?: string[] }> }).data
        : raw
    ) as Array<{ user?: { id: string; fullName: string; avatarUrl?: string | null; skillTags?: string[]; skills?: string[] }; id?: string; fullName?: string; avatarUrl?: string | null; skillTags?: string[]; skills?: string[] }> | undefined;
    if (!Array.isArray(list)) return [];
    return list.map((m) => ({
      id: m.user?.id ?? m.id ?? "",
      name: m.user?.fullName ?? m.fullName ?? "",
      email: "",
      avatarUrl: m.user?.avatarUrl ?? m.avatarUrl ?? undefined,
      skillTags: m.skillTags ?? m.skills ?? m.user?.skillTags ?? m.user?.skills ?? [],
    }));
  })();

  const burndownSeries = (burndownData?.data ?? []).map((item) => ({
    day: item.day,
    ideal: item.ideal,
    actual: item.actual,
    date: item.date,
  }));

  const hasBurndownActual = burndownSeries.some((item) => item.actual != null);
  const fallbackBurndownSeries =
    !hasBurndownActual && activeSprint && activeSprintTotalStoryPoints > 0 && burndownSeries.length > 0
      ? (() => {
          const sprintStart = new Date(activeSprint.startDate);
          const sprintEnd = new Date(activeSprint.endDate);
          const today = new Date();
          today.setHours(23, 59, 59, 999);

          const referenceEnd = today < sprintEnd ? today : sprintEnd;
          const totalElapsedDays = Math.max(
            1,
            Math.ceil((referenceEnd.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24))
          );
          const completedPoints = Math.max(0, activeSprintCompletedStoryPoints);
          const totalRemainingNow = Math.max(activeSprintTotalStoryPoints - completedPoints, 0);

          return burndownSeries.map((point) => {
            const pointDate = new Date(point.date);
            if (Number.isNaN(pointDate.getTime()) || pointDate > referenceEnd) {
              return { ...point, actual: null };
            }

            const elapsedDays = Math.max(
              0,
              Math.ceil((pointDate.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24))
            );
            const progressRatio = Math.min(elapsedDays / totalElapsedDays, 1);
            const syntheticRemaining = Math.max(
              activeSprintTotalStoryPoints - (activeSprintTotalStoryPoints - totalRemainingNow) * progressRatio,
              0
            );

            return {
              ...point,
              actual: Math.round(syntheticRemaining * 10) / 10,
            };
          });
        })()
      : burndownSeries;

  const props: ProjectOverviewPageProps = {
    project: {
      id: projectData.data.id,
      name: projectData.data.name,
      projectKey: projectData.data.projectKey,
      status:
        projectData.data.status === "completed"
          ? "completed"
          : projectData.data.status === "archived"
          ? "archived"
          : "active",
      visibility: (projectData.data.visibility as "private" | "internal" | "public") ?? "private",
      pm: {
        fullName: projectData.data.ownerName ?? t("common.notFound", { defaultValue: "Unknown PM" }),
        avatarUrl: null,
      },
      startDate: projectData.data.createdAt ?? new Date().toISOString(),
      totalStoryPoints: overviewData.totalStoryPoints,
      goal: projectData.data.description ?? null,
    },
    overview: {
      completionRate: overviewData.completionRate,
      completionRateDelta: overviewData.completionRateDelta,
      backlogCount: overviewData.backlogCount,
      backlogCountDelta: overviewData.backlogCountDelta,
      sprintDaysRemaining: overviewData.sprintDaysRemaining,
      sprintName: overviewData.sprintName,
      memberCount: overviewData.memberCount,
      newMembersLast7Days: overviewData.newMembersLast7Days,
      overdueTasks: overviewData.overdueTasks,
      doneStoryPoints: overviewData.doneStoryPoints,
      totalStoryPoints: overviewData.totalStoryPoints,
      statusDistribution: mappedDistribution,
    },
    activeSprint: activeSprint
      ? {
          id: activeSprint.id,
          name: activeSprint.name,
          startDate: activeSprint.startDate,
          endDate: activeSprint.endDate,
          totalTasks: activeSprintTotalTasks,
          doneTasks: activeSprintDoneTasks,
          inProgressTasks: activeSprintInProgressTasks,
          totalStoryPoints: activeSprintTotalStoryPoints,
          completedStoryPoints: activeSprintCompletedStoryPoints,
          completionRate:
            activeSprintTotalStoryPoints > 0
              ? Math.round((activeSprintCompletedStoryPoints / activeSprintTotalStoryPoints) * 100)
              : Number(activeSprint.completionRate ?? 0),
        }
      : null,
    burndown: fallbackBurndownSeries,
    burndownIsLoading: isBurndownLoading,
    velocity,
    averageVelocity: velocityData?.averageVelocity ?? 0,
    velocityTrend: velocityData?.trend ?? "stable",
    dueSoon: (dueSoonTasks ?? []).map((task) => ({
      id: task.id,
      taskId: task.taskId,
      title: task.title,
      type: task.type ?? "task",
      priority: task.priority,
      status: normalizeStatus(task.status),
      dueDate: task.dueDate,
      storyPoints: task.storyPoints ?? null,
      isOverdue: task.isOverdue ?? false,
      assignee: task.assignee
        ? { fullName: task.assignee.fullName, avatarUrl: task.assignee.avatarUrl }
        : null,
      sprintId: task.sprintId ?? null,
      sprintName: task.sprintName ?? null,
      subtaskCount: task.subtaskCount ?? 0,
      subtaskDone: task.subtaskDone ?? 0,
      commentsCount: task.commentsCount ?? 0,
    })),
    memberPerformance: memberPerformanceData?.members ?? [],
    canViewMemberPerformance,
    userRole,
    currentUserId,
    onCreateTask: () => setShowCreateTask(true),
    onNavigateToMembers: () => router.push(`/projects/${projectId}?tab=members`),
    onNavigateToBoard: () => router.push(`/projects/${projectId}/board`),
    onNavigateToBacklog: () => router.push(`/projects/${projectId}/backlog`),
    onOpenAISkillModal: userRole === "PROJECT_MANAGER"
      ? () => {
          openSkillModal({
            projectId,
            canEdit: true,
          });
        }
      : undefined,
  };


  const createColumns = (columnsData ?? []).map((c) => ({ id: c.id, name: c.name, color: c.colorHex ?? "#94A3B8" }));

  return (
    <>
      <ProjectOverviewPage {...props} />

      <AnimatePresence>
        {showCreateTask && (
          <FullCreateTask
            projectId={projectId}
            projectMembers={projectMembers}
            columns={createColumns}
            defaultColumnId={createColumns[0]?.id}
            projectKey={projectData.data.projectKey}
            onConfirm={(payload: CreateTaskPayload) =>
              createTask.mutateAsync({
                title: payload.title,
                description: payload.description,
                type: payload.type,
                priority: payload.priority,
                assigneeId: payload.assigneeId ?? undefined,
                dueDate: payload.dueDate ?? undefined,
                storyPoints: payload.storyPoints ?? undefined,
                skillTagsRequired: payload.skillTagsRequired,
                confirmActiveSprintChange: payload.confirmActiveSprintChange,
                statusColumnId: payload.statusColumnId,
                parentTaskId: payload.parentTaskId ?? undefined,
                sprintId: payload.sprintId ?? undefined,
              }).then(() => setShowCreateTask(false))
            }
            onClose={() => setShowCreateTask(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
