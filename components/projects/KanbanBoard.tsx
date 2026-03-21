"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { TaskDetailService } from "@/app/services/TaskDetailService";
import { SubtaskBlockedDialog } from "@/components/kanban/SubtaskBlockedDialog";
import type { SubTaskResponse } from "@/app/types/task.schema";

import { TaskService } from "@/app/services/TaskService";
import { ProjectService } from "@/app/services/ProjectService";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { useCreateTask } from "@/hooks/useTaskQueries";
import { useKanbanColumns, DEFAULT_COLUMNS } from "@/hooks/useKanbanColumns";
import { useProjectWebSocket } from "@/hooks/useProjectWebSocket";
import { useAuthStore } from "@/stores/useAuthStore";
import { handleKanbanError } from "@/lib/errorHandler";

import KanbanBoardUI, {
  type Column,
  type TaskCardData,
} from "@/components/kanban/KanbanBoard";
import type { ToolbarFilterState } from "@/components/kanban/KanbanToolbar";
import CalendarView from "./CalendarView";
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
  onViewChange?: (view: "board" | "list" | "calendar") => void;
  currentView?: "board" | "list" | "calendar";
}

interface AuthStateLike {
  userDetail?: {
    id?: string;
    userId?: string;
  };
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

const defaultFilters: ToolbarFilterState = {
  search: "",
  onlyMe: false,
  unassigned: false,
  priorities: [],
  sprint: null,
  smartFilter: "none",
};

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
    onViewChange: externalOnViewChange,
    currentView: externalCurrentView,
}: KanbanBoardProps = {}) {
  const { t } = useTranslation();
  const params = useParams();
  const queryClient = useQueryClient();
  const projectId = params.id as string;

  const currentUserId = useAuthStore((s: AuthStateLike) => s.userDetail?.id ?? s.userDetail?.userId ?? "");
  const [internalView, setInternalView] = useState<"board" | "calendar">("board");
  const view = externalCurrentView === "calendar" ? "calendar" : externalCurrentView === "board" ? "board" : internalView;
  const setView = (next: "board" | "calendar") => {
    if (externalOnViewChange) {
      externalOnViewChange(next);
      return;
    }
    setInternalView(next);
  };

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ columnId?: string; title?: string; parentTask?: ParentTask }>({});
  const [filters, setFilters] = useState<ToolbarFilterState>(defaultFilters);
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

  const effectiveTaskParams = useMemo(() => {
    const params: Record<string, unknown> = { page: 0, size: 200 };
    if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
    if (filters.unassigned) params.assigneeId = "unassigned";
    else if (filters.onlyMe && currentUserId) params.assigneeId = currentUserId;
    if (filters.priorities.length > 0) {
      params.priority = filters.priorities.map((p) => p.toUpperCase()).join(",");
    }
    if (filters.sprint) params.sprintId = filters.sprint;
    if (filters.smartFilter === "in_progress") params.status = "IN_PROGRESS";
    if (filters.smartFilter === "overdue") params.overdue = true;
    if (filters.smartFilter === "my_tasks" && currentUserId) params.assigneeId = currentUserId;
    return params;
  }, [debouncedSearch, filters, currentUserId]);

  const { data: tasksData, isLoading: tasksLoading, isFetching: tasksFetching } = useQuery({
    queryKey: ["tasks", projectId, effectiveTaskParams],
    queryFn: () => TaskService.getTasks(projectId, effectiveTaskParams as any),
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
    return list.map((m) => ({
            id: m.user?.id || m.id,
            name: m.user?.fullName || m.fullName || "Unknown",
            email: m.user?.email || m.email || "",
      avatarUrl: m.user?.avatarUrl || m.avatarUrl || undefined,
    }));
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
    }));
  }, [tasksData]);

  const hasAnyFilterActive = useMemo(
    () =>
      Boolean(
        filters.search ||
          filters.onlyMe ||
          filters.unassigned ||
          filters.priorities.length ||
          filters.sprint ||
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
    const criteria = (found.filterCriteria ?? {}) as Record<string, unknown>;
    setFilters((prev) => ({
      ...prev,
      search: String(criteria.q ?? ""),
      onlyMe: Boolean(criteria.onlyMe ?? false),
      unassigned: Boolean(criteria.unassigned ?? false),
      priorities: Array.isArray(criteria.priorities)
        ? (criteria.priorities as string[]).map((p) => p.toLowerCase() as any)
        : [],
      sprint: typeof criteria.sprintId === "string" ? criteria.sprintId : null,
      smartFilter: (criteria.smartFilter as ToolbarFilterState["smartFilter"]) ?? "none",
    }));
  };

  const saveCurrentFilter = async (name: string, scope: "PERSONAL" | "PROJECT") => {
    try {
      await TaskService.createSavedFilter(projectId, {
        name,
        filterCriteria: {
          q: filters.search,
          onlyMe: filters.onlyMe,
          unassigned: filters.unassigned,
          priorities: filters.priorities,
          sprintId: filters.sprint,
          smartFilter: filters.smartFilter,
        } as any,
        ...(scope ? ({ scope } as any) : {}),
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

  const [blockedDialog, setBlockedDialog] = useState<{
    open: boolean;
    taskId: string;
    taskTitle: string;
    pendingSubtasks: SubTaskResponse[];
  } | null>(null);

  const fetchPendingSubtasks = async (taskId: string) => {
    try {
      const subtasks = await TaskDetailService.getSubtasks(taskId);
      return subtasks.filter(
        (s) => s.taskStatus !== "DONE" && s.taskStatus !== "CANCELLED"
      );
    } catch (error) {
      console.error("Failed to fetch subtasks:", error);
      return [];
    }
  };

  const handleStatusChange = async (payload: MoveTaskPayload) => {
    const targetColumn = columns.find((c) => c.id === payload.targetColumnId);
    const task = tasks.find((t) => t.id === payload.taskId);

    if (targetColumn?.status === "DONE" && task) {
      // FE pre-check based on existing counts
      if ((task.subTaskCount ?? 0) > (task.subTaskDoneCount ?? 0)) {
        const pendingSubtasks = await fetchPendingSubtasks(payload.taskId);
        if (pendingSubtasks.length > 0) {
          setBlockedDialog({
            open: true,
            taskId: payload.taskId,
            taskTitle: task.title,
            pendingSubtasks,
          });
          return;
        }
      }
    }

    moveTaskMutation.mutate(payload);
  };

  useProjectWebSocket(projectId);

  const createTask = useCreateTask(projectId);
  const moveTaskMutation = useMutation({
    mutationFn: async (payload: MoveTaskPayload) => {
      const isColumnChange = payload.sourceColumnId !== payload.targetColumnId;
      const targetColumn = columns.find((c) => c.id === payload.targetColumnId);
      if (!targetColumn) throw new Error("Target column not found");

      if (isColumnChange) {
        await TaskService.updateStatus(projectId, payload.taskId, {
          status: targetColumn.status as any,
          statusColumnId: payload.targetColumnId,
        });
      }

      await TaskService.updatePosition(projectId, payload.taskId, {
        statusColumnId: payload.targetColumnId,
        newPosition: payload.newPosition,
      });
      return { payload, isColumnChange, targetStatus: targetColumn.status, targetColumnName: targetColumn.name };
    },
    onSuccess: (data) => {
      const task = tasks.find((t) => t.id === data.payload.taskId);
      if (task) {
        toast.success(`${task.title} chuyển sang cột ${data.targetColumnName} thành công`);
      }
    },
    onMutate: async (payload) => {
      const key = ["tasks", projectId, effectiveTaskParams];
      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData(key);
      const targetColumn = columns.find((c) => c.id === payload.targetColumnId);
      queryClient.setQueryData(key, (old: any) => moveTaskInCache(old, payload, targetColumn?.status));
      return { snapshot, key };
    },
    onError: async (error: any, payload, context) => {
      if (context?.snapshot) queryClient.setQueryData(context.key, context.snapshot);
      
      // Handle 422 error from BE (defense in depth)
      if (error.response?.status === 422) {
        const message = error.response.data?.meta?.message || "";
        const task = tasks.find((t) => t.id === payload.taskId);
        
        if (message.toLowerCase().includes("sub-task") && task) {
          const pendingSubtasks = await fetchPendingSubtasks(payload.taskId);
          setBlockedDialog({
            open: true,
            taskId: payload.taskId,
            taskTitle: task.title,
            pendingSubtasks,
          });
          return;
        }
      }
      
      handleKanbanError(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

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

  const roleForPanel: "PM" | "MEMBER" | "VIEWER" =
    currentUserRole === "PROJECT_MANAGER" || currentUserRole === "SYSTEM_ADMIN"
      ? "PM"
      : currentUserRole === "MEMBER"
      ? "MEMBER"
      : "VIEWER";

  return (
    <div className="h-full">
      {view === "board" ? (
        <KanbanBoardUI
          projectId={projectId}
          columns={columns}
          tasks={tasks}
          userRole={currentUserRole === "SYSTEM_ADMIN" ? "PROJECT_MANAGER" : currentUserRole}
          currentUserId={currentUserId}
          onStatusChange={handleStatusChange}
          onCreateTask={(columnId) => {
            setCreateDefaults({ columnId });
            setShowCreate(true);
          }}
          onCardClick={(taskId) => {
            setSelectedTaskId(taskId);
            const task = tasks.find((x) => x.id === taskId);
            if (task) onTaskClick?.(task);
          }}
          onViewChange={setView}
          view={view}
          filterValue={filters}
          onFilterChange={setFilters}
          sprints={sprintOptions}
          savedFilters={savedFilters.map((f) => ({ id: f.id, name: f.name, filterCriteria: f.filterCriteria }))}
          onApplySavedFilter={applySavedFilter}
          onSaveCurrentFilter={saveCurrentFilter}
          onDeleteSavedFilter={deleteSavedFilter}
          isFetching={tasksFetching}
        />
      ) : (
        <CalendarView
          projectId={projectId}
          onTaskClick={(id) => setSelectedTaskId(id)}
          onViewChange={setView}
          currentView="calendar"
        />
      )}

      {blockedDialog?.open && (
        <SubtaskBlockedDialog
          open={blockedDialog.open}
          taskTitle={blockedDialog.taskTitle}
          pendingSubtasks={blockedDialog.pendingSubtasks}
          onClose={() => setBlockedDialog(null)}
          onViewSubtasks={() => {
            setSelectedTaskId(blockedDialog.taskId);
            // We can't easily scroll inside the panel from here without refs, 
            // but opening the panel is already helpful.
            // The TaskDetailPageContent could potentially handle scrolling if it sees a hash or prop.
          }}
        />
      )}

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
            columns={columns.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
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
        </div>
  );
}
