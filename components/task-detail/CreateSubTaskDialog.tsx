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
} from "@/components/ui/dialog"
import { TaskService } from "@/app/services/TaskService"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { useAddSubTask } from "@/hooks/useSubTasks"
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/components/task-detail/config"
import { cn } from "@/lib/utils"
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
            <DialogContent className="w-[min(92vw,620px)] max-w-[620px] overflow-hidden rounded-[28px] border-0 bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                <div className="max-h-[82vh] overflow-y-auto">
                    <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-[24px] font-bold tracking-tight text-slate-900">Tạo sub-task</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {parentTitle ? `Tạo công việc con trong "${parentTitle}".` : "Thiết lập nhanh thông tin cho sub-task."}
                                </p>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-600">
                                SUB-TASK
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="subtask-title" className="text-sm font-semibold text-slate-700">Tiêu đề</Label>
                                    <span className="text-xs text-slate-400">{title.length}/255</span>
                                </div>
                                <Input
                                    id="subtask-title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    maxLength={255}
                                    placeholder="Tên công việc con..."
                                    autoFocus
                                    className="h-12 rounded-2xl border-slate-200 px-4 text-base"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subtask-description" className="text-sm font-semibold text-slate-700">Mô tả</Label>
                                <textarea
                                    id="subtask-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    maxLength={2000}
                                    rows={3}
                                    className="min-h-[104px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300"
                                    placeholder="Mô tả ngắn cho sub-task..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 px-5 py-5">
                        <div className="space-y-2.5">
                            <Label className="text-sm font-semibold text-slate-700">Trạng thái</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {availableStatuses.map((status) => {
                                    const cfg = STATUS_CONFIG[status]
                                    const active = selectedStatus === status
                                    return (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setSelectedStatus(status)}
                                            disabled={columnsLoading}
                                            className={cn(
                                                "flex h-11 items-center gap-2 rounded-2xl border px-3 text-sm font-medium transition",
                                                active
                                                    ? `border-slate-300 ${cfg.bg} shadow-sm`
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                            )}
                                        >
                                            <span className={cn("h-2.5 w-2.5 rounded-full", cfg.dot)} />
                                            {cfg.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-sm font-semibold text-slate-700">Mức độ ưu tiên</Label>
                            <div className="flex flex-wrap gap-2">
                                {PRIORITY_ORDER.map((value) => {
                                    const cfg = PRIORITY_CONFIG[value]
                                    const active = priority === value
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setPriority(value)}
                                            className={cn(
                                                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                                                active
                                                    ? `${cfg.bg} ${cfg.color} border-transparent`
                                                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                            )}
                                        >
                                            {cfg.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="subtask-assignee" className="text-sm font-semibold text-slate-700">Người thực hiện</Label>
                                <select
                                    id="subtask-assignee"
                                    value={assigneeId}
                                    onChange={(e) => setAssigneeId(e.target.value)}
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-300"
                                    disabled={membersLoading}
                                >
                                    <option value="">Chưa phân công</option>
                                    {memberOptions.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subtask-due-date" className="text-sm font-semibold text-slate-700">Ngày hết hạn</Label>
                                <Input
                                    id="subtask-due-date"
                                    type="date"
                                    min={todayYmd}
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="h-11 rounded-2xl border-slate-200"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="subtask-story-points" className="text-sm font-semibold text-slate-700">Story Points</Label>
                                <Input
                                    id="subtask-story-points"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={storyPoints}
                                    onChange={(e) => setStoryPoints(e.target.value)}
                                    placeholder="1-100"
                                    className="h-11 rounded-2xl border-slate-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subtask-estimated-hours" className="text-sm font-semibold text-slate-700">Giờ ước tính</Label>
                                <Input
                                    id="subtask-estimated-hours"
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    value={estimatedHours}
                                    onChange={(e) => setEstimatedHours(e.target.value)}
                                    placeholder="VD: 4"
                                    className="h-11 rounded-2xl border-slate-200"
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                            Sub-task này vẫn giữ nguyên logic có thể chuyển thành task độc lập sau này nếu cần.
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={addSubTask.isPending}
                        className="rounded-xl"
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={disableSubmit}
                        className="rounded-xl bg-[#1677FF] px-5"
                    >
                        {addSubTask.isPending ? "Đang tạo..." : "Tạo sub-task"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
