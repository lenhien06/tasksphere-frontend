"use client"

import React from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { TaskService } from "@/app/services/TaskService"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { useAddSubTask } from "@/hooks/useSubTasks"
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/components/task-detail/config"
import type {
    ColumnResponse,
    CreateTaskRequest,
    TaskPriority,
    TaskStatus,
    UserSummary,
} from "@/app/types/task.schema"

type CreateSubTaskDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    parentTaskId: string | null
    parentTitle?: string | null
    assigneeFallback?: UserSummary | null
}

const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]
const PRIORITY_ORDER: TaskPriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

function getMemberOptions(members: Array<{ user?: { id?: string; fullName?: string; avatarUrl?: string | null } }>) {
    return members.map((member) => ({
        id: String(member.user?.id ?? ""),
        fullName: member.user?.fullName ?? "Unknown",
    })).filter((member) => member.id)
}

function getAvailableStatuses(columns: ColumnResponse[]) {
    const seen = new Set<TaskStatus>()
    return columns
        .filter((column) => column.mappedStatus && !seen.has(column.mappedStatus))
        .sort((a, b) => a.position - b.position)
        .map((column) => {
            seen.add(column.mappedStatus!)
            return column.mappedStatus!
        })
        .sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b))
}

function findColumnIdForStatus(columns: ColumnResponse[], status: TaskStatus) {
    return columns
        .filter((column) => column.mappedStatus === status)
        .sort((a, b) => a.position - b.position)[0]?.id
        ?? columns.find((column) => column.isDefault)?.id
        ?? columns[0]?.id
        ?? ""
}

export default function CreateSubTaskDialog({
    open,
    onOpenChange,
    projectId,
    parentTaskId,
    parentTitle,
    assigneeFallback,
}: CreateSubTaskDialogProps) {
    const addSubTask = useAddSubTask(projectId, parentTaskId ?? "")
    const [title, setTitle] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [assigneeId, setAssigneeId] = React.useState<string>("")
    const [selectedStatus, setSelectedStatus] = React.useState<TaskStatus>("TODO")
    const [priority, setPriority] = React.useState<TaskPriority>("MEDIUM")
    const [estimatedHours, setEstimatedHours] = React.useState("")
    const [dueDate, setDueDate] = React.useState("")
    const [storyPoints, setStoryPoints] = React.useState("")

    const { data: members = [], isLoading: membersLoading } = useQuery({
        queryKey: ["project-members", projectId],
        queryFn: () => ProjectMemberService.getMembers(projectId),
        staleTime: 60_000,
        enabled: open && !!projectId,
    })

    const { data: columns = [], isLoading: columnsLoading } = useQuery({
        queryKey: ["columns", projectId],
        queryFn: () => TaskService.getColumns(projectId),
        staleTime: 60_000,
        enabled: open && !!projectId,
    })

    const memberOptions = React.useMemo(() => getMemberOptions(members), [members])
    const availableStatuses = React.useMemo(() => getAvailableStatuses(columns), [columns])
    const todayYmd = React.useMemo(() => new Date().toISOString().slice(0, 10), [])

    React.useEffect(() => {
        if (!open) return
        setTitle("")
        setDescription("")
        setAssigneeId(assigneeFallback?.id ? String(assigneeFallback.id) : "")
        setPriority("MEDIUM")
        setEstimatedHours("")
        setDueDate("")
        setStoryPoints("")
    }, [open, assigneeFallback?.id])

    React.useEffect(() => {
        if (!open) return
        setSelectedStatus(availableStatuses[0] ?? "TODO")
    }, [open, availableStatuses])

    const handleSubmit = () => {
        if (!parentTaskId) return
        if (!title.trim()) {
            toast.error("Ten sub-task khong duoc de trong")
            return
        }

        const parsedStoryPoints = storyPoints.trim() ? Number(storyPoints) : null
        if (parsedStoryPoints !== null && (!Number.isInteger(parsedStoryPoints) || parsedStoryPoints < 1 || parsedStoryPoints > 100)) {
            toast.error("Story points phai tu 1 den 100")
            return
        }

        const parsedEstimatedHours = estimatedHours.trim() ? Number(estimatedHours) : null
        if (parsedEstimatedHours !== null && (!Number.isFinite(parsedEstimatedHours) || parsedEstimatedHours < 0)) {
            toast.error("Gio uoc tinh phai la so hop le")
            return
        }

        const statusColumnId = findColumnIdForStatus(columns, selectedStatus)
        if (!statusColumnId) {
            toast.error("Khong tim thay cot phu hop cho trang thai da chon")
            return
        }

        const payload: CreateTaskRequest = {
            title: title.trim(),
            description: description.trim() || undefined,
            type: "SUB_TASK",
            priority,
            assigneeId: assigneeId || undefined,
            estimatedHours: parsedEstimatedHours ?? undefined,
            dueDate: dueDate || undefined,
            storyPoints: parsedStoryPoints ?? undefined,
            statusColumnId,
        }

        addSubTask.mutate(payload, {
            onSuccess: () => onOpenChange(false),
        })
    }

    const disableSubmit = !title.trim() || addSubTask.isPending || membersLoading || columnsLoading

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Tao sub-task</DialogTitle>
                    <DialogDescription>
                        {parentTitle ? `Sub-task moi se duoc tao ben trong "${parentTitle}".` : "Thiet lap thong tin cho sub-task truoc khi tao."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="subtask-title">Tieu de</Label>
                        <Input
                            id="subtask-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={255}
                            placeholder="Nhap ten sub-task"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="subtask-description">Mo ta</Label>
                        <textarea
                            id="subtask-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={2000}
                            rows={4}
                            className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                            placeholder="Mo ta ngan cho sub-task"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="subtask-assignee">Nguoi duoc giao</Label>
                            <select
                                id="subtask-assignee"
                                value={assigneeId}
                                onChange={(e) => setAssigneeId(e.target.value)}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                                disabled={membersLoading}
                            >
                                <option value="">Chua phan cong</option>
                                {memberOptions.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.fullName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="subtask-status">Status</Label>
                            <select
                                id="subtask-status"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value as TaskStatus)}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                                disabled={columnsLoading || availableStatuses.length === 0}
                            >
                                {availableStatuses.map((status) => (
                                    <option key={status} value={status}>
                                        {STATUS_CONFIG[status].label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="subtask-priority">Priority</Label>
                            <select
                                id="subtask-priority"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                            >
                                {PRIORITY_ORDER.map((value) => (
                                    <option key={value} value={value}>
                                        {PRIORITY_CONFIG[value].label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="subtask-due-date">Due date</Label>
                            <Input
                                id="subtask-due-date"
                                type="date"
                                min={todayYmd}
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="subtask-story-points">Story points</Label>
                            <Input
                                id="subtask-story-points"
                                type="number"
                                min={1}
                                max={100}
                                value={storyPoints}
                                onChange={(e) => setStoryPoints(e.target.value)}
                                placeholder="1-100"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="subtask-estimated-hours">Gio uoc tinh</Label>
                            <Input
                                id="subtask-estimated-hours"
                                type="number"
                                min={0}
                                step="0.5"
                                value={estimatedHours}
                                onChange={(e) => setEstimatedHours(e.target.value)}
                                placeholder="VD: 4"
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Sub-task van giu logic co the chuyen thanh task doc lap sau nay neu can.
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={addSubTask.isPending}>
                            Huy
                        </Button>
                        <Button onClick={handleSubmit} disabled={disableSubmit}>
                            {addSubTask.isPending ? "Dang tao..." : "Tao sub-task"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
