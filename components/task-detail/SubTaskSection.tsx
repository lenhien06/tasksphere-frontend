"use client"

import React, { useState } from "react"
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
    usePromoteSubTask,
    useUpdateSubTaskStatus,
    useDeleteSubTask,
} from "@/hooks/useSubTasks"
import { PRIORITY_CONFIG } from "@/components/task-detail/config"
import type { TaskDetailResponse, SubTaskResponse } from "@/app/types/task.schema"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

interface SubTaskSectionProps {
    task: TaskDetailResponse
    projectId: string
    canEdit: boolean
    isPM?: boolean
}

// ── Recursive subtask node ────────────────────────────────────

interface SubTaskNodeProps {
    sub: SubTaskResponse
    projectId: string
    depth: number
    canEdit: boolean
    isPM: boolean
    onPromote: (sub: SubTaskResponse) => void
    onToggleDone: (sub: SubTaskResponse, checked: boolean) => void
    onDelete: (sub: SubTaskResponse) => void
    onAddChild: (parentId: string) => void
    addingTo: string | null
    onAddDone: () => void
}

function SubTaskNode({
    sub,
    projectId,
    depth,
    canEdit,
    isPM,
    onPromote,
    onToggleDone,
    onDelete,
    onAddChild,
    addingTo,
    onAddDone,
}: SubTaskNodeProps) {
    const router = useRouter()
    const [expanded, setExpanded] = useState(false)
    const { data: children, isFetching } = useSubTasks(expanded ? sub.id : "")
    const priCfg = PRIORITY_CONFIG[sub.priority]
    const hasChildren = sub.subtaskCount > 0
    const isDone = sub.taskStatus === "DONE"
    const isCancelled = sub.taskStatus === "CANCELLED"

    return (
        <div style={{ paddingLeft: depth * 20 }}>
            <div className="flex items-center gap-2 py-1.5 group hover:bg-accent/30 rounded px-2 transition-colors">
                {/* Expand toggle */}
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

                {/* Checkbox */}
                <Checkbox
                    checked={isDone}
                    onCheckedChange={(v) => onToggleDone(sub, !!v)}
                    disabled={!canEdit || isCancelled}
                    className="h-4 w-4 rounded-full shrink-0"
                />

                {/* Title */}
                <button
                    className={cn(
                        "flex-1 text-left text-sm truncate hover:text-primary transition-colors",
                        (isDone || isCancelled) && "line-through text-muted-foreground"
                    )}
                    onClick={() => router.push(`/projects/${projectId}/tasks/${sub.id}`)}
                >
                    <span className="text-[11px] text-muted-foreground mr-1.5 font-mono">{sub.taskCode}</span>
                    {sub.title}
                </button>

                {/* Child count badge */}
                {hasChildren && (
                    <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                        ▶ {sub.completedSubtaskCount}/{sub.subtaskCount}
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
                            <DropdownMenuItem onClick={() => onPromote(sub)}>
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
                    <InlineAddForm parentId={sub.id} projectId={projectId} onDone={onAddDone} />
                </div>
            )}

            {/* Expanded children */}
            {expanded && (
                <div>
                    {isFetching && (
                        <div style={{ paddingLeft: (depth + 1) * 20 }} className="text-xs text-muted-foreground py-1 px-2 animate-pulse">
                            Đang tải...
                        </div>
                    )}
                    {!isFetching && children?.map(child => (
                        <SubTaskNode
                            key={child.id}
                            sub={child}
                            projectId={projectId}
                            depth={depth + 1}
                            canEdit={canEdit}
                            isPM={isPM}
                            onPromote={onPromote}
                            onToggleDone={onToggleDone}
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
    const [title, setTitle] = useState("")
    const addSubTask = useAddSubTask(projectId, parentId)

    const submit = () => {
        if (!title.trim()) return
        addSubTask.mutate(title.trim(), { onSuccess: () => { setTitle(""); onDone() } })
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
                Thêm
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
    const updateSubTaskStatus = useUpdateSubTaskStatus(projectId, task.id)
    const promoteSubTask = usePromoteSubTask(projectId, task.id)
    const deleteSubTask = useDeleteSubTask(projectId, task.id)

    const [addingTo, setAddingTo] = useState<string | null>(null)
    const [promotingTarget, setPromotingTarget] = useState<SubTaskResponse | null>(null)
    const [deletingTarget, setDeletingTarget] = useState<SubTaskResponse | null>(null)

    const total = subTasks.length
    const done = subTasks.filter(s => s.taskStatus === "DONE" || s.taskStatus === "CANCELLED").length
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
                            projectId={projectId}
                            depth={0}
                            canEdit={canEdit}
                            isPM={isPM}
                            onPromote={setPromotingTarget}
                            onToggleDone={(s, checked) =>
                                updateSubTaskStatus.mutate({ taskId: s.id, status: checked ? "DONE" : "IN_PROGRESS" })
                            }
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

            {/* Promote dialog */}
            <Dialog open={!!promotingTarget} onOpenChange={() => setPromotingTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Chuyển thành Task độc lập?</DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-2 text-sm text-muted-foreground mt-1">
                                <p>
                                    Sub-task <b className="text-foreground">&ldquo;{promotingTarget?.title}&rdquo;</b> sẽ được tách ra khỏi{" "}
                                    <b className="text-foreground">{task.taskCode}</b>.
                                </p>
                                {(promotingTarget?.subtaskCount ?? 0) > 0 && (
                                    <p className="text-amber-600 font-medium text-xs">
                                        ⚠ Sub-task con (nếu có) sẽ theo cùng.
                                    </p>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" size="sm" onClick={() => setPromotingTarget(null)}>Huỷ</Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                if (!promotingTarget) return
                                promoteSubTask.mutate(promotingTarget.id, {
                                    onSuccess: () => setPromotingTarget(null),
                                    onError: () => setPromotingTarget(null),
                                })
                            }}
                            disabled={promoteSubTask.isPending}
                        >
                            Xác nhận
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

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
