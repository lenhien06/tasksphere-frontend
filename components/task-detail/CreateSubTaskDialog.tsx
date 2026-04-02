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
            <DialogContent className="w-full max-w-[680px] overflow-hidden rounded-2xl bg-white p-0 shadow-2xl">
                <div className="border-b border-gray-100 px-6 pb-3 pt-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Tạo Sub-task Mới</h2>
                            <p className="mt-1 text-sm text-gray-500">
                                {parentTitle ? `Sub-task sẽ được tạo bên trong "${parentTitle}".` : "Thiết lập thông tin cho sub-task."}
                            </p>
                        </div>
                        <span className="rounded-md bg-[#E5E7EB] px-2 py-0.5 font-mono text-sm text-gray-500">SUB</span>
                    </div>
                </div>

                <div className="max-h-[72vh] space-y-3 overflow-y-auto px-6 py-4">
                    <div>
                        <div className="mb-1 flex items-center justify-between">
                            <Label htmlFor="subtask-title" className="text-sm font-semibold text-gray-800">Tiêu đề</Label>
                            <span className="text-[10px] text-gray-400">{title.length}/255</span>
                        </div>
                        <Input
                            id="subtask-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={255}
                            placeholder="Tên công việc..."
                            autoFocus
                            className="h-10 rounded-lg border-gray-200 px-3 text-[15px] focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <Label htmlFor="subtask-description" className="mb-1 block text-sm font-semibold text-gray-800">Mô tả</Label>
                        <textarea
                            id="subtask-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={2000}
                            rows={2}
                            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-[15px] outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            placeholder="Mô tả chi tiết công việc..."
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="subtask-estimated-hours" className="mb-1 block text-sm font-semibold text-gray-800">Giờ ước tính</Label>
                            <Input
                                id="subtask-estimated-hours"
                                type="number"
                                min={0}
                                step="0.5"
                                value={estimatedHours}
                                onChange={(e) => setEstimatedHours(e.target.value)}
                                placeholder="0.0"
                                className="h-10 rounded-lg border-gray-200"
                            />
                            <p className="mt-1 text-[10px] text-gray-400">Thời gian dự kiến (giờ), ví dụ: 8.5</p>
                        </div>

                        <div>
                            <Label htmlFor="subtask-story-points" className="mb-1 block text-sm font-semibold text-gray-800">Story Points</Label>
                            <Input
                                id="subtask-story-points"
                                type="number"
                                min={1}
                                max={100}
                                value={storyPoints}
                                onChange={(e) => setStoryPoints(e.target.value)}
                                placeholder="1-100"
                                className="h-10 rounded-lg border-gray-200"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <Label className="mb-1.5 block text-sm font-semibold text-gray-800">Trạng thái</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {availableStatuses.map((status) => {
                                    const cfg = STATUS_CONFIG[status]
                                    return (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setSelectedStatus(status)}
                                            disabled={columnsLoading}
                                            className={cn(
                                                "flex items-center gap-1.5 rounded-full border-2 border-transparent px-3 py-1 text-xs font-semibold transition-all",
                                                cfg.bg,
                                                selectedStatus === status ? "ring-2 ring-blue-200 ring-offset-1" : "opacity-75 hover:opacity-100"
                                            )}
                                        >
                                            <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                                            {cfg.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div>
                            <Label className="mb-1.5 block text-sm font-semibold text-gray-800">Mức độ ưu tiên</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {PRIORITY_ORDER.map((value) => {
                                    const cfg = PRIORITY_CONFIG[value]
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setPriority(value)}
                                            className={cn(
                                                "rounded-full border-2 border-transparent px-3 py-1 text-xs font-semibold transition-all",
                                                cfg.bg,
                                                cfg.color,
                                                priority === value ? "ring-2 ring-blue-200 ring-offset-1" : "opacity-75 hover:opacity-100"
                                            )}
                                        >
                                            {cfg.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="subtask-assignee" className="mb-1.5 block text-sm font-semibold text-gray-800">Người thực hiện</Label>
                            <select
                                id="subtask-assignee"
                                value={assigneeId}
                                onChange={(e) => setAssigneeId(e.target.value)}
                                className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white px-3 text-sm transition-all hover:border-gray-300"
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

                        <div>
                            <Label htmlFor="subtask-due-date" className="mb-1.5 block text-sm font-semibold text-gray-800">Ngày hết hạn</Label>
                            <Input
                                id="subtask-due-date"
                                type="date"
                                min={todayYmd}
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="h-10 rounded-lg border-gray-200"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <Label className="mb-1.5 block text-sm font-semibold text-gray-800">Loại</Label>
                            <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-600">
                                Sub-task
                            </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500">
                            Có thể chuyển thành task độc lập sau này nếu cần.
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={addSubTask.isPending} className="h-[42px] rounded-xl px-6">
                        Hủy
                    </Button>
                    <Button onClick={handleSubmit} disabled={disableSubmit} className="h-[42px] rounded-xl bg-[#A7C7FF] px-8 text-white hover:bg-[#8eb6ff]">
                        {addSubTask.isPending ? "Đang tạo..." : "Tạo sub-task"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
