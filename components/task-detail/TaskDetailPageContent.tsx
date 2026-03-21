"use client"

import React from "react"
import { Clock, MoreHorizontal, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { UserAvatar } from "@/components/common/UserAvatar"
import TaskDetailTabs from "@/components/task-detail/TaskDetailTabs"
import { PRIORITY_CONFIG, STATUS_CONFIG, TYPE_CONFIG, formatDuration } from "@/components/task-detail/config"
import SubTaskSection from "@/components/task-detail/SubTaskSection"
import DependencySection from "@/components/task-detail/DependencySection"
import RecurringSection from "@/components/task-detail/RecurringSection"
import { useTaskWebSocket } from "@/hooks/useTaskWebSocket"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"
import { useWorklogs } from "@/hooks/useWorklogs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { SubtaskBlockedDialog } from "@/components/kanban/SubtaskBlockedDialog"
import { TaskDetailService } from "@/app/services/TaskDetailService"
import type { SubTaskResponse } from "@/app/types/task.schema"

// ── Page skeleton ──────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="h-full p-5 space-y-4 animate-pulse bg-white">
            <div className="h-9 bg-slate-100 rounded-lg w-full" />
            <div className="h-10 bg-slate-100 rounded-lg w-2/3" />
            <div className="h-44 bg-slate-100 rounded-xl w-full" />
            <div className="h-12 bg-slate-100 rounded-xl w-full" />
            <div className="h-32 bg-slate-100 rounded-xl w-full" />
        </div>
    )
}

// ── Main component ─────────────────────────────────────────

interface TaskDetailPageContentProps {
    projectId: string
    taskId: string
    currentUserRole: "PM" | "MEMBER" | "VIEWER"
    onClose?: () => void
}

const STATUS_OPTIONS = [
    { value: "TODO", label: "To Do", color: "bg-gray-100 text-gray-700" },
    { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-100 text-blue-700" },
    { value: "IN_REVIEW", label: "In Review", color: "bg-purple-100 text-purple-700" },
    { value: "DONE", label: "Done", color: "bg-green-100 text-green-700" },
    { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-700" },
] as const

const VALID_TRANSITIONS: Record<string, string[]> = {
    TODO: ["IN_PROGRESS"],
    IN_PROGRESS: ["IN_REVIEW", "DONE"],
    IN_REVIEW: ["IN_PROGRESS", "DONE"],
    DONE: [],
    CANCELLED: [],
}

export default function TaskDetailPageContent({
    projectId,
    taskId,
    currentUserRole,
    onClose,
}: TaskDetailPageContentProps) {
    const router = useRouter()
    const qc = useQueryClient()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    const handleClose = onClose ?? (() => router.back())

    const [blockedDialog, setBlockedDialog] = React.useState<{
        open: boolean
        taskTitle: string
        pendingSubtasks: SubTaskResponse[]
    } | null>(null)

    const { data, isLoading, isError } = useQuery({
        queryKey: ["task", projectId, taskId],
        queryFn: () => TaskService.getTaskById(projectId, taskId),
        staleTime: 15_000,
        enabled: !!taskId && !!projectId,
    })

    // Real-time updates
    useTaskWebSocket(projectId, taskId)

    const deleteTask = useMutation({
        mutationFn: () => TaskService.deleteTask(projectId, taskId),
        onSuccess: () => {
            toast.success("Task deleted")
            handleClose()
        },
        onError: (err: any) => {
            const status = err?.response?.status
            if (status === 403) toast.error("Only PM/Admin can delete tasks")
            else toast.error(err?.response?.data?.message ?? "Unable to delete task")
        },
    })

    const { data: worklogData } = useWorklogs(taskId)

    const updateStatus = useMutation({
        mutationFn: (nextStatus: string) => {
            const task = data?.task
            if (!task) throw new Error("Task not loaded")
            return TaskService.updateStatus(projectId, task.id, { status: nextStatus as any, statusColumnId: task.columnId })
        },
        onMutate: async (nextStatus) => {
            await qc.cancelQueries({ queryKey: ["task", projectId, taskId] })
            const previous = qc.getQueryData<{ task: any; etag: string }>(["task", projectId, taskId])
            qc.setQueryData(["task", projectId, taskId], (old: any) =>
                old?.task ? { ...old, task: { ...old.task, taskStatus: nextStatus } } : old
            )
            return { previous }
        },
        onSuccess: () => {
            toast.success("Status updated")
        },
        onError: (err: any, _nextStatus, ctx) => {
            if (ctx?.previous) qc.setQueryData(["task", projectId, taskId], ctx.previous)
            toast.error(err?.response?.data?.message ?? "Không thể cập nhật trạng thái")
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
            qc.invalidateQueries({ queryKey: ["tasks", projectId] })
        },
    })

    const updatePriority = useMutation({
        mutationFn: (nextPriority: string) => {
            const task = data?.task
            if (!task) throw new Error("Task not loaded")
            return TaskService.updateTask(projectId, task.id, { title: task.title, priority: nextPriority as any })
        },
        onMutate: async (nextPriority) => {
            await qc.cancelQueries({ queryKey: ["task", projectId, taskId] })
            const previous = qc.getQueryData<{ task: any; etag: string }>(["task", projectId, taskId])
            qc.setQueryData(["task", projectId, taskId], (old: any) =>
                old?.task ? { ...old, task: { ...old.task, priority: nextPriority } } : old
            )
            return { previous }
        },
        onSuccess: () => {
            toast.success("Priority updated")
        },
        onError: (err: any, _nextPriority, ctx) => {
            if (ctx?.previous) qc.setQueryData(["task", projectId, taskId], ctx.previous)
            toast.error(err?.response?.data?.message ?? "Không thể cập nhật priority")
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
            qc.invalidateQueries({ queryKey: ["tasks", projectId] })
        },
    })

    if (isLoading) return <PageSkeleton />

    if (isError || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-white p-8 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                    <X size={40} />
                </div>
                <p className="text-slate-900 font-black text-xl mb-2">Task Not Found</p>
                <p className="text-slate-500 font-medium mb-6">The task might have been deleted or you don't have permission.</p>
                <Button variant="outline" className="h-11 px-6 rounded-xl font-bold" onClick={handleClose}>
                    Go back
                </Button>
            </div>
        )
    }

    const { task } = data
    const pendingSubtasks = Math.max(0, (task.subtaskCount ?? 0) - (task.subtaskDone ?? 0))
    const canDelete = currentUserRole === "PM"
    const canEdit = currentUserRole !== "VIEWER"
    const statusCfg = STATUS_CONFIG[task.taskStatus]
    const priorityCfg = PRIORITY_CONFIG[task.priority]
    const typeCfg = TYPE_CONFIG[task.type]
    const formatDate = (value: string | null | undefined) => value
        ? new Date(value).toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })
        : "—"

    const totalLoggedTime = worklogData?.totalSeconds ?? 0
    const estimatedSeconds = Math.max(0, Number(task.estimatedHours ?? 0) * 3600)
    const worklogPct = estimatedSeconds > 0 ? Math.round((totalLoggedTime / estimatedSeconds) * 100) : 0

    const handleChangeStatus = async (nextStatus: string) => {
        const current = task.taskStatus
        if (!VALID_TRANSITIONS[current]?.includes(nextStatus)) {
            toast.error("Chuyển trạng thái không hợp lệ")
            return
        }
        
        if (nextStatus === "DONE" && pendingSubtasks > 0) {
            try {
                const subs = await TaskDetailService.getSubtasks(taskId)
                const pending = subs.filter(s => s.taskStatus !== "DONE" && s.taskStatus !== "CANCELLED")
                
                if (pending.length > 0) {
                    setBlockedDialog({
                        open: true,
                        taskTitle: task.title,
                        pendingSubtasks: pending
                    })
                    return
                }
            } catch (err) {
                console.error("Failed to fetch pending subtasks:", err)
                // Fallback to simple toast if fetch fails
                toast.error(`Không thể hoàn thành — còn ${pendingSubtasks} sub-task chưa xong`)
                return
            }
        }
        updateStatus.mutate(nextStatus)
    }

    const scrollToSubtasks = () => {
        const el = document.getElementById("subtasks-section")
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const goWorklogTab = () => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("tab", "worklog")
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    return (
        <div className={cn("bg-white", onClose ? "flex flex-col h-full" : "flex flex-col min-h-screen")}>
            <div className={cn("px-4 pt-4 pb-3", onClose ? "overflow-y-auto" : "")}>
                {/* Top badges and actions */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center h-7 px-2.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                            {task.taskCode}
                        </span>
                        <span className={cn("inline-flex items-center h-7 px-2.5 rounded-lg text-xs font-semibold border", priorityCfg.bg, priorityCfg.color)}>
                            ↑ {priorityCfg.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={cn(
                                        "inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold border",
                                        statusCfg.bg.replace("dark:bg-gray-700 dark:text-gray-300", "")
                                    )}
                                    disabled={!canEdit || updateStatus.isPending}
                                >
                                    <span className={cn("w-2 h-2 rounded-full", statusCfg.dot)} />
                                    {statusCfg.label}
                                    <span className="text-[10px]">▼</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 p-1.5 rounded-xl">
                                {STATUS_OPTIONS
                                    .filter((opt) => opt.value === task.taskStatus || VALID_TRANSITIONS[task.taskStatus]?.includes(opt.value))
                                    .map((opt) => (
                                        <DropdownMenuItem
                                            key={opt.value}
                                            className="rounded-lg text-xs"
                                            onClick={() => opt.value !== task.taskStatus && handleChangeStatus(opt.value)}
                                            disabled={opt.value === task.taskStatus}
                                        >
                                            <span className={cn("w-2 h-2 rounded-full mr-2", STATUS_CONFIG[opt.value].dot)} />
                                            {opt.label}
                                        </DropdownMenuItem>
                                    ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {canDelete && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100">
                                        <MoreHorizontal size={16} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 p-2 rounded-xl border-slate-200 shadow-xl">
                                    <DropdownMenuItem
                                        className="text-rose-600 font-semibold focus:text-rose-600 focus:bg-rose-50 rounded-lg cursor-pointer"
                                        onClick={() => {
                                            if (confirm("Are you sure you want to delete this task?")) deleteTask.mutate()
                                        }}
                                        disabled={deleteTask.isPending}
                                    >
                                        <Trash2 size={14} className="mr-2" /> Delete Task
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100" onClick={handleClose}>
                            <X size={18} />
                        </Button>
                    </div>
                </div>

                {/* Title */}
                <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900 break-words">
                    {task.title}
                </h1>

                {/* Meta info grid */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-slate-800">
                    <div>
                        <p className="text-xs text-slate-500 mb-1">Assignee</p>
                        {task.assignee ? (
                            <div className="flex items-center gap-2">
                                <UserAvatar src={task.assignee.avatarUrl ?? undefined} name={task.assignee.fullName} size={24} />
                                <span className="text-base font-semibold">{task.assignee.fullName}</span>
                            </div>
                        ) : (
                            <span className="text-sm text-slate-400">Unassigned</span>
                        )}
                    </div>

                    <div>
                        <p className="text-xs text-slate-500 mb-1">Reporter</p>
                        <div className="flex items-center gap-2">
                            <UserAvatar src={task.reporter.avatarUrl ?? undefined} name={task.reporter.fullName} size={24} />
                            <span className="text-base font-semibold">{task.reporter.fullName}</span>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-slate-500 mb-1">Due Date</p>
                        <p className="text-base font-semibold">{formatDate(task.dueDate)}</p>
                    </div>

                    <div>
                        <p className="text-xs text-slate-500 mb-1">Sprint</p>
                        <p className="text-base font-semibold">{task.sprint?.name ?? "Backlog"}</p>
                    </div>

                    <div>
                        <p className="text-xs text-slate-500 mb-1">Task Type</p>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                            <span>{typeCfg.icon}</span> {typeCfg.label}
                        </span>
                    </div>

                    <div>
                        <p className="text-xs text-slate-500 mb-1">Priority</p>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="inline-flex items-center gap-2 h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-60"
                                    disabled={!canEdit || updatePriority.isPending}
                                >
                                    <span className={cn("w-2 h-2 rounded-full", priorityCfg.dot)} />
                                    {priorityCfg.label}
                                    <span className="text-[10px] text-slate-400">▼</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-36 p-1.5 rounded-xl">
                                {Object.entries(PRIORITY_CONFIG).map(([value, cfg]) => (
                                    <DropdownMenuItem
                                        key={value}
                                        className="rounded-lg text-xs"
                                        onClick={() => value !== task.priority && updatePriority.mutate(value)}
                                        disabled={value === task.priority}
                                    >
                                        <span className={cn("w-2 h-2 rounded-full mr-2", cfg.dot)} />
                                        {cfg.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div>
                        <p className="text-xs text-slate-500 mb-1">Story Points</p>
                        <p className="text-base font-semibold">{task.storyPoints ?? "—"}</p>
                    </div>
                </div>

                {/* Goal / Description */}
                <div className="mt-4 rounded-xl border border-slate-200 p-3 bg-white">
                    <h3 className="text-xl font-bold text-slate-900 mb-1.5">Mục tiêu</h3>
                    {task.description ? (
                        <div
                            className="prose prose-sm max-w-none text-slate-700"
                            dangerouslySetInnerHTML={{ __html: task.description }}
                        />
                    ) : (
                        <p className="text-slate-400 italic">Chưa có mô tả.</p>
                    )}
                </div>

                {/* Sub-tasks */}
                <div id="subtasks-section" className="mt-4 rounded-xl border border-slate-200 p-3 bg-white">
                    <SubTaskSection task={task} projectId={projectId} canEdit={canEdit} />
                </div>

                {/* Dependencies */}
                <div className="mt-3 rounded-xl border border-slate-200 p-3 bg-white">
                    <DependencySection taskId={task.id} projectId={projectId} canEdit={canEdit} />
                </div>

                {/* Recurrence */}
                <div className="mt-3 rounded-xl border border-slate-200 p-3 bg-white">
                    <RecurringSection taskId={task.id} projectId={projectId} isRecurring={task.isRecurring} canEdit={canEdit} />
                </div>

                {/* Worklog summary */}
                <div className="mt-3 rounded-xl border border-slate-200 p-3 bg-white">
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Worklog</p>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-500">
                            Estimated: <strong>{formatDuration(estimatedSeconds)}</strong>
                        </span>
                        <span className="text-slate-500">
                            Actual: <strong>{formatDuration(totalLoggedTime)}</strong>
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(worklogPct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 text-right">{worklogPct}% COMPLETED</p>
                    {canEdit && (
                        <button
                            onClick={goWorklogTab}
                            className="w-full mt-2 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1"
                        >
                            <Clock size={14} /> LOG WORKLOG
                        </button>
                    )}
                </div>

                {/* Tabs section */}
                <div className="mt-3 border-t border-slate-200 pt-1">
                    <TaskDetailTabs task={task} projectId={projectId} currentUserRole={currentUserRole} />
                </div>
            </div>

            {blockedDialog?.open && (
                <SubtaskBlockedDialog
                    open={blockedDialog.open}
                    taskTitle={blockedDialog.taskTitle}
                    pendingSubtasks={blockedDialog.pendingSubtasks}
                    onClose={() => setBlockedDialog(null)}
                    onViewSubtasks={scrollToSubtasks}
                />
            )}
        </div>
    )
}
