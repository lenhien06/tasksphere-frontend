"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { TaskService } from "@/app/services/TaskService";
import { ProjectService } from "@/app/services/ProjectService";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { useCreateTask } from "@/hooks/useTaskQueries";
import { useKanbanColumns, DEFAULT_COLUMNS } from "@/hooks/useKanbanColumns";
import { useProjectWebSocket } from "@/hooks/useProjectWebSocket";
import { useAuthStore } from "@/stores/useAuthStore";
import { handleKanbanError } from "@/lib/errorHandler";
import { toKanbanUserRole, toTaskPanelRole } from "@/lib/projectRole";

import KanbanBoardUI, {
  type Column,
  type TaskCardData,
} from "@/components/kanban/KanbanBoard";
import type { ToolbarFilterState } from "@/components/kanban/KanbanToolbar";
import {
  DEFAULT_TASK_FILTER_STATE,
  normalizeSavedTaskFilterCriteria,
  toSavedTaskFilterCriteria,
} from "@/components/projects/task-filter-utils";
import { AiAssignReview } from "@/components/ai/AiAssignReview";
import { AiTaskGenerator } from "@/components/ai/AiTaskGenerator";
import TaskDetailPanel, { type Member } from "./TaskDetailPanel";
import {
    FullCreateTask,
  type CreateTaskPayload,
  type ParentTask,
} from "./TaskFormModals";

export interface KanbanBoardProps {
  projectId?: string;
  projectKey?: string;
  currentUserRole?: "PROJECT_MANAGER" | "MEMBER" | "VIEWER" | "SYSTEM_ADMIN";
  onTaskClick?: (task: TaskCardData) => void;
}

interface ProjectMemberLike {
  id?: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string | null;
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
    avatarUrl?: string | null;
  };
}

interface MoveTaskPayload {
  taskId: string;
  sourceColumnId: string;
  targetColumnId: string;
  newPosition: number;
  oldPosition: number;
}

const mapType = (type: string): TaskCardData["type"] => {
  const raw = type.toLowerCase();
  if (raw === "bug" || raw === "story" || raw === "epic" || raw === "sub_task") return raw;
  return "task";
};

const mapPriority = (priority: string): TaskCardData["priority"] => {
  const raw = priority.toLowerCase();
  if (raw === "critical" || raw === "high" || raw === "medium" || raw === "low") return raw;
  return "medium";
};

const inferStatus = (name: string, id: string, mappedStatus?: string) => {
  if (mappedStatus) return mappedStatus as Column["status"];
  const raw = `${name} ${id}`.toLowerCase();
  if (raw.includes("review")) return "IN_REVIEW";
  if (raw.includes("progress") || raw.includes("doing")) return "IN_PROGRESS";
  if (raw.includes("done")) return "DONE";
  return "TODO";
};

const mapColumns = (cols: typeof DEFAULT_COLUMNS): Column[] =>
  [...cols]
    .sort((a, b) => a.position - b.position)
    .map((c) => {
      const status = inferStatus(c.name, c.id, c.mappedStatus);
      const category: Column["category"] =
        status === "DONE"
          ? "DONE"
          : status === "IN_REVIEW"
          ? "REVIEW"
          : status === "IN_PROGRESS"
          ? "IN_PROGRESS"
          : "START";
      return {
        id: c.id,
        name: c.name,
        colorHex: c.colorHex,
        category,
        status,
        position: c.position,
        taskCount: c.taskCount ?? 0,
        isDefault: c.isDefault,
      };
    });

const moveTaskInCache = (old: any, payload: MoveTaskPayload, nextStatus?: string) => {
  if (!old?.content) return old;
  const source = [...old.content];
  const idx = source.findIndex((t: any) => t.id === payload.taskId);
  if (idx < 0) return old;

  const moving = { ...source[idx] };
  source.splice(idx, 1);

  // Update properties
  moving.columnId = payload.targetColumnId;
  if (nextStatus) moving.taskStatus = nextStatus;

  // Get current tasks in target column
  const targetTasks = source.filter((t: any) => t.columnId === payload.targetColumnId)
                            .sort((a, b) => a.taskPosition - b.taskPosition);
  
  // Insert at new position
  targetTasks.splice(payload.newPosition, 0, moving);

  // Re-index target column
  targetTasks.forEach((t, i) => {
    t.taskPosition = i;
  });

  // Re-index source column if it's different
  if (payload.sourceColumnId !== payload.targetColumnId) {
    const sourceTasks = source.filter((t: any) => t.columnId === payload.sourceColumnId)
                              .sort((a, b) => a.taskPosition - b.taskPosition);
    sourceTasks.forEach((t, i) => {
      t.taskPosition = i;
    });
  }

  // Reconstruct final content
  const others = source.filter(t => t.columnId !== payload.targetColumnId && t.columnId !== payload.sourceColumnId);
  const sourceTasks = payload.sourceColumnId !== payload.targetColumnId 
    ? source.filter(t => t.columnId === payload.sourceColumnId)
    : [];

  return { ...old, content: [...others, ...sourceTasks, ...targetTasks] };
};

export default function KanbanBoard({
  currentUserRole = "VIEWER",
  onTaskClick,
}: KanbanBoardProps = {}) {
  const { t } = useTranslation();
  const params = useParams();
  const queryClient = useQueryClient();
  const projectId = params.id as string;

  const currentUserId = useAuthStore((s) => String(s.user?.id ?? ""));
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [showAiAssign, setShowAiAssign] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ columnId?: string; title?: string; parentTask?: ParentTask }>({});
  const [filters, setFilters] = useState<ToolbarFilterState>(DEFAULT_TASK_FILTER_STATE);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const { data: columnsData = DEFAULT_COLUMNS, isLoading: columnsLoading, isError: columnsError } = useKanbanColumns(projectId);
  const { data: sprintsData = [] } = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: () => TaskService.getSprints(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60_000,
  });

  const { data: savedFilters = [] } = useQuery({
    queryKey: ["saved-filters", projectId],
    queryFn: () => TaskService.getSavedFilters(projectId),
    enabled: !!projectId,
  });

  const isBacklogOnly = filters.sprintScope === "backlog";

  const effectiveTaskParams = useMemo(() => {
    const params: Record<string, unknown> = { page: 0, size: 200 };
    if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
    if (filters.assigneeId) params.assigneeId = filters.assigneeId;
    if (filters.priorities.length > 0) {
      params.priority = filters.priorities;
    }
    if (filters.sprintScope === "sprint" && filters.sprintId) params.sprintId = filters.sprintId;
    if (filters.smartFilter === "in_progress") params.status = "IN_PROGRESS";
    if (filters.smartFilter === "overdue") params.overdue = true;
    if (filters.smartFilter === "my_tasks") params.assigneeId = "me";
    return params;
  }, [debouncedSearch, filters]);

  const { data: tasksData, isLoading: tasksLoading, isFetching: tasksFetching } = useQuery({
    queryKey: [isBacklogOnly ? "backlog-board-tasks" : "tasks", projectId, effectiveTaskParams],
    queryFn: () =>
      isBacklogOnly
        ? TaskService.getBacklog(projectId, effectiveTaskParams as any)
        : TaskService.getTasks(projectId, effectiveTaskParams as any),
    enabled: !!projectId,
    staleTime: 30_000,
  });

    const { data: membersData } = useQuery({
        queryKey: ["project-members", projectId],
        queryFn: () => ProjectMemberService.getMembers(projectId),
        enabled: !!projectId,
  });

  const { data: projectData } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn: () => ProjectService.getById(projectId),
    enabled: !!projectId,
  });

  const members: Member[] = useMemo(() => {
    const raw = membersData as unknown;
    const list = (
      raw && typeof raw === "object" && "data" in raw
        ? (raw as { data?: ProjectMemberLike[] }).data
        : raw
    ) as ProjectMemberLike[] | undefined;
    if (!Array.isArray(list)) return [];
    return list.flatMap((m) => {
      const id = m.user?.id ?? m.id;
      if (id == null || String(id).trim() === "") return [];
      return [
        {
          id: String(id),
          name: m.user?.fullName || m.fullName || "Unknown",
          email: m.user?.email || m.email || "",
          avatarUrl: m.user?.avatarUrl || m.avatarUrl || undefined,
        },
      ];
    });
  }, [membersData]);

  const columns = useMemo(() => mapColumns(columnsData), [columnsData]);
  const tasks = useMemo<TaskCardData[]>(() => {
    const list = tasksData?.content ?? [];
    return list.map((t) => ({
      id: t.id,
      taskId: t.taskCode,
      title: t.title,
      type: mapType(t.type),
      priority: mapPriority(t.priority),
      status: t.columnId,
      assignee: t.assignee
        ? { id: t.assignee.id, fullName: t.assignee.fullName, avatarUrl: t.assignee.avatarUrl }
        : null,
      dueDate: t.dueDate,
      storyPoints: t.storyPoints,
      commentCount: t.commentsCount,
      attachmentCount: t.attachmentsCount,
      subTaskCount: t.subtaskCount,
      subTaskDoneCount: t.subtaskDone,
      position: t.taskPosition,
      isOverdue: t.overdue,
      isRecurring: t.recurring,
    }));
  }, [tasksData]);

  const openTaskById = (taskId: string) => {
    setSelectedTaskId(taskId);
    const task = tasks.find((x) => x.id === taskId);
    if (task) onTaskClick?.(task);
  };

  const hasAnyFilterActive = useMemo(
    () =>
      Boolean(
        filters.search ||
          filters.assigneeId ||
          filters.priorities.length ||
          filters.sprintScope !== "all" ||
          filters.smartFilter !== "none"
      ),
    [filters]
  );

  const sprintOptions = useMemo(
    () =>
      sprintsData.map((s) => ({
        id: s.id,
        name: s.name,
        isActive: s.status === "ACTIVE",
      })),
    [sprintsData]
  );

  const applySavedFilter = (filterId: string) => {
    const found = savedFilters.find((f) => f.id === filterId);
    if (!found) return;
    setFilters(normalizeSavedTaskFilterCriteria((found.filterCriteria ?? {}) as Record<string, unknown>));
  };

  const saveCurrentFilter = async (name: string) => {
    try {
      await TaskService.createSavedFilter(projectId, {
        name,
        filterCriteria: toSavedTaskFilterCriteria(filters) as any,
      } as any);
      toast.success(t("filter.saved", { defaultValue: "Đã lưu bộ lọc" }));
      queryClient.invalidateQueries({ queryKey: ["saved-filters", projectId] });
    } catch (error) {
      handleKanbanError(error);
    }
  };

  const deleteSavedFilter = async (filterId: string) => {
    try {
      await TaskService.deleteSavedFilter(filterId);
      toast.success(t("filter.deleted", { defaultValue: "Đã xoá bộ lọc" }));
      queryClient.invalidateQueries({ queryKey: ["saved-filters", projectId] });
    } catch (error) {
      handleKanbanError(error);
    }
  };

  const handleStatusChange = async (payload: MoveTaskPayload) => {
    const targetColumn = columns.find((c) => c.id === payload.targetColumnId);
    const task = tasks.find((t) => t.id === payload.taskId);
    if (
      targetColumn?.status === "DONE" &&
      task &&
      (task.subTaskCount ?? 0) > (task.subTaskDoneCount ?? 0)
    ) {
      const remaining = (task.subTaskCount ?? 0) - (task.subTaskDoneCount ?? 0);
      const confirmed = window.confirm(
        `Còn ${remaining} sub-task chưa xong. Vẫn chuyển sang Done?`
      );
      if (!confirmed) return;
    }

    moveTaskMutation.mutate(payload);
  };

  useProjectWebSocket(projectId);

  const createTask = useCreateTask(projectId);

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => TaskService.deleteTask(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["backlog-board-tasks", projectId] });
      toast.success("Đã xóa task");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Không thể xóa task");
    },
  });
  const moveTaskMutation = useMutation({
    mutationFn: async (payload: MoveTaskPayload) => {
      const isColumnChange = payload.sourceColumnId !== payload.targetColumnId;
      const targetColumn = columns.find((c) => c.id === payload.targetColumnId);
      if (!targetColumn) throw new Error("Target column not found");

      if (isColumnChange) {
        await TaskService.updateStatus(projectId, payload.taskId, {
          status: targetColumn.status as any,
        });
      }

      await TaskService.updatePosition(projectId, payload.taskId, {
        statusColumnId: payload.targetColumnId,
        newPosition: payload.newPosition,
      });
      return { payload, isColumnChange, targetStatus: targetColumn.status, targetColumnName: targetColumn.name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activity", projectId, data.payload.taskId] });
      if (data.isColumnChange) {
        toast.success(`Đã chuyển sang ${data.targetColumnName}`);
      }
    },
    onMutate: async (payload) => {
      const key = [isBacklogOnly ? "backlog-board-tasks" : "tasks", projectId, effectiveTaskParams];
      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData(key);
      const targetColumn = columns.find((c) => c.id === payload.targetColumnId);
      queryClient.setQueryData(key, (old: any) => moveTaskInCache(old, payload, targetColumn?.status));
      return { snapshot, key };
    },
    onError: async (error: any, payload, context) => {
      if (context?.snapshot) queryClient.setQueryData(context.key, context.snapshot);
      
      if (error.response?.status === 422) {
        toast.error(
          error.response?.data?.meta?.message ??
            error.response?.data?.message ??
            "Không thể chuyển trạng thái"
        );
        return;
      }
      
      handleKanbanError(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["backlog-board-tasks", projectId] });
    },
  });

  const effectiveKanbanRole = projectData?.data
    ? toKanbanUserRole(projectData.data.myRole, projectData.data.isOwner)
    : currentUserRole;

  if (columnsLoading || tasksLoading) {
    return (
      <div className="h-[60vh] grid place-items-center rounded-xl border border-gray-200 bg-white shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (columnsError) {
                    return (
      <div className="h-[60vh] grid place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm">
        {t("kanban.loadError", { defaultValue: "Không thể tải Kanban board" })}
      </div>
    );
  }

  const roleForPanel: "PM" | "MEMBER" | "VIEWER" = projectData?.data
    ? toTaskPanelRole(projectData.data.myRole, projectData.data.isOwner)
    : effectiveKanbanRole === "PROJECT_MANAGER" || effectiveKanbanRole === "SYSTEM_ADMIN"
      ? "PM"
      : effectiveKanbanRole === "MEMBER"
        ? "MEMBER"
        : "VIEWER";
  const canUseAi = effectiveKanbanRole === "PROJECT_MANAGER" || effectiveKanbanRole === "SYSTEM_ADMIN";

  return (
    <div className="h-full">
      <KanbanBoardUI
        projectId={projectId}
        columns={columns}
        tasks={tasks}
        userRole={
          effectiveKanbanRole === "SYSTEM_ADMIN" ? "PROJECT_MANAGER" : effectiveKanbanRole
        }
        currentUserId={currentUserId}
        onDeleteTask={deleteTaskMutation.mutate}
        onStatusChange={handleStatusChange}
        onCreateTask={(columnId) => {
          setCreateDefaults({ columnId });
          setShowCreate(true);
        }}
        onCardClick={openTaskById}
        filterValue={filters}
        onFilterChange={setFilters}
        sprints={sprintOptions}
        members={members}
        savedFilters={savedFilters.map((f) => ({ id: f.id, name: f.name, filterCriteria: f.filterCriteria }))}
        onApplySavedFilter={applySavedFilter}
        onSaveCurrentFilter={saveCurrentFilter}
        onDeleteSavedFilter={deleteSavedFilter}
        isFetching={tasksFetching}
        onAiGenerate={() => setShowAiGenerator(true)}
        onAiAssign={() => setShowAiAssign(true)}
      />

      <TaskDetailPanel
        taskId={selectedTaskId}
        projectId={projectId}
        projectMembers={members}
        currentUserRole={roleForPanel}
        onClose={() => setSelectedTaskId(null)}
      />

      <AnimatePresence>
        {showCreate && (
          <FullCreateTask
            projectId={projectId}
            defaultColumnId={createDefaults.columnId || columns[0]?.id}
            defaultTitle={createDefaults.title}
            parentTask={createDefaults.parentTask}
            projectMembers={members}
            columns={columns.map((c) => ({ id: c.id, name: c.name, color: c.colorHex }))}
            projectKey={projectData?.data?.projectKey}
            onConfirm={(payload: CreateTaskPayload) => {
              createTask.mutate(
                {
            title: payload.title,
            description: payload.description,
            type: payload.type,
            priority: payload.priority,
            assigneeId: payload.assigneeId ?? undefined,
            dueDate: payload.dueDate ?? undefined,
            storyPoints: payload.storyPoints ?? undefined,
            statusColumnId: payload.statusColumnId,
            parentTaskId: payload.parentTaskId ?? undefined,
            sprintId: payload.sprintId ?? undefined,
                },
                {
                  onSuccess: () => {
                    setShowCreate(false);
                    setCreateDefaults({});
                  },
                }
              );
            }}
            onClose={() => {
              setShowCreate(false);
              setCreateDefaults({});
            }}
                    />
                )}
            </AnimatePresence>

      {showAiGenerator && canUseAi && (
        <AiTaskGenerator
          projectId={projectId}
          projectName={projectData?.data?.name ?? ""}
          onSuccess={(count) => {
            toast.success(`Da tao ${count} task thanh cong!`);
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
            queryClient.invalidateQueries({ queryKey: ["backlog-board-tasks", projectId] });
          }}
          onClose={() => setShowAiGenerator(false)}
        />
      )}

      {showAiAssign && canUseAi && (
        <AiAssignReview
          projectId={projectId}
          onSuccess={(result) => {
            toast.success(`Da phan cong ${result.totalAssigned} task (${result.aiConfirmed} AI · ${result.pmOverridden} override)`);
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
            queryClient.invalidateQueries({ queryKey: ["backlog-board-tasks", projectId] });
          }}
          onClose={() => setShowAiAssign(false)}
        />
      )}
        </div>
  );
}
