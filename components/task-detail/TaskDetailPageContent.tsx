"use client"

import React from "react"
import { Bug, CheckSquare, BookOpen, Zap, Subtitles, MoreHorizontal, Trash2, X, Link2, Pencil, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import TaskDetailTabs from "@/components/task-detail/TaskDetailTabs"
import { STATUS_CONFIG } from "@/components/task-detail/config"
import SubTaskSection from "@/components/task-detail/SubTaskSection"
import PromoteSubTaskDialog from "@/components/task-detail/PromoteSubTaskDialog"
import DependencySection from "@/components/task-detail/DependencySection"
import RecurringSection from "@/components/task-detail/RecurringSection"
import CustomFieldSection from "@/components/task-detail/CustomFieldSection"
import TaskMetaGrid from "@/components/task-detail/TaskMetaGrid"
import TaskDescription from "@/components/task-detail/TaskDescription"
import { useTaskWebSocket } from "@/hooks/useTaskWebSocket"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/useAuthStore"
import type { CustomFieldType } from "@/app/types/task.schema"

import { SubtaskBlockedDialog } from "@/components/kanban/SubtaskBlockedDialog"
import { TaskDetailService } from "@/app/services/TaskDetailService"
import { invalidateTaskCollections, patchTaskCollections } from "@/lib/task-query-sync"
import type { SubTaskResponse } from "@/app/types/task.schema"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

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

// BR-14: IN_PROGRESS → IN_REVIEW only (not directly to DONE)
const VALID_TRANSITIONS: Record<string, string[]> = {
    TODO: ["IN_PROGRESS"],
    IN_PROGRESS: ["IN_REVIEW"],
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
    const currentUserId = useAuthStore((s) => String(s.user?.id ?? ""))
    const handleClose = onClose ?? (() => router.back())

    const [blockedDialog, setBlockedDialog] = React.useState<{
        open: boolean
        taskTitle: string
        pendingSubtasks: SubTaskResponse[]
    } | null>(null)
    const [editingTitle, setEditingTitle] = React.useState(false)
    const [titleDraft, setTitleDraft] = React.useState("")
    const [addFieldOpen, setAddFieldOpen] = React.useState(false)
    const [newFieldName, setNewFieldName] = React.useState("")
    const [newFieldType, setNewFieldType] = React.useState<CustomFieldType>("TEXT")
    const [newFieldRequired, setNewFieldRequired] = React.useState(false)
    const [newFieldOptionsText, setNewFieldOptionsText] = React.useState("")
    const [promoteToTaskOpen, setPromoteToTaskOpen] = React.useState(false)

    const { data, isLoading, isError } = useQuery({
        queryKey: ["task", projectId, taskId],
        queryFn: () => TaskService.getTaskById(projectId, taskId),
        staleTime: 15_000,
        enabled: !!taskId && !!projectId,
    })
    const { data: customFieldDefs = [] } = useQuery({
        queryKey: ["custom-fields", projectId],
        queryFn: () => TaskService.getCustomFields(projectId),
        enabled: !!projectId,
        staleTime: 60_000,
    })

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

    const updateTitle = useMutation({
        mutationFn: (newTitle: string) => {
            const t = data?.task
            if (!t) throw new Error("Task not loaded")
            return TaskService.updateTask(projectId, t.id, { title: newTitle })
        },
        onMutate: async (newTitle) => {
            await qc.cancelQueries({ queryKey: ["task", projectId, taskId] })
            const previous = qc.getQueryData<{ task: any; etag: string }>(["task", projectId, taskId])
            qc.setQueryData(["task", projectId, taskId], (old: any) =>
                old?.task ? { ...old, task: { ...old.task, title: newTitle } } : old
            )
            patchTaskCollections(qc, projectId, taskId, { title: newTitle })
            return { previous }
        },
        onSuccess: () => { toast.success("Title updated") },
        onError: (err: any, _newTitle, ctx) => {
            if (ctx?.previous) qc.setQueryData(["task", projectId, taskId], ctx.previous)
            toast.error(err?.response?.data?.message ?? "Unable to update title")
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
            qc.invalidateQueries({ queryKey: ["activity", projectId, taskId] })
            invalidateTaskCollections(qc, projectId)
        },
    })
    const createCustomField = useMutation({
        mutationFn: () => {
            const name = newFieldName.trim()
            if (!name) throw new Error("Tên trường là bắt buộc")
            const payload: any = {
                name,
                fieldType: newFieldType,
                required: newFieldRequired,
            }
            if (newFieldType === "SELECT" || newFieldType === "MULTI_SELECT") {
                const options = newFieldOptionsText
                    .split(",")
                    .map((o) => o.trim())
                    .filter(Boolean)
                if (options.length < 2) throw new Error("Cần ít nhất 2 lựa chọn")
                payload.options = options
            }
            return TaskService.createCustomField(projectId, payload)
        },
        onSuccess: () => {
            toast.success("Đã thêm trường mới cho dự án")
            qc.invalidateQueries({ queryKey: ["custom-fields", projectId] })
            qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
            setAddFieldOpen(false)
            setNewFieldName("")
            setNewFieldType("TEXT")
            setNewFieldRequired(false)
            setNewFieldOptionsText("")
        },
        onError: (err: any) => {
            toast.error(err?.message ?? err?.response?.data?.message ?? "Không thể thêm trường")
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
                <p className="text-slate-500 font-medium mb-6">The task might have been deleted or you don&apos;t have permission.</p>
                <Button variant="outline" className="h-11 px-6 rounded-xl font-bold" onClick={handleClose}>
                    Go back
                </Button>
            </div>
        )
    }

    const { task } = data
    const normalizedRole = String(currentUserRole || "").toUpperCase()
    const isAdminOrPM =
        normalizedRole === "PM" ||
        normalizedRole === "ADMIN" ||
        normalizedRole === "PROJECT_MANAGER" ||
        normalizedRole === "SYSTEM_ADMIN"
    const isMember = normalizedRole === "MEMBER"
    const isAssignee = !!task.assignee?.id && !!currentUserId && String(task.assignee.id) === currentUserId
    const canEdit = isAdminOrPM || (isMember && isAssignee)
    const canDelete = isAdminOrPM

    const scrollToSubtasks = () => {
        const el = document.getElementById("subtasks-section")
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
        BUG:      { icon: Bug,         color: "text-rose-600",   bg: "bg-rose-50" },
        TASK:     { icon: CheckSquare, color: "text-blue-600",   bg: "bg-blue-50" },
        STORY:    { icon: BookOpen,    color: "text-emerald-600", bg: "bg-emerald-50" },
        EPIC:     { icon: Zap,         color: "text-violet-600",  bg: "bg-violet-50" },
        SUB_TASK: { icon: Subtitles,   color: "text-sky-600",     bg: "bg-sky-50" },
        FEATURE:  { icon: Zap,         color: "text-amber-600",   bg: "bg-amber-50" },
    }
    const tCfg = typeConfig[task.type.toUpperCase()] || typeConfig.TASK
    const TypeIcon = tCfg.icon

    return (
        <div className={cn("bg-white", onClose ? "flex flex-col h-full" : "flex flex-col min-h-screen")}>
            <div className={cn("px-8 py-6 pb-24 flex-1", onClose ? "overflow-y-auto" : "")}>
                
                {/* Professional Jira-style Header */}
                <div className="flex items-start justify-between gap-6 mb-4">
                    <div className="flex-1 min-w-0">
                        {/* Breadcrumb row: Key + Actions */}
                        <div className="flex items-center gap-2 mb-3 text-[13px] font-medium text-slate-500">
                            <div className={cn("p-1 rounded-md", tCfg.bg)}>
                                <TypeIcon size={14} className={tCfg.color} />
                            </div>
                            <span className="hover:underline cursor-pointer transition-all">{task.taskCode}</span>
                            <span>/</span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200 uppercase tracking-tight">
                                <Link2 size={10} /> Link Issue
                            </div>
                        </div>

                        {/* Title Row */}
                        {editingTitle && canEdit ? (
                            <textarea
                                autoFocus
                                className="w-full text-2xl font-bold leading-tight text-slate-900 resize-none border-0 outline-none focus:ring-2 focus:ring-blue-100 rounded-lg p-1 -ml-1 bg-slate-50"
                                value={titleDraft}
                                rows={1}
                                onChange={(e) => setTitleDraft(e.target.value)}
                                onBlur={() => {
                                    const trimmed = titleDraft.trim()
                                    if (trimmed && trimmed !== task.title) updateTitle.mutate(trimmed)
                                    setEditingTitle(false)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault()
                                        const trimmed = titleDraft.trim()
                                        if (trimmed && trimmed !== task.title) updateTitle.mutate(trimmed)
                                        setEditingTitle(false)
                                    }
                                    if (e.key === "Escape") setEditingTitle(false)
                                }}
                            />
                        ) : (
                            <h1
                                className={cn(
                                    "text-2xl font-bold leading-tight text-slate-900 break-words tracking-tight",
                                    canEdit && "cursor-pointer hover:bg-slate-50 rounded-lg p-1 -mx-1 transition-colors"
                                )}
                                onClick={() => {
                                    if (canEdit) { setTitleDraft(task.title); setEditingTitle(true) }
                                }}
                            >
                                {task.title}
                            </h1>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-1">
                        {task.parentTask && canEdit && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl text-xs font-semibold border-slate-200"
                                onClick={() => setPromoteToTaskOpen(true)}
                            >
                                <ArrowUpRight size={14} className="mr-1.5" />
                                Nâng cấp thành Task
                            </Button>
                        )}
                        {canDelete && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
                                        <MoreHorizontal size={20} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 p-1.5 rounded-xl border-slate-200 shadow-xl">
                                    <DropdownMenuItem
                                        className="text-rose-600 font-semibold focus:text-rose-600 focus:bg-rose-50 rounded-lg cursor-pointer"
                                        onClick={() => {
                                            if (confirm("Tất cả sub-task sẽ bị xóa theo. Bạn có chắc chắn muốn xóa task này?")) deleteTask.mutate()
                                        }}
                                        disabled={deleteTask.isPending}
                                    >
                                        <Trash2 size={16} className="mr-2" /> Xóa task
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all" onClick={handleClose}>
                            <X size={22} />
                        </Button>
                    </div>
                </div>

                {/* Details */}
                <div className="mb-4">
                    <TaskMetaGrid
                        task={task}
                        projectId={projectId}
                        canEdit={canEdit}
                        etag={data.etag}
                        onBlockedBySubtask={(pending) =>
                            setBlockedDialog({ open: true, taskTitle: task.title, pendingSubtasks: pending })
                        }
                    />
                </div>

                {/* Description block */}
                <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-900 mb-2">Description</p>
                    <TaskDescription task={task} projectId={projectId} canEdit={canEdit} />
                </div>

                {/* Accordion sections */}
                <Accordion type="multiple" defaultValue={["subtasks", "dependencies"]} className="space-y-1">
                    <AccordionItem value="subtasks" className="border-0">
                        <AccordionTrigger className="hover:no-underline py-2 group">
                            <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                Sub-tasks
                                <span className="text-slate-400 font-semibold normal-case tracking-normal text-[11px]">
                                    {task.subtaskDone}/{task.subtaskCount}
                                </span>
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                             <SubTaskSection task={task} projectId={projectId} canEdit={canEdit} isPM={isAdminOrPM} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="dependencies" className="border-0">
                        <AccordionTrigger className="hover:no-underline py-2 group">
                            <span className="text-sm font-semibold text-slate-900">Dependencies</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                            <DependencySection taskId={task.id} projectId={projectId} canEdit={canEdit} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="recurrence" className="border-0">
                        <AccordionTrigger className="hover:no-underline py-2 group">
                            <span className="text-sm font-semibold text-slate-900">Recurrence</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                            <RecurringSection taskId={task.id} projectId={projectId} isRecurring={task.recurring ?? false} canEdit={canEdit} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="custom-fields" className="border-0">
                        <div className="flex items-center gap-2">
                            <AccordionTrigger className="hover:no-underline py-2 group flex-1">
                                <span className="text-sm font-semibold text-slate-900">Additional Info</span>
                            </AccordionTrigger>
                            {isAdminOrPM && (
                                <button
                                    type="button"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    onClick={() => setAddFieldOpen(true)}
                                    title="Thêm trường"
                                >
                                    <Pencil size={14} />
                                </button>
                            )}
                        </div>
                        <AccordionContent className="pt-2">
                            {customFieldDefs.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                    <p className="text-sm text-slate-700 mb-3">
                                        Chưa có trường thông tin bổ sung cho project này.
                                    </p>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8"
                                        onClick={() => router.push(`/projects/${projectId}/settings/custom-fields`)}
                                    >
                                        Mở trang cài đặt trường
                                    </Button>
                                </div>
                            ) : (
                                <CustomFieldSection
                                    projectId={projectId}
                                    taskId={taskId}
                                    definitions={customFieldDefs}
                                    values={task.customFieldValues || []}
                                    canEdit={canEdit}
                                    canManage={isAdminOrPM}
                                />
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {/* Tabs section */}
                <div className="mt-8">
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

            <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Thêm trường cho dự án</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Tên trường</label>
                            <input
                                value={newFieldName}
                                onChange={(e) => setNewFieldName(e.target.value)}
                                placeholder="Ví dụ: Mức độ rủi ro"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Loại trường</label>
                            <select
                                value={newFieldType}
                                onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                            >
                                <option value="TEXT">Text</option>
                                <option value="NUMBER">Number</option>
                                <option value="DATE">Date</option>
                                <option value="BOOLEAN">Boolean</option>
                                <option value="SELECT">Select</option>
                                <option value="MULTI_SELECT">Multi Select</option>
                                <option value="URL">URL</option>
                            </select>
                        </div>
                        {(newFieldType === "SELECT" || newFieldType === "MULTI_SELECT") && (
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Lựa chọn (ngăn cách bằng dấu phẩy)</label>
                                <input
                                    value={newFieldOptionsText}
                                    onChange={(e) => setNewFieldOptionsText(e.target.value)}
                                    placeholder="VD: Cao, Trung bình, Thấp"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                                />
                            </div>
                        )}
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={newFieldRequired}
                                onChange={(e) => setNewFieldRequired(e.target.checked)}
                            />
                            Bắt buộc nhập
                        </label>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddFieldOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={() => createCustomField.mutate()} disabled={createCustomField.isPending}>
                            {createCustomField.isPending ? "Đang lưu..." : "Lưu"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {task.parentTask && (
                <PromoteSubTaskDialog
                    open={promoteToTaskOpen}
                    onOpenChange={setPromoteToTaskOpen}
                    projectId={projectId}
                    subtasksListParentId={task.parentTask.id}
                    assigneeFallback={null}
                    source={
                        promoteToTaskOpen
                            ? {
                                  id: task.id,
                                  title: task.title,
                                  taskCode: task.taskCode,
                                  assignee: task.assignee,
                                  dueDate: task.dueDate,
                                  subtaskCount: task.subtaskCount,
                                  description: task.description,
                              }
                            : null
                    }
                />
            )}
        </div>
    )
}
