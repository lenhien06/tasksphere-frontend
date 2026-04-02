"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Link from "next/link"
import {
    Search,
    Plus,
    Zap,
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
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
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
    TaskPriority,
    TaskType,
    TaskResponse,
} from "@/app/types/task.schema"

import { cn } from "@/lib/utils"
import { SprintSection } from "./SprintSection"
import { StartSprintModal } from "./StartSprintModal"
import { CompleteSprintModal } from "./CompleteSprintModal"
import { BacklogTaskRow, SortableBacklogTaskRow } from "./BacklogTaskRow"
import { orderSprintsForBacklogUi } from "./utils"

const PRIORITY_OPTIONS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as TaskPriority[]
const TYPE_OPTIONS = ["TASK", "BUG", "FEATURE", "STORY", "EPIC", "SUB_TASK"] as TaskType[]

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
    const canReorderBacklog = isPM || isMemberOnly

    const [search, setSearch] = useState("")
    const [filterPriority, setFilterPriority] = useState("")
    const [filterType, setFilterType] = useState("")
    const [filterAssignee, setFilterAssignee] = useState("")
    const [sortBy, setSortBy] = useState("taskPosition,asc")
    const [page, setPage] = useState(0)

    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [showBatchSprintMenu, setShowBatchSprintMenu] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [sprintOpen, setSprintOpen] = useState<Record<string, boolean>>({})
    const [startTargetId, setStartTargetId] = useState<string | null>(null)
    const [completeTargetId, setCompleteTargetId] = useState<string | null>(null)

    const debouncedSearch = useDebounce(search, 300)

    useEffect(() => setPage(0), [debouncedSearch, filterPriority, filterType, filterAssignee, sortBy])

    const params: TaskFilterParams = useMemo(
        () => ({
            ...(debouncedSearch && { q: debouncedSearch }),
            ...(filterPriority && { priority: filterPriority as TaskPriority }),
            ...(filterType && { type: filterType as TaskType }),
            ...(filterAssignee === "me"
                ? { assigneeId: "me" }
                : filterAssignee && filterAssignee !== "unassigned"
                  ? { assigneeId: filterAssignee }
                  : {}),
            sort: sortBy,
            page,
            size: 20,
        }),
        [debouncedSearch, filterPriority, filterType, filterAssignee, sortBy, page],
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
    const hasActiveFilters = !!(debouncedSearch || filterPriority || filterType || filterAssignee)

    const resetFilters = () => {
        setSearch("")
        setFilterPriority("")
        setFilterType("")
        setFilterAssignee("")
        setSortBy("taskPosition,asc")
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

    const positionSortActive = sortBy === "taskPosition,asc"
    const useSortableList = canReorderBacklog && positionSortActive && !backlogQuery.isLoading && tasks.length > 0

    const handleDragEnd = (e: DragEndEvent) => {
        const { active, over } = e
        if (!over || active.id === over.id) return
        const oldIndex = tasks.findIndex(x => x.id === active.id)
        const newIndex = tasks.findIndex(x => x.id === over.id)
        if (oldIndex < 0 || newIndex < 0) return
        const moved = tasks[oldIndex]
        const reordered = arrayMove(tasks, oldIndex, newIndex)
        const nid = reordered[newIndex]?.id
        if (nid !== moved.id) return
        reorderMutation.mutate({
            taskId: moved.id,
            columnId: moved.columnId,
            newPosition: newIndex,
        })
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            {/* Sprint vùng trên */}
            <div className="flex max-h-[45vh] min-h-[120px] shrink-0 flex-col border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                        <Layers size={18} className="text-blue-500" />
                        {t("sprint.title")}
                    </h2>
                    {isPM && (
                        <Link
                            href={`/projects/${projectId}/sprints`}
                            className="text-[11px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700"
                        >
                            {t("backlog.manage")} →
                        </Link>
                    )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
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
                            {isPM && (
                                <Link
                                    href={`/projects/${projectId}/sprints`}
                                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                                >
                                    <Plus size={14} /> {t("sprint.create")}
                                </Link>
                            )}
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
                            />
                        ))}
                </div>
            </div>

            {/* Backlog vùng dưới */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
                <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-4">
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
                        {(isPM || isMemberOnly) && (
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700"
                            >
                                <Plus size={16} strokeWidth={3} /> {t("backlog.createTaskCta")}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-gray-50 px-4 py-3">
                    <div className="relative min-w-[200px] max-w-xs flex-1">
                        <Search
                            size={14}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t("backlog.searchPlaceholder")}
                            className="h-10 w-full rounded-xl border border-gray-200 bg-[#F5F5F5] pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                        />
                    </div>
                    <select
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value)}
                        className="h-10 rounded-xl border border-gray-200 bg-[#F5F5F5] px-3 text-sm text-gray-600"
                    >
                        <option value="">{t("backlog.allPriorities")}</option>
                        {PRIORITY_OPTIONS.map(k => (
                            <option key={k} value={k}>
                                {t(`project.priority_${k}`, { defaultValue: k })}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="h-10 rounded-xl border border-gray-200 bg-[#F5F5F5] px-3 text-sm text-gray-600"
                    >
                        <option value="">{t("backlog.allTypes")}</option>
                        {TYPE_OPTIONS.map(k => (
                            <option key={k} value={k}>
                                {t(`project.type_${k}`, { defaultValue: k })}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filterAssignee}
                        onChange={e => setFilterAssignee(e.target.value)}
                        className="h-10 rounded-xl border border-gray-200 bg-[#F5F5F5] px-3 text-sm text-gray-600"
                    >
                        <option value="">{t("backlog.allAssignees")}</option>
                        <option value="me">{t("backlog.me")}</option>
                        <option value="unassigned">{t("task.unassigned")}</option>
                        {projectMembers.map((m: any) => (
                            <option key={m.user.id} value={m.user.id}>
                                {m.user.fullName}
                            </option>
                        ))}
                    </select>
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
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="flex h-10 items-center gap-1 rounded-xl border border-dashed border-gray-300 px-4 text-sm text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                            <X size={14} /> {t("project.clearFilters")}
                        </button>
                    )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 sm:px-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 py-2 pl-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {useSortableList && <span className="w-6" />}
                        {isPM && <span className="w-4" />}
                        <span className="hidden w-[88px] md:block">{t("task.type")}</span>
                        <span className="min-w-0 flex-1">{t("backlog.taskDetails")}</span>
                        <span className="hidden w-24 md:block">{t("task.priority")}</span>
                        <span className="hidden w-14 lg:block">{t("backlog.storyPts")}</span>
                        <span className="hidden w-20 xl:block">{t("backlog.meta")}</span>
                        <span className="w-10">{t("task.assignee")}</span>
                        <span className="w-28" />
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
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
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                                                    dragDisabled={!positionSortActive}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
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
                                            sortable={false}
                                            dragDisabled
                                        />
                                    ))
                                )}
                            </>
                        )}
                    </div>

                    {totalPages > 1 && !backlogQuery.isError && (
                        <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50/50 px-4 py-3">
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
        </div>
    )
}
