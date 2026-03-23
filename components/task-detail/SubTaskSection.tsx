"use client"

import React, { useState } from "react"
import { Plus, ExternalLink, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { UserAvatar } from "@/components/common/UserAvatar"
import {
    useSubTasks,
    useAddSubTask,
    usePromoteSubTask,
    useUpdateSubTaskStatus,
} from "@/hooks/useSubTasks"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/components/task-detail/config"
import type { TaskDetailResponse, SubTaskResponse, TaskStatus } from "@/app/types/task.schema"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

interface SubTaskSectionProps {
    task: TaskDetailResponse
    projectId: string
    canEdit: boolean
}

function SubTaskRow({
    sub,
    projectId,
    onPromote,
    onToggleDone,
    canEdit,
}: {
    sub: SubTaskResponse
    projectId: string
    onPromote: (id: string) => void
    onToggleDone: (sub: SubTaskResponse, checked: boolean) => void
    canEdit: boolean
}) {
    const router = useRouter()
    const statusCfg = STATUS_CONFIG[sub.taskStatus as TaskStatus] ?? STATUS_CONFIG["TODO"]
    const priCfg = PRIORITY_CONFIG[sub.priority]

    return (
        <div className="flex items-center gap-3 py-2 group hover:bg-accent/30 rounded px-2 transition-colors">
            <Checkbox
                checked={sub.taskStatus === "DONE"}
                onCheckedChange={(v) => onToggleDone(sub, !!v)}
                disabled={!canEdit}
                className="h-4 w-4 shrink-0"
            />

            {/* Title */}
            <button
                className="flex-1 text-left text-sm truncate hover:text-primary"
                onClick={() => router.push(`/projects/${projectId}/tasks/${sub.id}`)}
                aria-label={`View sub-task ${sub.taskCode}`}
            >
                <span className="text-xs text-muted-foreground mr-1.5 font-mono">{sub.taskCode}</span>
                {sub.title}
            </button>

            {/* Priority */}
            <span className={cn("text-xs font-medium hidden group-hover:block shrink-0", priCfg.color)}>
                {priCfg.label}
            </span>

            {/* Assignee avatar */}
            {sub.assignee && (
                <UserAvatar
                    src={sub.assignee.avatarUrl ?? undefined}
                    name={sub.assignee.fullName}
                    size={20}
                    className="shrink-0"
                />
            )}

            {/* Status badge */}
            <Badge className={cn("text-xs px-2 py-0 h-5 shrink-0 border-0", statusCfg.bg)}>
                {statusCfg.label}
            </Badge>

            {/* Promote button */}
            <button
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity shrink-0"
                onClick={() => onPromote(sub.id)}
                title="Promote to independent task"
                aria-label="Promote sub-task"
            >
                <ArrowUpRight size={13} />
            </button>
        </div>
    )
}

export default function SubTaskSection({ task, projectId, canEdit }: SubTaskSectionProps) {
    const { data: subTasks = [], isLoading } = useSubTasks(task.id)
    const addSubTask = useAddSubTask(projectId, task.id)
    const promoteSubTask = usePromoteSubTask(projectId, task.id)
    const updateSubTaskStatus = useUpdateSubTaskStatus(projectId, task.id)

    const [showInput, setShowInput] = useState(false)
    const [newTitle, setNewTitle] = useState("")
    const [promotingId, setPromotingId] = useState<string | null>(null)

    const total = subTasks.length
    const done = subTasks.filter(s => s.taskStatus === "DONE" || s.taskStatus === "CANCELLED").length
    const percent = total > 0 ? Math.round((done / total) * 100) : 0
    const atDepthLimit = ((task as any).depth ?? 0) >= 3
    const isEpic = task.type === "EPIC"
    const canAddSubTask = canEdit && !atDepthLimit && !isEpic

    const handleAddSubTask = () => {
        if (!newTitle.trim()) return
        addSubTask.mutate(newTitle.trim(), {
            onSuccess: () => { setNewTitle(""); setShowInput(false) }
        })
    }

    const handlePromote = (id: string) => setPromotingId(id)

    const handleToggleDone = (sub: SubTaskResponse, checked: boolean) => {
        const targetStatus: TaskStatus = checked ? "DONE" : "IN_PROGRESS"
        const statusColumnId = (sub as any).statusColumnId ?? (sub as any).columnId
        if (!statusColumnId) {
            toast.error("Thiếu status column để cập nhật sub-task")
            return
        }
        updateSubTaskStatus.mutate({
            taskId: sub.id,
            status: targetStatus,
            columnId: statusColumnId,
        })
    }

    const confirmPromote = () => {
        if (!promotingId) return
        promoteSubTask.mutate(promotingId, {
            onSuccess: () => setPromotingId(null),
            onError: () => setPromotingId(null),
        })
    }

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                    📎 Sub-tasks
                    <span className="text-muted-foreground font-normal">{done}/{total}</span>
                </span>
                {total > 0 && (
                    <Progress value={percent} className="flex-1 h-1" />
                )}
                {canEdit && !isEpic && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={() => {
                            if (atDepthLimit) {
                                toast.error("Maximum 3 sub-task levels reached")
                                return
                            }
                            setShowInput(true)
                        }}
                        disabled={atDepthLimit}
                        title={atDepthLimit ? "Maximum 3 levels reached" : "Add sub-task"}
                        aria-label="Add sub-task"
                    >
                        <Plus size={13} className="mr-0.5" /> Add
                    </Button>
                )}
            </div>

            {/* Loading skeleton */}
            {isLoading && (
                <div className="space-y-2 animate-pulse pl-2">
                    {[1, 2].map(i => <div key={i} className="h-6 bg-muted rounded" />)}
                </div>
            )}

            {/* Sub-task list */}
            {!isLoading && subTasks.length > 0 && (
                <div className="divide-y divide-border/50 pl-1">
                    {subTasks.map(s => (
                        <SubTaskRow
                            key={s.id}
                            sub={s}
                            projectId={projectId}
                            onPromote={handlePromote}
                            onToggleDone={handleToggleDone}
                            canEdit={canEdit}
                        />
                    ))}
                </div>
            )}

            {/* Add form */}
            {showInput && (
                <div className="flex items-center gap-2 pl-1">
                    <Input
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="Sub-task title..."
                        className="h-8 text-sm flex-1"
                        autoFocus
                        onKeyDown={e => {
                            if (e.key === "Enter") handleAddSubTask()
                            if (e.key === "Escape") { setShowInput(false); setNewTitle("") }
                        }}
                    />
                    <Button size="sm" onClick={handleAddSubTask} disabled={!newTitle.trim() || addSubTask.isPending}>
                        Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowInput(false); setNewTitle("") }}>
                        Cancel
                    </Button>
                </div>
            )}

            {/* Promote confirm dialog */}
            <Dialog open={!!promotingId} onOpenChange={() => setPromotingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Promote sub-task?</DialogTitle>
                        <DialogDescription>
                            This sub-task will become an independent task and will no longer be a child of the current task.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" size="sm" onClick={() => setPromotingId(null)}>Cancel</Button>
                        <Button size="sm" onClick={confirmPromote} disabled={promoteSubTask.isPending}>
                            Confirm
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
