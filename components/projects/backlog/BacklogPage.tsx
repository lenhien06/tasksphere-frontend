"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Link from "next/link"
import {
    Plus,
    Zap,
    Search,
    ChevronLeft,
    ChevronRight,
    X,
    Filter,
    CheckCircle,
    Layers,
    ChevronDown,
    RefreshCw,
} from "lucide-react"
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    closestCenter,
    useDroppable,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core"
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import { TaskService } from "@/app/services/TaskService"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { ProjectService } from "@/app/services/ProjectService"
import TaskDetailPanel from "@/components/projects/TaskDetailPanel"
import { FullCreateTask } from "@/components/projects/TaskFormModals"
import { useProjectWebSocket } from "@/hooks/useProjectWebSocket"
import { useAuthStore } from "@/stores/useAuthStore"
import { useBacklogTasks } from "@/hooks/useBacklogTasks"
import { useProjectSprints } from "@/hooks/useProjectSprints"
import type {
    TaskFilterParams,
    TaskResponse,
} from "@/app/types/task.schema"

import { cn } from "@/lib/utils"
import { SprintSection } from "./SprintSection"
import { StartSprintModal } from "./StartSprintModal"
import { CompleteSprintModal } from "./CompleteSprintModal"
import { CreateSprintModal } from "./CreateSprintModal"
import { BacklogTaskRow, SortableBacklogTaskRow } from "./BacklogTaskRow"
import { AiTaskGenerator } from "@/components/ai/AiTaskGenerator"
import { AiAssignReview } from "@/components/ai/AiAssignReview"
import { orderSprintsForBacklogUi } from "./utils"
import TaskFilterPopover from "@/components/projects/TaskFilterPopover"
import TaskPrimaryActions from "@/components/projects/TaskPrimaryActions"
import {
    DEFAULT_TASK_FILTER_STATE,
    countActiveTaskFilters,
    normalizeSavedTaskFilterCriteria,
    toSavedTaskFilterCriteria,
    type TaskFilterState,
} from "@/components/projects/task-filter-utils"
import { PriorityDot, TypeBadgeMini } from "./backlog-row-shared"

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const h = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(h)
    }, [value, delay])
    return debouncedValue
}

export interface BacklogPageProps {
    projectId: string
    myRole?: string
}

export default function BacklogPage({ projectId, myRole = "VIEWER" }: BacklogPageProps) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    useProjectWebSocket(projectId)

    const currentUserId = useAuthStore((s) => String(s.user?.id ?? ""))

    const isPM = myRole === "project_manager" || myRole === "system_admin"
    const isMemberOnly = myRole === "member"
    const isViewer = !isPM && !isMemberOnly

    // AI Modal state
    const [showAiGenerator, setShowAiGenerator] = useState(false)
    const [showAiAssign,    setShowAiAssign]     = useState(false)
    const canReorderBacklog = isPM || isMemberOnly

    const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_TASK_FILTER_STATE)
    const [sortBy, setSortBy] = useState("taskPosition,asc")
    const [page, setPage] = useState(0)

    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [showBatchSprintMenu, setShowBatchSprintMenu] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showCreateSprintModal, setShowCreateSprintModal] = useState(false)
    const [activeDraggedTask, setActiveDraggedTask] = useState<TaskResponse | null>(null)
    const [sprintOpen, setSprintOpen] = useState<Record<string, boolean>>({})
    const [startTargetId, setStartTargetId] = useState<string | null>(null)
    const [completeTargetId, setCompleteTargetId] = useState<string | null>(null)
    const backlogDropId = "backlog-drop"

    const debouncedSearch = useDebounce(filters.search, 300)

    useEffect(() => setPage(0), [debouncedSearch, filters.assigneeId, filters.priorities, filters.type, sortBy])

    const params: TaskFilterParams = useMemo(
        () => ({
            ...(debouncedSearch && { q: debouncedSearch }),
            ...(filters.priorities.length > 0 && { priority: filters.priorities }),
            ...(filters.type && { type: filters.type }),
            ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
            sort: sortBy,
            page,
            size: 20,
        }),
        [debouncedSearch, filters.assigneeId, filters.priorities, filters.type, sortBy, page],
    )

    const backlogQuery = useBacklogTasks(projectId, params)
    const sprintsQuery = useProjectSprints(projectId)
    const sprints = sprintsQuery.data ?? []
    const orderedSprints = useMemo(() => orderSprintsForBacklogUi(sprints), [sprints])
    const activeSprint = sprints.find(s => s.status === "ACTIVE") ?? null
    const assignableSprints = useMemo(
        () => orderSprintsForBacklogUi(sprints.filter(s => s.status !== "COMPLETED")),
        [sprints]
    )

    useEffect(() => {
        setSprintOpen(prev => {
            const next = { ...prev }
            let changed = false
            for (const s of sprints) {
                if (next[s.id] === undefined) {
                    next[s.id] = s.status === "ACTIVE"
                    changed = true
                }
            }
            return changed ? next : prev
        })
    }, [sprints])

    const { data: projectMembers = [] } = useQuery({
        queryKey: ["project-members", projectId],
        queryFn: () => ProjectMemberService.getMembers(projectId),
        enabled: !!projectId,
    })

    const { data: projectColumns = [] } = useQuery({
        queryKey: ["project-columns", projectId],
        queryFn: () => TaskService.getColumns(projectId),
        enabled: !!projectId,
    })

    const { data: savedFilters = [] } = useQuery({
        queryKey: ["saved-filters", projectId],
        queryFn: () => TaskService.getSavedFilters(projectId),
        enabled: !!projectId,
    })

    const { data: projectDetail } = useQuery({
        queryKey: ["project-detail", projectId],
        queryFn: () => ProjectService.getById(projectId),
        enabled: !!projectId,
    })

    const tasks = backlogQuery.data?.content ?? []
    const totalElements = backlogQuery.data?.totalElements ?? 0
    const totalPages = backlogQuery.data?.totalPages ?? 0
    const totalStoryPoints = tasks.reduce((sum, x) => sum + (x.storyPoints ?? 0), 0)
    const from = page * (params.size || 20) + (tasks.length ? 1 : 0)
    const to = Math.min((page + 1) * (params.size || 20), totalElements)
    const hasActiveFilters = countActiveTaskFilters(filters, {
        includeSmartFilter: false,
        includeSprintFilter: false,
        includeTypeFilter: true,
    }) > 0

    const resetFilters = () => {
        setFilters(DEFAULT_TASK_FILTER_STATE)
        setSortBy("taskPosition,asc")
    }

    const applySavedFilter = (filterId: string) => {
        const found = savedFilters.find((item) => item.id === filterId)
        if (!found) return

        const normalized = normalizeSavedTaskFilterCriteria((found.filterCriteria ?? {}) as Record<string, unknown>)
        setFilters({
            ...DEFAULT_TASK_FILTER_STATE,
            search: normalized.search,
            assigneeId: normalized.smartFilter === "my_tasks" ? "me" : normalized.assigneeId,
            priorities: normalized.priorities,
            type: normalized.type,
        })
        toast.success(t("filter.applied", { name: found.name }))
    }

    const saveCurrentFilter = async (name: string) => {
        try {
            await TaskService.createSavedFilter(projectId, {
                name,
                filterCriteria: toSavedTaskFilterCriteria(filters) as any,
            } as any)
            toast.success(t("filter.saved"))
            queryClient.invalidateQueries({ queryKey: ["saved-filters", projectId] })
        } catch (err: any) {
            if (err?.response?.status === 422) toast.error(t("filter.maxFilters"))
            else toast.error(t("filter.saveError"))
        }
    }

    const deleteSavedFilter = async (filterId: string) => {
        try {
            await TaskService.deleteSavedFilter(filterId)
            toast.success(t("filter.deleted"))
            queryClient.invalidateQueries({ queryKey: ["saved-filters", projectId] })
        } catch {
            toast.error(t("filter.deleteError"))
        }
    }

    const handleSelect = (id: string) => {
        setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]))
    }

    const handleSelectAll = () => {
        if (selectedIds.length === tasks.length && tasks.length > 0) setSelectedIds([])
        else setSelectedIds(tasks.map(x => x.id))
    }

    const handleAssignToSprint = async (taskId: string, sprintId: string) => {
        try {
            // Check if target sprint is ACTIVE - show warning
            const targetSprint = sprints.find(s => s.id === sprintId)
            if (targetSprint?.status === "ACTIVE") {
                const confirmed = window.confirm(
                    `Sprint "${targetSprint.name}" đang chạy. Thêm task vào sprint đang chạy. Tiếp tục?`
                )
                if (!confirmed) return
            }

            await TaskService.assignTaskToSprint(taskId, sprintId)
            queryClient.invalidateQueries({ queryKey: ["backlog", projectId] })
            queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
            queryClient.invalidateQueries({ queryKey: ["sprint-tasks", projectId] })
            toast.success(t("backlog.assignedToSprint"))
        } catch (err: any) {
            toast.error(err?.response?.data?.meta?.message ?? err?.response?.data?.message ?? t("backlog.assignError"))
        }
    }

    const handleMoveTaskToBacklog = async (taskId: string) => {
        try {
            await TaskService.assignTaskToSprint(taskId, null)
            queryClient.invalidateQueries({ queryKey: ["backlog", projectId] })
            queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
            queryClient.invalidateQueries({ queryKey: ["sprint-tasks", projectId] })
            toast.success(t("backlog.movedToBacklog"))
        } catch (err: any) {
            toast.error(err?.response?.data?.meta?.message ?? t("backlog.moveToBacklogError"))
        }
    }

    const handleBatchAssign = async (sprintId: string) => {
        if (selectedIds.length === 0) return
        try {
            // Check if target sprint is ACTIVE - show warning
            const targetSprint = sprints.find(s => s.id === sprintId)
            if (targetSprint?.status === "ACTIVE") {
                const confirmed = window.confirm(
                    `Sprint "${targetSprint.name}" đang chạy. Thêm ${selectedIds.length} task vào sprint đang chạy. Tiếp tục?`
                )
                if (!confirmed) return
            }

            const result = await TaskService.batchAssignToSprint(projectId, selectedIds, sprintId)
            toast.success(result.message || t("backlog.batchAssigned", { count: result.updatedCount }))
            if (result.failedIds?.length)
                toast.warning(t("backlog.batchPartialFail", { count: result.failedIds.length }))
            setSelectedIds([])
            setShowBatchSprintMenu(false)
            queryClient.invalidateQueries({ queryKey: ["backlog", projectId] })
            queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
            queryClient.invalidateQueries({ queryKey: ["sprint-tasks", projectId] })
        } catch (err: any) {
            toast.error(err?.response?.data?.meta?.message ?? t("backlog.batchAssignError"))
        }
    }

    const deleteTaskMutation = useMutation({
        mutationFn: (taskId: string) => TaskService.deleteTask(projectId, taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["backlog", projectId] })
            toast.success(t("backlog.deleteTaskSuccess"))
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? t("backlog.deleteTaskError"))
        },
    })

    const handleCreateTask = async (payload: unknown) => {
        await TaskService.createTask(projectId, payload as any)
        queryClient.invalidateQueries({ queryKey: ["backlog", projectId] })
        toast.success(t("task.create") + " — " + t("common.success").toLowerCase())
    }

    const startSprintModalSprint = sprints.find(s => s.id === startTargetId) ?? null
    const completeSprintModalSprint = sprints.find(s => s.id === completeTargetId) ?? null

    const onClickStart = (sprintId: string) => {
        if (activeSprint) {
            toast.error(t("backlog.activeSprintBlockToast"))
            return
        }
        setStartTargetId(sprintId)
    }

    const reorderMutation = useMutation({
        mutationFn: async ({ taskId, columnId, newPosition }: { taskId: string; columnId: string; newPosition: number }) => {
            await TaskService.updatePosition(projectId, taskId, { statusColumnId: columnId, newPosition })
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.meta?.message ?? t("backlog.reorderError"))
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["backlog", projectId] })
        },
    })

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
    )
    const { setNodeRef: setBacklogDropRef, isOver: isOverBacklog } = useDroppable({
        id: backlogDropId,
        disabled: !(isPM || isMemberOnly),
        data: {
            type: "backlog-drop",
        },
    })

    const positionSortActive = sortBy === "taskPosition,asc"
    const canDragBetweenSections = isPM
    const useSortableList = canReorderBacklog && !backlogQuery.isLoading && tasks.length > 0
    const backlogTaskIds = useMemo(() => new Set(tasks.map(task => task.id)), [tasks])

    const handleDragEnd = (e: DragEndEvent) => {
        const { active, over } = e
        if (!over) return

        const activeData = active.data.current as { taskId?: string; sourceSprintId?: string | null } | undefined
        const taskId = String(activeData?.taskId ?? active.id)
        const sourceSprintId = activeData?.sourceSprintId ?? null
        const overId = String(over.id)

        if (!sourceSprintId && positionSortActive && backlogTaskIds.has(overId) && active.id !== over.id) {
            const oldIndex = tasks.findIndex(x => x.id === active.id)
            const newIndex = tasks.findIndex(x => x.id === over.id)
            if (oldIndex >= 0 && newIndex >= 0) {
                const moved = tasks[oldIndex]
                const reordered = arrayMove(tasks, oldIndex, newIndex)
                const nid = reordered[newIndex]?.id
                if (nid === moved.id) {
                    reorderMutation.mutate({
                        taskId: moved.id,
                        columnId: moved.columnId,
                        newPosition: newIndex,
                    })
                    return
                }
            }
        }

        if (!canDragBetweenSections) return

        if (overId === backlogDropId || backlogTaskIds.has(overId)) {
            if (sourceSprintId) {
                void handleMoveTaskToBacklog(taskId)
            }
            return
        }

        if (overId.startsWith("sprint-drop-")) {
            const targetSprintId = overId.replace("sprint-drop-", "")
            if (!targetSprintId || targetSprintId === sourceSprintId) return
            void handleAssignToSprint(taskId, targetSprintId)
        }
    }

    const handleDragStart = (e: DragStartEvent) => {
        const task = (e.active.data.current as { task?: TaskResponse } | undefined)?.task ?? null
        setActiveDraggedTask(task)
    }

    const clearDraggedTask = () => setActiveDraggedTask(null)

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={(event) => {
                handleDragEnd(event)
                clearDraggedTask()
            }}
            onDragCancel={clearDraggedTask}
        >
        <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#F7F8F9]">
            <div className="sticky top-0 z-20 border-b border-[#DFE1E6] bg-white/95 px-4 py-3 backdrop-blur">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[260px] flex-1 md:max-w-sm">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={filters.search}
                            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                            placeholder={t("filter.searchTasks", { defaultValue: "Tìm theo tên task, mã task..." })}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400"
                        />
                    </div>
                    <TaskFilterPopover
                        value={filters}
                        onChange={setFilters}
                        assignees={[
                            { id: "me", name: t("backlog.me", { defaultValue: "Tôi" }) },
                            ...projectMembers.map((m: any) => ({
                                id: m.user.id,
                                name: m.user.fullName,
                                avatarUrl: m.user.avatarUrl,
                            })),
                        ]}
                        savedFilters={savedFilters.map((item) => ({
                            id: item.id,
                            name: item.name,
                            filterCriteria: item.filterCriteria,
                        }))}
                        onApplySavedFilter={applySavedFilter}
                        onSaveCurrentFilter={saveCurrentFilter}
                        onDeleteSavedFilter={deleteSavedFilter}
                        showTypeFilter
                        showSearchInput={false}
                        align="start"
                    />
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-gray-500 transition-colors hover:text-red-600"
                        >
                            {t("project.clearFilters")}
                        </button>
                    )}
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="ml-auto h-10 rounded-xl border border-gray-200 bg-[#F5F5F5] px-3 text-sm text-gray-600"
                    >
                        <option value="taskPosition,asc">{t("backlog.sortByPosition")}</option>
                        <option value="priority,desc">{t("backlog.sortHighestPriority")}</option>
                        <option value="createdAt,desc">{t("backlog.sortNewest")}</option>
                        <option value="dueDate,asc">{t("backlog.sortNearestDue")}</option>
                        <option value="storyPoints,desc">{t("backlog.sortHighestPoints")}</option>
                    </select>
                </div>
            </div>

            {/* Sprint vùng trên */}
            <div className="shrink-0 border-b border-[#DFE1E6] bg-white">
                <div className="flex items-center justify-between border-b border-[#EBECF0] px-4 py-3">
                    <div>
                        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                            <Layers size={18} className="text-blue-500" />
                            {t("sprint.title")}
                        </h2>
                    </div>
                    {isPM && (
                        <Link
                            href={`/projects/${projectId}/sprints`}
                            className="text-[11px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700"
                        >
                            {t("backlog.manage")} →
                        </Link>
                    )}
                </div>
                <div className="px-4 py-4">
                    {sprintsQuery.isError && (
                        <div className="mb-3 flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
                            <span>{t("backlog.sprintsLoadError")}</span>
                            <button
                                type="button"
                                onClick={() => sprintsQuery.refetch()}
                                className="flex items-center gap-1 font-bold text-red-900 underline"
                            >
                                <RefreshCw size={14} /> {t("common.retry")}
                            </button>
                        </div>
                    )}
                    {sprintsQuery.isLoading && (
                        <div className="space-y-2">
                            {[1, 2].map(i => (
                                <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
                            ))}
                        </div>
                    )}
                    {!sprintsQuery.isLoading && !sprintsQuery.isError && sprints.length === 0 && (
                        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-4 py-6 text-center">
                            <p className="text-sm font-semibold text-amber-900">{t("backlog.emptySprintsBanner")}</p>
                        </div>
                    )}
                    {!sprintsQuery.isLoading &&
                        orderedSprints.map(sprint => (
                            <SprintSection
                                key={sprint.id}
                                projectId={projectId}
                                sprint={sprint}
                                isOpen={sprintOpen[sprint.id] ?? sprint.status === "ACTIVE"}
                                onToggle={() =>
                                    setSprintOpen(p => {
                                        const defOpen = sprint.status === "ACTIVE"
                                        const cur = p[sprint.id] !== undefined ? p[sprint.id]! : defOpen
                                        return { ...p, [sprint.id]: !cur }
                                    })
                                }
                                isPM={isPM}
                                isMemberOnly={isMemberOnly}
                                anyActiveSprint={!!activeSprint}
                                onStartSprint={() => onClickStart(sprint.id)}
                                onCompleteSprint={() => setCompleteTargetId(sprint.id)}
                                onOpenTask={setSelectedTaskId}
                                onMoveTaskToBacklog={handleMoveTaskToBacklog}
                                dragEnabled={canDragBetweenSections}
                            />
                        ))}
                </div>
            </div>

            {/* Backlog vùng dưới */}
            <div className="flex min-h-0 flex-1 flex-col bg-white">
                <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[#EBECF0] px-4 py-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {t("common.backlog")}{" "}
                            <span className="text-base font-semibold text-gray-500">
                                ({totalElements} {t("nav.tasks").toLowerCase()})
                            </span>
                        </h1>
                        {!positionSortActive && canReorderBacklog && (
                            <p className="mt-1 text-xs text-amber-700">{t("backlog.reorderNeedsDefaultSort")}</p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {totalStoryPoints > 0 && (
                            <div className="flex items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-600">
                                <Zap size={14} className="fill-blue-500" />
                                {totalStoryPoints} pts
                            </div>
                        )}
                        {isPM && (
                            <button
                                type="button"
                                onClick={() => setShowCreateSprintModal(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                            >
                                <Plus size={16} strokeWidth={3} />
                                {t("sprint.create")}
                            </button>
                        )}
                        <TaskPrimaryActions
                            canCreateTask={isPM || isMemberOnly}
                            canUseAi={isPM}
                            onCreateTask={() => setShowCreateModal(true)}
                            onAiGenerate={() => setShowAiGenerator(true)}
                            onAiAssign={() => setShowAiAssign(true)}
                        />
                    </div>
                </div>

                <div
                    ref={setBacklogDropRef}
                    className={cn(
                        "flex min-h-0 flex-1 flex-col px-2 sm:px-4",
                        isOverBacklog && "bg-[#E9F2FF]/60"
                    )}
                >
                    <div className="flex items-center gap-2 border-b border-[#EBECF0] bg-[#F7F8F9] py-2 pl-2 pr-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        {useSortableList && <span className="w-5" />}
                        {isPM && <span className="w-4" />}
                        <span className="hidden w-[88px] md:block">{t("task.type")}</span>
                        <span className="min-w-0 flex-1">{t("backlog.taskDetails")}</span>
                        <span className="hidden w-24 md:block">{t("task.priority")}</span>
                        <span className="hidden w-14 lg:block">{t("backlog.storyPts")}</span>
                        <span className="hidden w-20 xl:block">{t("backlog.meta")}</span>
                        <span className="w-12">{t("task.assignee")}</span>
                        <span className="w-32 xl:w-36" />
                    </div>

                    <div className="min-h-[180px] flex-1 overflow-y-auto">
                        {backlogQuery.isError && (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <p className="text-sm text-red-700">{t("backlog.loadError")}</p>
                                <button
                                    type="button"
                                    onClick={() => backlogQuery.refetch()}
                                    className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white"
                                >
                                    <RefreshCw size={16} /> {t("common.retry")}
                                </button>
                            </div>
                        )}
                        {backlogQuery.isLoading && (
                            <div className="space-y-2 p-4">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
                                ))}
                            </div>
                        )}
                        {!backlogQuery.isLoading && !backlogQuery.isError && tasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                {hasActiveFilters ? (
                                    <>
                                        <Filter size={32} className="mb-4 text-gray-200" />
                                        <h3 className="mb-2 text-lg font-bold text-gray-700">{t("project.noResults")}</h3>
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="text-sm font-bold text-blue-600"
                                        >
                                            {t("project.clearFilters")}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={36} className="mb-4 text-blue-200" />
                                        <h3 className="mb-2 text-lg font-bold text-gray-800">{t("backlog.emptyTitleUi")}</h3>
                                        <p className="mb-6 max-w-sm text-sm text-gray-500">{t("backlog.emptyDescUi")}</p>
                                        {(isPM || isMemberOnly) && (
                                            <button
                                                type="button"
                                                onClick={() => setShowCreateModal(true)}
                                                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white"
                                            >
                                                {t("task.create")}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        {!backlogQuery.isLoading && !backlogQuery.isError && tasks.length > 0 && (
                            <>
                                {useSortableList ? (
                                    <SortableContext items={tasks.map(x => x.id)} strategy={verticalListSortingStrategy}>
                                        {tasks.map(task => (
                                            <SortableBacklogTaskRow
                                                key={task.id}
                                                task={task}
                                                isSelected={selectedIds.includes(task.id)}
                                                onSelect={handleSelect}
                                                onClick={() => setSelectedTaskId(task.id)}
                                                isPM={isPM}
                                                isMemberOnly={isMemberOnly}
                                                isViewer={isViewer}
                                                currentUserId={currentUserId}
                                                projectId={projectId}
                                                sprintOptions={assignableSprints}
                                                onAssignToSprint={handleAssignToSprint}
                                                onDeleteTask={deleteTaskMutation.mutate}
                                                sortable
                                                dragDisabled={!positionSortActive && !canDragBetweenSections}
                                            />
                                        ))}
                                    </SortableContext>
                                ) : (
                                    tasks.map(task => (
                                        <BacklogTaskRow
                                            key={task.id}
                                            task={task}
                                            isSelected={selectedIds.includes(task.id)}
                                            onSelect={handleSelect}
                                            onClick={() => setSelectedTaskId(task.id)}
                                            isPM={isPM}
                                            isMemberOnly={isMemberOnly}
                                            isViewer={isViewer}
                                            currentUserId={currentUserId}
                                            projectId={projectId}
                                            sprintOptions={assignableSprints}
                                            onAssignToSprint={handleAssignToSprint}
                                            onDeleteTask={deleteTaskMutation.mutate}
                                            sortable={canDragBetweenSections}
                                            dragDisabled={!canDragBetweenSections}
                                        />
                                    ))
                                )}
                            </>
                        )}
                    </div>

                    {totalPages > 1 && !backlogQuery.isError && (
                        <div className="flex flex-shrink-0 items-center justify-between border-t border-[#EBECF0] bg-[#FAFBFC] px-4 py-3">
                            <span className="text-xs font-medium text-gray-500">
                                {t("backlog.showing")}{" "}
                                <span className="font-bold text-gray-900">
                                    {from}–{to}
                                </span>{" "}
                                {t("common.of")}{" "}
                                <span className="font-bold text-gray-900">{totalElements}</span>
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 0}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setPage(i)}
                                        className={cn(
                                            "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold",
                                            page === i ? "bg-blue-600 text-white" : "border border-gray-200 bg-white",
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= totalPages - 1}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isPM && selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-3xl border border-gray-800 bg-gray-900 px-6 py-4 text-white shadow-xl">
                    <div className="flex items-center gap-3 border-r border-gray-700 pr-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-black">
                            {selectedIds.length}
                        </div>
                        <span className="text-sm font-bold">{t("backlog.tasksSelected")}</span>
                    </div>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowBatchSprintMenu(!showBatchSprintMenu)}
                            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold hover:bg-blue-400"
                        >
                            <Layers size={14} />
                            {t("backlog.assignToSprint")}
                            <ChevronDown size={14} className={cn(showBatchSprintMenu && "rotate-180")} />
                        </button>
                        {showBatchSprintMenu && (
                            <div className="absolute bottom-[calc(100%+8px)] left-0 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1 shadow-2xl">
                                <p className="border-b px-3 py-2 text-[10px] font-bold uppercase text-gray-400">
                                    {t("backlog.selectTargetSprint")}
                                </p>
                                {assignableSprints.length === 0 ? (
                                    <p className="px-3 py-4 text-center text-xs text-gray-400">
                                        {t("backlog.noPlannedSprintsForAssign")}
                                    </p>
                                ) : (
                                    assignableSprints.map(sp => (
                                        <button
                                            key={sp.id}
                                            type="button"
                                            onClick={() => handleBatchAssign(sp.id)}
                                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"
                                        >
                                            <span className={sp.status === "ACTIVE" ? "h-2 w-2 shrink-0 rounded-full bg-emerald-500" : "h-2 w-2 shrink-0 rounded-full bg-slate-400"} />
                                            <span className="min-w-0 flex-1 truncate">{sp.name}</span>
                                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{sp.status}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        className="text-sm font-bold text-gray-400 hover:text-white"
                    >
                        <X size={16} className="inline" /> {t("backlog.deselect")}
                    </button>
                </div>
            )}

            <StartSprintModal
                projectId={projectId}
                open={!!startTargetId}
                sprint={startSprintModalSprint}
                onClose={() => setStartTargetId(null)}
            />

            <CompleteSprintModal
                projectId={projectId}
                open={!!completeTargetId}
                sprint={completeSprintModalSprint}
                onClose={() => setCompleteTargetId(null)}
                onSuccess={sprintId => {
                    setSprintOpen(p => ({ ...p, [sprintId]: false }))
                }}
            />

            <CreateSprintModal
                projectId={projectId}
                open={showCreateSprintModal}
                onClose={() => setShowCreateSprintModal(false)}
            />

            {selectedTaskId && (
                <TaskDetailPanel
                    taskId={selectedTaskId}
                    projectId={projectId}
                    currentUserRole={isPM ? "PM" : isMemberOnly ? "MEMBER" : "VIEWER"}
                    onClose={() => setSelectedTaskId(null)}
                    onTaskUpdated={() => {
                        queryClient.invalidateQueries({ queryKey: ["backlog", projectId] })
                        queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
                        queryClient.invalidateQueries({ queryKey: ["sprint-tasks", projectId] })
                    }}
                />
            )}

            {showCreateModal && projectDetail && (
                <FullCreateTask
                    projectId={projectId}
                    projectKey={projectDetail.data.projectKey}
                    projectMembers={projectMembers.map((m: any) => ({
                        id: m.user.id,
                        name: m.user.fullName,
                        email: m.user.email,
                        avatarUrl: m.user.avatarUrl || undefined,
                    }))}
                    columns={projectColumns.map(c => ({
                        id: c.id,
                        name: c.name,
                        color: c.colorHex ?? "#94A3B8",
                    }))}
                    onConfirm={handleCreateTask}
                    onClose={() => setShowCreateModal(false)}
                />
            )}

            {showAiGenerator && (
                <AiTaskGenerator
                    projectId={projectId}
                    projectName={projectDetail?.data?.name ?? ""}
                    onSuccess={(count) => {
                        toast.success(`Đã tạo ${count} task thành công!`)
                        queryClient.invalidateQueries({ queryKey: ['backlog', projectId] })
                    }}
                    onClose={() => setShowAiGenerator(false)}
                />
            )}

            {showAiAssign && (
                <AiAssignReview
                    projectId={projectId}
                    onSuccess={(result) => {
                        toast.success(`Đã phân công ${result.totalAssigned} task (${result.aiConfirmed} AI · ${result.pmOverridden} override)`)
                        queryClient.invalidateQueries({ queryKey: ['backlog', projectId] })
                    }}
                    onClose={() => setShowAiAssign(false)}
                />
            )}
            <DragOverlay zIndex={999}>
                {activeDraggedTask ? (
                    <div className="w-[min(760px,88vw)] rounded-xl border border-blue-200 bg-white px-3 py-3 shadow-2xl ring-2 ring-blue-500/20">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-5 shrink-0 items-center justify-center text-gray-300">
                                <span className="inline-block h-5 w-1 rounded-full bg-blue-500/30" />
                            </div>
                            <div className="hidden w-[88px] shrink-0 md:block">
                                <TypeBadgeMini type={activeDraggedTask.type} />
                            </div>
                            <span className="w-20 shrink-0 font-mono text-[11px] text-gray-500">{activeDraggedTask.taskCode}</span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="truncate text-sm font-semibold text-gray-900">{activeDraggedTask.title}</span>
                                    <PriorityDot priority={activeDraggedTask.priority} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </div>
        </DndContext>
    )
}
