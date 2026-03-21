"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
    Search, Plus, Zap, Layers, ChevronDown, ChevronLeft, ChevronRight,
    X, AlertTriangle, User, CheckCircle, MoreHorizontal, Filter, Loader2,
    MessageSquare, Paperclip
} from "lucide-react"
import Link from "next/link"

import { TaskService } from "@/app/services/TaskService"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { ProjectService } from "@/app/services/ProjectService"
import TaskDetailPanel from "@/components/projects/TaskDetailPanel"
import { FullCreateTask } from "@/components/projects/TaskFormModals"
import { UserAvatar } from "@/components/common/UserAvatar"
import { cn } from "@/lib/utils"

import type {
    TaskResponse,
    TaskPriority,
    TaskType,
    TaskStatus,
    SprintDetail,
    TaskFilterParams,
    ColumnResponse
} from "@/app/types/task.schema"
import type { ProjectMember } from "@/app/types/member.schema"

import { useProjectWebSocket } from "@/hooks/useProjectWebSocket"

// ── Helpers & Constants ───────────────────────────────────────

const TYPE_CONFIG: Record<TaskType, { icon: string; bg: string; text: string }> = {
    BUG:      { icon: "", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]" },
    FEATURE:  { icon: "", bg: "bg-[#EFF6FF]", text: "text-[#1D4ED8]" },
    TASK:     { icon: "", bg: "bg-slate-100",  text: "text-slate-700" },
    STORY:    { icon: "", bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
    EPIC:     { icon: "", bg: "bg-[#DBEAFE]",  text: "text-[#1E40AF]" },
    SUB_TASK: { icon: "", bg: "bg-gray-100",   text: "text-gray-600" },
}

const PRIORITY_CONFIG: Record<TaskPriority, { bg: string; text: string }> = {
    CRITICAL: { bg: "bg-[#F3E8FF]", text: "text-[#722ED1]" },
    HIGH:     { bg: "bg-[#FEE2E2]", text: "text-[#B91C1C]" },
    MEDIUM:   { bg: "bg-[#FEF3C7]", text: "text-[#B45309]" },
    LOW:      { bg: "bg-[#DBEAFE]", text: "text-[#1D4ED8]" },
}

const STATUS_COLORS: Record<TaskStatus, string> = {
    TODO: "bg-gray-300",
    IN_PROGRESS: "bg-blue-500",
    IN_REVIEW: "bg-purple-500",
    DONE: "bg-green-500",
    CANCELLED: "bg-red-400",
}

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(handler)
    }, [value, delay])
    return debouncedValue
}

// ── Sub-components ───────────────────────────────────────────

function StatusDot({ status }: { status: TaskStatus }) {
    return (
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_COLORS[status] || "bg-gray-300")} />
    )
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
    const { t } = useTranslation()
    const cfg = PRIORITY_CONFIG[priority] || { bg: "bg-gray-100", text: "text-gray-600" }
    return (
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", cfg.bg, cfg.text)}>
            {t(`task.priority_${priority}`, { defaultValue: priority })}
        </span>
    )
}

function TypeBadge({ type }: { type: TaskType }) {
    const { t } = useTranslation()
    const cfg = TYPE_CONFIG[type] || { icon: "", bg: "bg-gray-100", text: "text-gray-600" }
    return (
        <div className={cn("flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold w-fit mx-auto", cfg.bg, cfg.text)}>
            <span>{t(`task.type_${type}`, { defaultValue: type })}</span>
        </div>
    )
}

// ── SprintAssignDropdown ──────────────────────────────────────

function SprintAssignDropdown({
    sprints,
    onAssign,
    onClose
}: {
    sprints: SprintDetail[]
    onAssign: (sprintId: string) => void
    onClose: () => void
}) {
    const { t } = useTranslation()
    useEffect(() => {
        const handleClickOutside = () => onClose()
        document.addEventListener("click", handleClickOutside)
        return () => document.removeEventListener("click", handleClickOutside)
    }, [onClose])

    return (
        <div
            className="absolute right-0 top-8 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden py-1"
            onClick={e => e.stopPropagation()}
        >
            <p className="px-3 py-1.5 text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                {t('backlog.assignToSprint')}
            </p>
            {sprints.length === 0 ? (
                <p className="px-3 py-3 text-xs text-gray-400 text-center">{t('backlog.noAvailableSprints')}</p>
            ) : (
                sprints.map(sprint => (
                    <button
                        key={sprint.id}
                        onClick={() => onAssign(sprint.id)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", sprint.status === "ACTIVE" ? "bg-blue-500" : "bg-gray-300")} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 truncate font-medium">{sprint.name}</p>
                            <p className="text-[10px] text-gray-400">
                                {sprint.taskCount} {t('nav.tasks').toLowerCase()} · {sprint.status === "ACTIVE" ? t('sprint.status_ACTIVE') : t('sprint.status_PLANNED')}
                            </p>
                        </div>
                    </button>
                ))
            )}
        </div>
    )
}

// ── BacklogTaskRow ────────────────────────────────────────────

function BacklogTaskRow({
    task,
    isSelected,
    onSelect,
    onClick,
    isPM,
    sprints,
    onAssignToSprint
}: {
    task: TaskResponse
    isSelected: boolean
    onSelect: (id: string) => void
    onClick: () => void
    isPM: boolean
    sprints: SprintDetail[]
    onAssignToSprint: (taskId: string, sprintId: string) => void
}) {
    const { t } = useTranslation()
    const [showSprintMenu, setShowSprintMenu] = useState(false)

    return (
        <div
            draggable={isPM && task.type !== "EPIC"}
            onDragStart={e => {
                if (isPM && task.type !== "EPIC") {
                    e.dataTransfer.setData("taskId", task.id)
                    e.dataTransfer.effectAllowed = "move"
                }
            }}
            className={cn(
                "flex items-center gap-5 px-4 py-4 group transition-colors cursor-pointer border-b border-gray-50",
                isSelected ? "bg-blue-50/70" : "hover:bg-gray-50/80",
                isPM && task.type !== "EPIC" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
            )}
            onClick={onClick}
        >
            {/* Checkbox */}
            {isPM && (
                <div onClick={e => e.stopPropagation()} className="flex items-center">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect(task.id)}
                        className="w-4 h-4 rounded border-gray-300 accent-blue-500 flex-shrink-0 cursor-pointer"
                    />
                </div>
            )}

            {/* Task Type */}
            <div className="w-24 hidden md:block">
                <TypeBadge type={task.type} />
            </div>
            {/* Mobile label only */}
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 flex-shrink-0 md:hidden" title={task.type}>
                {task.type}
            </span>

            {/* TaskCode + Title */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-gray-400 flex-shrink-0">
                        {task.taskCode}
                    </span>
                    <span className={cn(
                        "text-sm font-semibold truncate",
                        (task.taskStatus === "DONE" || task.taskStatus === "CANCELLED")
                            ? "line-through text-gray-400"
                            : "text-gray-800"
                    )}>
                        {task.title}
                    </span>
                    <StatusDot status={task.taskStatus} />
                </div>
            </div>

            {/* Priority */}
            <div className="w-28 flex justify-center hidden md:flex">
                <PriorityBadge priority={task.priority} />
            </div>

            {/* Story Points */}
            <div className="w-20 flex justify-center hidden lg:flex">
                {task.storyPoints != null ? (
                    <span className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white text-[11px] font-black rounded-full shadow-sm ring-2 ring-blue-100">
                        {task.storyPoints}
                    </span>
                ) : (
                    <span className="text-gray-300 text-xs font-bold">—</span>
                )}
            </div>

            {/* Comments & Attachments */}
            <div className="w-20 hidden xl:flex items-center gap-3 justify-center text-gray-400">
                <div className="flex items-center gap-1" title={`${task.commentsCount || 0} comments`}>
                    <MessageSquare size={12} />
                    <span className="text-[10px] font-medium">{task.commentsCount || 0}</span>
                </div>
                <div className="flex items-center gap-1" title={`${task.attachmentsCount || 0} attachments`}>
                    <Paperclip size={12} />
                    <span className="text-[10px] font-medium">{task.attachmentsCount || 0}</span>
                </div>
            </div>

            {/* Due Date */}
            <div className="w-28 text-right hidden lg:block">
                {task.dueDate ? (
                    <span className={cn(
                        "text-xs flex items-center justify-end gap-1",
                        task.overdue ? "text-red-500 font-medium" : "text-gray-400"
                    )}>
                        {task.overdue && <AlertTriangle size={10} className="inline flex-shrink-0" />}
                        {new Date(task.dueDate).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                ) : (
                    <span className="text-gray-200 text-xs">—</span>
                )}
            </div>

            {/* Assignee */}
            <div className="w-20 flex justify-center">
                {task.assignee ? (
                    <div title={task.assignee.fullName}>
                        <UserAvatar name={task.assignee.fullName} src={task.assignee.avatarUrl || undefined} size={28} />
                    </div>
                ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
                        <User size={12} className="text-gray-300" />
                    </div>
                )}
            </div>

            {/* Actions (hover) — PM only */}
            <div className="w-20 flex justify-end">
                {isPM && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {task.type !== "EPIC" ? (
                            <div className="relative">
                                <button
                                    onClick={e => {
                                        e.stopPropagation()
                                        setShowSprintMenu(!showSprintMenu)
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200 hover:border-blue-300"
                                >
                                    <Layers size={11} />
                                    {t('sprint.title')}
                                </button>
                                {showSprintMenu && (
                                    <SprintAssignDropdown
                                        sprints={sprints}
                                        onAssign={(sprintId) => {
                                            onAssignToSprint(task.id, sprintId)
                                            setShowSprintMenu(false)
                                        }}
                                        onClose={() => setShowSprintMenu(false)}
                                    />
                                )}
                            </div>
                        ) : (
                            <span className="text-[10px] text-gray-300 px-2" title="Epic cannot be assigned to sprint">
                                Epic
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── SprintPanel ───────────────────────────────────────────────

function SprintPanel({
    sprint,
    variant,
    isPM,
    onTaskDrop
}: {
    sprint: SprintDetail
    variant: "active" | "planned"
    isPM: boolean
    onTaskDrop: (taskId: string, sprintId: string) => void
}) {
    const { t } = useTranslation()
    const [isDragOver, setIsDragOver] = useState(false)
    const [collapsed, setCollapsed] = useState(false)

    return (
        <div
            onDragOver={e => {
                if (isPM) {
                    e.preventDefault()
                    setIsDragOver(true)
                }
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => {
                if (isPM) {
                    e.preventDefault()
                    setIsDragOver(false)
                    const taskId = e.dataTransfer.getData("taskId")
                    if (taskId) onTaskDrop(taskId, sprint.id)
                }
            }}
            className={cn(
                "bg-white rounded-2xl border transition-all overflow-hidden mb-3",
                variant === "active" ? "border-blue-300 shadow-sm shadow-blue-50" : "border-gray-200 hover:border-gray-300",
                isDragOver && "border-blue-400 bg-blue-50/30 shadow-md"
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between px-4 py-3.5">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        {variant === "active" && (
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute h-full w-full rounded-full bg-blue-400 opacity-75" />
                                <span className="relative rounded-full h-2 w-2 bg-blue-500" />
                            </span>
                        )}
                        <h4 className="font-semibold text-sm text-gray-800 truncate">
                            {sprint.name}
                        </h4>
                        <span className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                            variant === "active" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                        )}>
                            {variant === "active" ? t('backlog.sprintRunning') : t('backlog.sprintPending')}
                        </span>
                    </div>
                    {sprint.goal && (
                        <p className="text-[11px] text-gray-400 italic truncate mb-1">
                            {sprint.goal}
                        </p>
                    )}
                    <p className="text-[10px] text-gray-400">
                        {new Date(sprint.startDate).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })} → {new Date(sprint.endDate).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}
                        {" · "}{sprint.taskCount} {t('nav.tasks').toLowerCase()}
                    </p>
                </div>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                >
                    <ChevronDown size={15} className={cn("transition-transform", collapsed && "-rotate-90")} />
                </button>
            </div>

            {!collapsed && (
                <>
                    {/* Progress bar */}
                    {sprint.taskCount > 0 && (
                        <div className="px-4 pb-4">
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                <span>{sprint.doneCount}/{sprint.taskCount} {t('backlog.completed')}</span>
                                <span>{sprint.completionRate.toFixed(0)}%</span>
                            </div>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-400 rounded-full transition-all duration-500"
                                    style={{ width: `${sprint.completionRate}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Drop zone hint */}
                    {isDragOver && isPM && (
                        <div className="mx-3 mb-3 py-6 border-2 border-dashed border-blue-400 rounded-xl bg-blue-50 text-center animate-pulse">
                            <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider">
                                {t('backlog.dropToAssign', { name: sprint.name })}
                            </p>
                        </div>
                    )}

                    {/* Empty sprint hint */}
                    {!isDragOver && sprint.taskCount === 0 && (
                        <div className="mx-3 mb-3 py-4 border-2 border-dashed border-gray-100 rounded-xl text-center bg-gray-50/30">
                            <p className="text-xs text-gray-400">
                                {t('backlog.dragTasksHere')}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// ── BacklogPage ───────────────────────────────────────────────

interface BacklogPageProps {
    projectId: string
    myRole?: string
}

export default function BacklogPage({ projectId, myRole = "VIEWER" }: BacklogPageProps) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()

    // Real-time updates
    useProjectWebSocket(projectId)

    // Permissions
    const isPM = myRole === "project_manager" || myRole === "system_admin"
    const isMember = myRole === "member" || isPM

    // Filter states
    const [search, setSearch] = useState("")
    const [filterPriority, setFilterPriority] = useState("")
    const [filterType, setFilterType] = useState("")
    const [filterAssignee, setFilterAssignee] = useState("")
    const [sortBy, setSortBy] = useState("priority,desc")
    const [page, setPage] = useState(0)

    // UI states
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [showBatchSprintMenu, setShowBatchSprintMenu] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)

    const debouncedSearch = useDebounce(search, 300)

    // Reset page on filter change
    useEffect(() => {
        setPage(0)
    }, [debouncedSearch, filterPriority, filterType, filterAssignee, sortBy])

    const params: TaskFilterParams = useMemo(() => ({
        ...(debouncedSearch && { q: debouncedSearch }),
        ...(filterPriority && { priority: filterPriority as TaskPriority }),
        ...(filterType && { type: filterType as TaskType }),
        ...(filterAssignee === "me" ? { assigneeId: "me" } : filterAssignee === "unassigned" ? {} : filterAssignee ? { assigneeId: filterAssignee } : {}),
        sort: sortBy,
        page,
        size: 25,
    }), [debouncedSearch, filterPriority, filterType, filterAssignee, sortBy, page])

    // Queries
    const { data: backlogData, isLoading } = useQuery({
        queryKey: ["backlog", projectId, params],
        queryFn: () => TaskService.getBacklog(projectId, params),
        enabled: !!projectId,
    })

    const { data: sprintsData = [] } = useQuery({
        queryKey: ["sprints", projectId],
        queryFn: () => TaskService.getSprints(projectId),
        enabled: !!projectId,
    })

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

    const tasks = backlogData?.content ?? []
    const totalElements = backlogData?.totalElements ?? 0
    const totalPages = backlogData?.totalPages ?? 0
    const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)

    const activeSprint = sprintsData.find(s => s.status === "ACTIVE") || null
    const plannedSprints = sprintsData.filter(s => s.status === "PLANNED")
    const activeSprints = sprintsData.filter(s => s.status === "PLANNED" || s.status === "ACTIVE")

    const hasActiveFilters = !!(debouncedSearch || filterPriority || filterType || filterAssignee)

    // Handlers
    const resetFilters = () => {
        setSearch("")
        setFilterPriority("")
        setFilterType("")
        setFilterAssignee("")
        setSortBy("priority,desc")
    }

    const handleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleSelectAll = () => {
        if (selectedIds.length === tasks.length && tasks.length > 0) {
            setSelectedIds([])
        } else {
            setSelectedIds(tasks.map(t => t.id))
        }
    }

    const handleAssignToSprint = async (taskId: string, sprintId: string) => {
        try {
            await TaskService.assignTaskToSprint(taskId, sprintId)
            queryClient.invalidateQueries({ queryKey: ["backlog", projectId] })
            queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
            toast.success(t('backlog.assignedToSprint'))
        } catch (err: any) {
            const msg = err?.response?.data?.meta?.message
            toast.error(msg ?? t('backlog.assignError'))
        }
    }

    const handleBatchAssign = async (sprintId: string) => {
        if (selectedIds.length === 0) return
        try {
            const result = await TaskService.batchAssignToSprint(projectId, selectedIds, sprintId)
            toast.success(result.message || t('backlog.batchAssigned', { count: result.updatedCount }))
            setSelectedIds([])
            setShowBatchSprintMenu(false)
            queryClient.invalidateQueries({ queryKey: ["backlog", projectId] })
            queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
        } catch (err: any) {
            const msg = err?.response?.data?.meta?.message
            toast.error(msg ?? t('backlog.batchAssignError'))
        }
    }

    const handleCreateTask = async (payload: any) => {
        try {
            await TaskService.createTask(projectId, payload)
            queryClient.invalidateQueries({ queryKey: ["backlog", projectId] })
            toast.success(t('task.create') + ' ' + t('common.success').toLowerCase())
        } catch (err: any) {
            throw err
        }
    }

    // Pagination helpers
    const from = page * (params.size || 25) + 1
    const to = Math.min((page + 1) * (params.size || 25), totalElements)

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden p-6 relative">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('common.backlog')}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {t('backlog.tasksNotAssigned', { count: totalElements })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {totalStoryPoints > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-semibold border border-blue-100 shadow-sm">
                            <Zap size={14} className="fill-blue-500" />
                            {totalStoryPoints} {t('task.storyPoints').toLowerCase()}
                        </div>
                    )}
                    {(isPM || isMember) && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-1.5 bg-[#1677FF] hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
                        >
                            <Plus size={16} strokeWidth={3} />
                            {t('task.create')}
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-xs group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('backlog.searchPlaceholder')}
                        className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-[#F5F5F5] transition-all"
                    />
                </div>

                <select
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                    className="h-10 px-3 border border-gray-200 rounded-xl text-sm outline-none bg-[#F5F5F5] text-gray-600 hover:border-gray-300 transition-all cursor-pointer"
                >
                    <option value="">{t('backlog.allPriorities')}</option>
                    {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((key) => (
                        <option key={key} value={key}>{t(`task.priority_${key}`, { defaultValue: key })}</option>
                    ))}
                </select>

                <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="h-10 px-3 border border-gray-200 rounded-xl text-sm outline-none bg-[#F5F5F5] text-gray-600 hover:border-gray-300 transition-all cursor-pointer"
                >
                    <option value="">{t('backlog.allTypes')}</option>
                    {(Object.keys(TYPE_CONFIG) as TaskType[]).map((key) => (
                        <option key={key} value={key}>{t(`task.type_${key}`, { defaultValue: key })}</option>
                    ))}
                </select>

                <select
                    value={filterAssignee}
                    onChange={e => setFilterAssignee(e.target.value)}
                    className="h-10 px-3 border border-gray-200 rounded-xl text-sm outline-none bg-[#F5F5F5] text-gray-600 hover:border-gray-300 transition-all cursor-pointer"
                >
                    <option value="">{t('backlog.allAssignees')}</option>
                    <option value="me">{t('backlog.me')}</option>
                    <option value="unassigned">{t('task.unassigned')}</option>
                    {projectMembers.map(m => (
                        <option key={m.user.id} value={m.user.id}>{m.user.fullName}</option>
                    ))}
                </select>

                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="h-10 px-3 border border-gray-200 rounded-xl text-sm outline-none bg-[#F5F5F5] text-gray-600 ml-auto hover:border-gray-300 transition-all cursor-pointer"
                >
                    <option value="priority,desc">{t('backlog.sortHighestPriority')}</option>
                    <option value="createdAt,desc">{t('backlog.sortNewest')}</option>
                    <option value="dueDate,asc">{t('backlog.sortNearestDue')}</option>
                    <option value="storyPoints,desc">{t('backlog.sortHighestPoints')}</option>
                </select>

                {hasActiveFilters && (
                    <button
                        onClick={resetFilters}
                        className="flex items-center gap-1.5 h-10 px-4 text-sm text-gray-500 hover:text-red-500 border border-dashed border-gray-300 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all bg-white"
                    >
                        <X size={14} />
                        {t('project.clearFilters')}
                    </button>
                )}
            </div>

            {/* Main Content: 2 Columns */}
            <div className="flex gap-6 flex-1 overflow-hidden min-h-0">
                {/* Left: Backlog List */}
                <div className="flex-[2] flex flex-col min-w-0 bg-white rounded-2xl overflow-hidden">
                    {/* List header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/70 border-y border-gray-100">
                        {isPM && (
                            <input
                                type="checkbox"
                                checked={selectedIds.length === tasks.length && tasks.length > 0}
                                onChange={handleSelectAll}
                                className="w-4 h-4 rounded border-gray-300 accent-blue-500 cursor-pointer"
                            />
                        )}
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest w-24 text-center hidden md:block">
                            {t('task.type')}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex-1">
                            {t('backlog.taskDetails')}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest w-28 text-center hidden md:block">
                            {t('task.priority')}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest w-20 text-center hidden lg:block">
                            {t('backlog.storyPts')}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest w-20 text-center hidden xl:block">
                            {t('backlog.meta')}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest w-28 text-right hidden lg:block">
                            {t('task.dueDate')}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest w-20 text-center">
                            {t('task.assignee')}
                        </span>
                        <div className="w-20" />
                    </div>

                    {/* Task Rows */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-50 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {isLoading ? (
                            <div className="p-4 space-y-3">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="h-12 bg-gray-50 animate-pulse rounded-xl" />
                                ))}
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                {hasActiveFilters ? (
                                    <>
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                            <Filter size={32} className="text-gray-200" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-700 mb-2">{t('project.noResults')}</h3>
                                        <p className="text-sm text-gray-500 max-w-xs mb-6">
                                            {t('project.noResultsHint')}
                                        </p>
                                        <button onClick={resetFilters} className="text-sm font-bold text-[#1677FF] hover:underline">{t('project.clearFilters')}</button>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                                            <CheckCircle size={32} className="text-blue-200" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-700 mb-2">{t('backlog.emptyTitle')}</h3>
                                        <p className="text-sm text-gray-500 max-w-xs">
                                            {t('backlog.emptyDesc')}
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            tasks.map(task => (
                                <BacklogTaskRow
                                    key={task.id}
                                    task={task}
                                    isSelected={selectedIds.includes(task.id)}
                                    onSelect={handleSelect}
                                    onClick={() => setSelectedTaskId(task.id)}
                                    isPM={isPM}
                                    sprints={activeSprints}
                                    onAssignToSprint={handleAssignToSprint}
                                />
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                            <span className="text-xs font-medium text-gray-500">
                                {t('backlog.showing')} <span className="text-gray-900 font-bold">{from}–{to}</span> {t('common.of')} <span className="text-gray-900 font-bold">{totalElements}</span> {t('nav.tasks').toLowerCase()}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 0}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-white hover:border-gray-300 transition-all text-gray-600 shadow-sm"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPage(i)}
                                        className={cn(
                                            "h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all shadow-sm",
                                            page === i
                                                ? "bg-[#1677FF] text-white"
                                                : "border border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 bg-white"
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= totalPages - 1}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-white hover:border-gray-300 transition-all text-gray-600 shadow-sm"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Sprints */}
                {(activeSprints.length > 0 || isPM) && (
                    <div className="flex-[1] min-w-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                <Layers size={18} className="text-blue-500" />
                                {t('sprint.title')}
                            </h2>
                            {isPM && (
                                <Link
                                    href={`/projects/${projectId}/sprints`}
                                    className="text-[11px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wider"
                                >
                                    {t('backlog.manage')} →
                                </Link>
                            )}
                        </div>

                        {activeSprint && (
                            <SprintPanel
                                sprint={activeSprint}
                                variant="active"
                                isPM={isPM}
                                onTaskDrop={handleAssignToSprint}
                            />
                        )}

                        {plannedSprints.map(sprint => (
                            <SprintPanel
                                key={sprint.id}
                                sprint={sprint}
                                variant="planned"
                                isPM={isPM}
                                onTaskDrop={handleAssignToSprint}
                            />
                        ))}

                        {activeSprints.length === 0 && isPM && (
                            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Layers size={24} className="text-gray-300" />
                                </div>
                                <p className="text-sm font-semibold text-gray-600 mb-1">{t('backlog.noSprints')}</p>
                                <p className="text-xs text-gray-400 mb-4">{t('backlog.planFirstSprint')}</p>
                                <Link
                                    href={`/projects/${projectId}/sprints`}
                                    className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-bold px-4 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors"
                                >
                                    <Plus size={14} />
                                    {t('sprint.create')}
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Batch Action Bar */}
            {isPM && selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-gray-900 text-white px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-10 duration-300 border border-gray-800">
                    <div className="flex items-center gap-3 pr-4 border-r border-gray-700">
                        <div className="w-8 h-8 bg-[#1677FF] rounded-full flex items-center justify-center text-sm font-black shadow-lg shadow-blue-500/30">
                            {selectedIds.length}
                        </div>
                        <span className="text-sm font-bold tracking-tight">{t('backlog.tasksSelected')}</span>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowBatchSprintMenu(!showBatchSprintMenu)}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            <Layers size={14} strokeWidth={3} />
                            {t('backlog.assignToSprint')}
                            <ChevronDown size={14} className={cn("transition-transform", showBatchSprintMenu && "rotate-180")} />
                        </button>

                        {showBatchSprintMenu && (
                            <div className="absolute bottom-[calc(100%+12px)] left-0 w-60 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden py-1.5 z-50">
                                <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                                    {t('backlog.selectTargetSprint')}
                                </p>
                                {activeSprints.length === 0 ? (
                                    <p className="px-4 py-4 text-xs text-gray-400 text-center italic">{t('backlog.noAvailableSprints')}</p>
                                ) : (
                                    activeSprints.map(sprint => (
                                        <button
                                            key={sprint.id}
                                            onClick={() => handleBatchAssign(sprint.id)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-all group"
                                        >
                                            <div className={cn(
                                                "w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-transparent transition-all",
                                                sprint.status === "ACTIVE" ? "bg-blue-500 group-hover:ring-blue-100" : "bg-gray-300 group-hover:ring-gray-100"
                                            )} />
                                            <div className="flex-1 text-left">
                                                <p className="font-bold text-gray-800 leading-none mb-1">{sprint.name}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">{sprint.status === "ACTIVE" ? t('sprint.status_ACTIVE') : t('sprint.status_PLANNED')}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setSelectedIds([])}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                    >
                        <X size={16} strokeWidth={3} />
                        {t('backlog.deselect')}
                    </button>
                </div>
            )}

            {/* Modals & Panels */}
            {selectedTaskId && (
                <TaskDetailPanel
                    taskId={selectedTaskId}
                    projectId={projectId}
                    currentUserRole={isPM ? "PM" : isMember ? "MEMBER" : "VIEWER"}
                    onClose={() => setSelectedTaskId(null)}
                    onTaskUpdated={() => {
                        queryClient.invalidateQueries({ queryKey: ["backlog", projectId] })
                        queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
                    }}
                />
            )}

            {showCreateModal && projectDetail && (
                <FullCreateTask
                    projectId={projectId}
                    projectKey={projectDetail.data.projectKey}
                    projectMembers={projectMembers.map(m => ({
                        id: m.user.id,
                        name: m.user.fullName,
                        email: m.user.email,
                        avatarUrl: m.user.avatarUrl || undefined
                    }))}
                    columns={projectColumns.map(c => ({
                        id: c.id,
                        name: c.name,
                        color: c.color
                    }))}
                    onConfirm={handleCreateTask}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    )
}
