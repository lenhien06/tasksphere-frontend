"use client"

import React, { useState, useEffect } from "react"
import { Plus, ChevronRight, MoreHorizontal, ExternalLink, ArrowUpRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/common/UserAvatar"
import {
    useSubTasks,
    useAddSubTask,
    useDeleteSubTask,
} from "@/hooks/useSubTasks"
import PromoteSubTaskDialog from "@/components/task-detail/PromoteSubTaskDialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"
import { PRIORITY_CONFIG } from "@/components/task-detail/config"
import type { TaskDetailResponse, SubTaskResponse, TaskStatus, UserSummary } from "@/app/types/task.schema"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface SubTaskSectionProps {
    task: TaskDetailResponse
    projectId: string
    canEdit: boolean
    isPM?: boolean
}

// ── Per-node toggle mutation (uses the correct parent cache key) ──

function useToggleSubtask(projectId: string, parentId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
            TaskService.updateStatus(projectId, taskId, { status }),
        onMutate: async ({ taskId, status }) => {
            await qc.cancelQueries({ queryKey: ["subtasks", parentId] })
            const prev = qc.getQueryData(["subtasks", parentId])
            qc.setQueryData(["subtasks", parentId], (old: SubTaskResponse[] | undefined) =>
                old?.map(s => s.id === taskId ? { ...s, taskStatus: status } : s)
            )
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(["subtasks", parentId], ctx.prev)
            toast.error("Không thể cập nhật trạng thái")
        },
        onSettled: () => {
            // Invalidate both this node's children list and the parent list to keep counts fresh
            qc.invalidateQueries({ queryKey: ["subtasks", parentId] })
            qc.invalidateQueries({ queryKey: ["task", projectId] })
        },
    })
}

// ── Recursive subtask node ────────────────────────────────────

interface SubTaskNodeProps {
    sub: SubTaskResponse
    parentId: string        // ID of the list this node belongs to (for cache ops)
    projectId: string
    depth: number
    canEdit: boolean
    isPM: boolean
    assigneeFallback: UserSummary | null
    onPromote: (sub: SubTaskResponse, fallback: UserSummary | null) => void
    onDelete: (sub: SubTaskResponse) => void
    addingTo: string | null
    onAddChild: (parentId: string) => void
    onAddDone: () => void
}

function SubTaskNode({
    sub,
    parentId,
    projectId,
    depth,
    canEdit,
    isPM,
    assigneeFallback,
    onPromote,
    onDelete,
    addingTo,
    onAddChild,
    onAddDone,
}: SubTaskNodeProps) {
    const router = useRouter()
    const [expanded, setExpanded] = useState(false)
    const [localDone, setLocalDone] = useState(sub.taskStatus === "DONE")
    const { data: children, isFetching } = useSubTasks(expanded ? sub.id : "")
    const toggleMutation = useToggleSubtask(projectId, parentId)
    const priCfg = PRIORITY_CONFIG[sub.priority]
    const hasChildren = sub.subtaskCount > 0
    const isCancelled = sub.taskStatus === "CANCELLED"

    // Sync localDone from server (e.g. websocket push)
    useEffect(() => {
        setLocalDone(sub.taskStatus === "DONE")
    }, [sub.taskStatus])

    // Auto-expand when this node is the target for adding a child
    useEffect(() => {
        if (addingTo === sub.id) setExpanded(true)
    }, [addingTo, sub.id])

    const handleToggle = (checked: boolean) => {
        setLocalDone(checked)
        toggleMutation.mutate(
            { taskId: sub.id, status: (checked ? "DONE" : "IN_PROGRESS") as TaskStatus },
            { onError: () => setLocalDone(!checked) }
        )
    }

    return (
        <div style={{ paddingLeft: depth * 20 }}>
            <div className="flex items-center gap-2 py-1.5 group hover:bg-accent/30 rounded px-2 transition-colors">
                {/* Expand toggle — only if has children, no ▶ icon */}
                <button
                    className={cn(
                        "w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground transition-transform",
                        hasChildren ? "opacity-100" : "opacity-0 pointer-events-none",
                        expanded && "rotate-90"
                    )}
                    onClick={() => setExpanded(v => !v)}
                    aria-label={expanded ? "Thu gọn" : "Mở rộng"}
                >
                    <ChevronRight size={12} />
                </button>

                {/* Checkbox — uses local state for instant feedback */}
                <Checkbox
                    checked={localDone}
                    onCheckedChange={(v) => handleToggle(!!v)}
                    disabled={!canEdit || isCancelled || toggleMutation.isPending}
                    className="h-4 w-4 rounded-full shrink-0"
                />

                {/* Title */}
                <button
                    className={cn(
                        "flex-1 text-left text-sm truncate hover:text-primary transition-colors",
                        (localDone || isCancelled) && "line-through text-muted-foreground"
                    )}
                    onClick={() => router.push(`/projects/${projectId}/tasks/${sub.id}`)}
                >
                    <span className="text-[11px] text-muted-foreground mr-1.5 font-mono">{sub.taskCode}</span>
                    {sub.title}
                </button>

                {/* Child count badge — no ▶ */}
                {hasChildren && (
                    <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                        {sub.completedSubtaskCount}/{sub.subtaskCount}
                    </span>
                )}

                {/* Priority */}
                <span className={cn("text-[11px] font-medium hidden group-hover:inline shrink-0", priCfg.color)}>
                    {priCfg.label}
                </span>

                {/* Assignee avatar */}
                {sub.assignee && (
                    <UserAvatar
                        src={sub.assignee.avatarUrl ?? undefined}
                        name={sub.assignee.fullName}
                        size={18}
                        className="shrink-0"
                    />
                )}

                {/* "..." menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-opacity shrink-0">
                            <MoreHorizontal size={13} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => router.push(`/projects/${projectId}/tasks/${sub.id}`)}>
                            <ExternalLink size={13} className="mr-2" />
                            Mở chi tiết
                        </DropdownMenuItem>
                        {canEdit && (
                            <DropdownMenuItem onClick={() => onAddChild(sub.id)}>
                                <Plus size={13} className="mr-2" />
                                Thêm sub-task con
                            </DropdownMenuItem>
                        )}
                        {canEdit && (
                            <DropdownMenuItem onClick={() => onPromote(sub, assigneeFallback)}>
                                <ArrowUpRight size={13} className="mr-2" />
                                Chuyển thành Task
                            </DropdownMenuItem>
                        )}
                        {isPM && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-rose-600 focus:text-rose-600"
                                    onClick={() => onDelete(sub)}
                                >
                                    <Trash2 size={13} className="mr-2" />
                                    Xóa
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Inline add form under this node */}
            {addingTo === sub.id && (
                <div style={{ paddingLeft: (depth + 1) * 20 }}>
                    <InlineAddForm
                        parentId={sub.id}
                        projectId={projectId}
                        onDone={onAddDone}
                    />
                </div>
            )}

            {/* Expanded children */}
            {expanded && (
                <div>
                    {isFetching && (
                        <div style={{ paddingLeft: (depth + 1) * 20 }} className="space-y-1.5 py-1 animate-pulse px-2">
                            {[1, 2].map(i => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-muted shrink-0" />
                                    <div className="h-4 bg-muted rounded flex-1" />
                                </div>
                            ))}
                        </div>
                    )}
                    {!isFetching && children?.map(child => (
                        <SubTaskNode
                            key={child.id}
                            sub={child}
                            parentId={sub.id}      // ← correct parent cache key
                            projectId={projectId}
                            depth={depth + 1}
                            canEdit={canEdit}
                            isPM={isPM}
                            assigneeFallback={sub.assignee}
                            onPromote={onPromote}
                            onDelete={onDelete}
                            onAddChild={onAddChild}
                            addingTo={addingTo}
                            onAddDone={onAddDone}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Inline add form ───────────────────────────────────────────

function InlineAddForm({
    parentId,
    projectId,
    onDone,
}: {
    parentId: string
    projectId: string
    onDone: () => void
}) {
    const qc = useQueryClient()
    const [title, setTitle] = useState("")
    const addSubTask = useAddSubTask(projectId, parentId)

    const submit = () => {
        if (!title.trim()) return
        addSubTask.mutate(title.trim(), {
            onSuccess: () => {
                setTitle("")
                onDone()
                // Refresh all subtask lists so parent counts update
                qc.invalidateQueries({ queryKey: ["subtasks"] })
            },
        })
    }

    return (
        <div className="flex items-center gap-2 py-1 pr-2">
            <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Tên sub-task..."
                className="h-7 text-sm flex-1"
                autoFocus
                onKeyDown={e => {
                    if (e.key === "Enter") submit()
                    if (e.key === "Escape") { setTitle(""); onDone() }
                }}
            />
            <Button size="sm" className="h-7 px-3 text-xs" onClick={submit} disabled={!title.trim() || addSubTask.isPending}>
                {addSubTask.isPending ? "..." : "Thêm"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setTitle(""); onDone() }}>
                Huỷ
            </Button>
        </div>
    )
}

// ── Main component ────────────────────────────────────────────

export default function SubTaskSection({ task, projectId, canEdit, isPM = false }: SubTaskSectionProps) {
    const { data: subTasks = [], isLoading } = useSubTasks(task.id)
    const deleteSubTask = useDeleteSubTask(projectId, task.id)

    const [addingTo, setAddingTo] = useState<string | null>(null)
    const [promotingTarget, setPromotingTarget] = useState<SubTaskResponse | null>(null)
    const [promoteAssigneeFallback, setPromoteAssigneeFallback] = useState<UserSummary | null>(null)
    const [deletingTarget, setDeletingTarget] = useState<SubTaskResponse | null>(null)

    const total = subTasks.length
    const done = subTasks.filter(s => s.taskStatus === "DONE").length
    const percent = total > 0 ? Math.round((done / total) * 100) : 0
    const isEpic = task.type === "EPIC"
    const canAdd = canEdit && !isEpic

    return (
        <div className="space-y-2" id="subtasks-section">
            {/* Header */}
            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">
                    Sub-tasks
                    <span className="text-muted-foreground font-normal ml-1.5">({done}/{total})</span>
                </span>
                {total > 0 && <Progress value={percent} className="flex-1 h-1.5" />}
                {canAdd && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={() => setAddingTo(task.id)}
                        aria-label="Thêm sub-task"
                    >
                        <Plus size={13} className="mr-0.5" /> Thêm
                    </Button>
                )}
            </div>

            {/* Loading skeleton */}
            {isLoading && (
                <div className="space-y-1.5 animate-pulse pl-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-5 bg-muted rounded" />)}
                </div>
            )}

            {/* Tree */}
            {!isLoading && (
                <div>
                    {subTasks.map(sub => (
                        <SubTaskNode
                            key={sub.id}
                            sub={sub}
                            parentId={task.id}      // top-level nodes belong to task.id list
                            projectId={projectId}
                            depth={0}
                            canEdit={canEdit}
                            isPM={isPM}
                            assigneeFallback={task.assignee ?? null}
                            onPromote={(s, fb) => {
                                setPromoteAssigneeFallback(fb)
                                setPromotingTarget(s)
                            }}
                            onDelete={setDeletingTarget}
                            onAddChild={setAddingTo}
                            addingTo={addingTo}
                            onAddDone={() => setAddingTo(null)}
                        />
                    ))}
                    {addingTo === task.id && (
                        <InlineAddForm
                            parentId={task.id}
                            projectId={projectId}
                            onDone={() => setAddingTo(null)}
                        />
                    )}
                </div>
            )}

            <PromoteSubTaskDialog
                open={!!promotingTarget}
                onOpenChange={(o) => {
                    if (!o) {
                        setPromotingTarget(null)
                        setPromoteAssigneeFallback(null)
                    }
                }}
                projectId={projectId}
                subtasksListParentId={task.id}
                assigneeFallback={promoteAssigneeFallback}
                source={
                    promotingTarget
                        ? {
                            id: promotingTarget.id,
                            title: promotingTarget.title,
                            taskCode: promotingTarget.taskCode,
                            assignee: promotingTarget.assignee,
                            dueDate: promotingTarget.dueDate,
                            subtaskCount: promotingTarget.subtaskCount,
                            description: null,
                        }
                        : null
                }
            />

            {/* Delete dialog */}
            <Dialog open={!!deletingTarget} onOpenChange={() => setDeletingTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Xóa sub-task?</DialogTitle>
                        <DialogDescription>
                            Tất cả sub-task con (nếu có) cũng sẽ bị xóa theo. Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" size="sm" onClick={() => setDeletingTarget(null)}>Huỷ</Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                                if (!deletingTarget) return
                                deleteSubTask.mutate(deletingTarget.id, {
                                    onSuccess: () => setDeletingTarget(null),
                                    onError: () => setDeletingTarget(null),
                                })
                            }}
                            disabled={deleteSubTask.isPending}
                        >
                            Xóa
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
