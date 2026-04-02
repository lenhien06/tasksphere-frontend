"use client"

import React from "react"
import { Calendar, Clock, Loader2, UserCircle } from "lucide-react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { TaskService } from "@/app/services/TaskService"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { UserAvatar } from "@/components/common/UserAvatar"
import { useAddSubTask } from "@/hooks/useSubTasks"
import { PRIORITY_CONFIG } from "@/components/task-detail/config"
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
const STORY_POINT_PRESETS = [1, 2, 3, 5]

function getMemberOptions(members: Array<{ user?: { id?: string; fullName?: string; avatarUrl?: string | null } }>) {
    return members.map((member) => ({
        id: String(member.user?.id ?? ""),
        fullName: member.user?.fullName ?? "Unknown",
        avatarUrl: member.user?.avatarUrl ?? null,
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
    const [assigneeId, setAssigneeId] = React.useState("")
    const [selectedStatus, setSelectedStatus] = React.useState<TaskStatus>("TODO")
    const [priority, setPriority] = React.useState<TaskPriority>("MEDIUM")
    const [estimatedHours, setEstimatedHours] = React.useState("")
    const [dueDate, setDueDate] = React.useState("")
    const [storyPoints, setStoryPoints] = React.useState<number | null>(null)
    const [customSP, setCustomSP] = React.useState("")
    const [isCustomSP, setIsCustomSP] = React.useState(false)
    const [createAnother, setCreateAnother] = React.useState(false)

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
    const minDueDate = React.useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d.toISOString().split("T")[0]
    }, [])
    const selectedMember = React.useMemo(
        () => memberOptions.find((member) => member.id === assigneeId),
        [memberOptions, assigneeId]
    )
    const titleCounterClass = React.useMemo(() => {
        if (title.length > 245) return "text-red-500"
        if (title.length > 230) return "text-amber-500"
        return "text-gray-400"
    }, [title.length])

    const resetForm = React.useCallback(() => {
        setTitle("")
        setDescription("")
        setAssigneeId(assigneeFallback?.id ? String(assigneeFallback.id) : "")
        setPriority("MEDIUM")
        setEstimatedHours("")
        setDueDate("")
        setStoryPoints(null)
        setCustomSP("")
        setIsCustomSP(false)
        setSelectedStatus(availableStatuses[0] ?? "TODO")
    }, [assigneeFallback?.id, availableStatuses])

    React.useEffect(() => {
        if (!open) return
        resetForm()
    }, [open, resetForm])

    React.useEffect(() => {
        if (!open) return
        setSelectedStatus(availableStatuses[0] ?? "TODO")
    }, [open, availableStatuses])

    const handleSubmit = () => {
        if (!parentTaskId || !title.trim() || addSubTask.isPending) return

        if (title.length > 255) {
            toast.error("Ten sub-task toi da 255 ky tu")
            return
        }

        if (dueDate && dueDate <= new Date().toISOString().split("T")[0]) {
            toast.error("Ngay het han phai sau hom nay")
            return
        }

        if (storyPoints !== null && (storyPoints < 1 || storyPoints > 100)) {
            toast.error("Story points phai tu 1 den 100")
            return
        }

        const parsedEstimatedHours = estimatedHours.trim() ? Number(estimatedHours) : null
        if (parsedEstimatedHours !== null && (!Number.isFinite(parsedEstimatedHours) || parsedEstimatedHours < 0 || parsedEstimatedHours > 999.99)) {
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
            storyPoints: storyPoints ?? undefined,
            statusColumnId,
        }

        addSubTask.mutate(payload, {
            onSuccess: () => {
                if (createAnother) {
                    resetForm()
                    return
                }
                onOpenChange(false)
            },
        })
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onOpenChange(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            />

            <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                className="relative flex w-full max-w-[700px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-6 pb-4 pt-5">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900">Tạo Sub-task Mới</h2>
                    <span className="rounded-md bg-[#E5E7EB] px-2 py-0.5 font-mono text-sm text-gray-500">SUB</span>
                </div>

                <div className="custom-scrollbar max-h-[75vh] space-y-3.5 overflow-y-auto px-6 py-4">
                    <div>
                        <label className="mb-1 flex gap-1 text-sm font-semibold text-gray-800">
                            Tiêu đề <span className="text-red-500">*</span>
                        </label>
                        <input
                            autoFocus
                            maxLength={255}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Tên công việc..."
                            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-[15px] outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                        <div className={cn("mt-0.5 text-right text-[10px]", titleCounterClass)}>
                            {title.length}/255
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-800">Mô tả</label>
                        <textarea
                            rows={3}
                            maxLength={2000}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mô tả chi tiết công việc..."
                            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-[15px] outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div className="w-1/2">
                        <label className="mb-1 block text-sm font-semibold text-gray-800">Giờ ước tính</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="999.99"
                                value={estimatedHours}
                                onChange={(e) => setEstimatedHours(e.target.value)}
                                placeholder="0.0"
                                className="h-10 w-full rounded-lg border border-gray-200 pl-10 pr-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-100"
                            />
                            <Clock size={16} className="absolute left-3 top-3 text-gray-400" />
                        </div>
                        <p className="mt-1 text-[10px] text-gray-400">Thời gian dự kiến (giờ), ví dụ: 8.5</p>
                    </div>

                    <div className="flex gap-6">
                        <div className="flex-1">
                            <label className="mb-2 block text-sm font-semibold text-gray-800">Loại</label>
                            <div className="flex gap-1.5 flex-wrap">
                                <button
                                    type="button"
                                    disabled
                                    className="flex items-center gap-1.5 rounded-full border-2 border-transparent bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 ring-2 ring-blue-200 ring-offset-1"
                                >
                                    Sub-task
                                </button>
                            </div>
                        </div>

                        <div className="flex-1">
                            <label className="mb-2 block text-sm font-semibold text-gray-800">Mức độ ưu tiên</label>
                            <div className="flex gap-1.5 flex-wrap">
                                {PRIORITY_ORDER.map((value) => {
                                    const cfg = PRIORITY_CONFIG[value]
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setPriority(value)}
                                            className={cn(
                                                "flex items-center gap-1.5 rounded-full border-2 border-transparent px-3 py-1.5 text-xs font-semibold transition-all",
                                                cfg.bg,
                                                cfg.color,
                                                priority === value ? "ring-2 ring-offset-1 ring-blue-200" : "opacity-70 hover:opacity-100"
                                            )}
                                        >
                                            {cfg.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-6">
                        <div className="flex-1">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-800">Người thực hiện</label>
                            <div className="relative">
                                <select
                                    value={assigneeId}
                                    onChange={(e) => setAssigneeId(e.target.value)}
                                    className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm transition-all hover:border-gray-300"
                                    disabled={membersLoading}
                                >
                                    <option value="">Chưa phân công</option>
                                    {memberOptions.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.fullName}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute left-2.5 top-2.5 h-5 w-5 overflow-hidden rounded-full">
                                    {assigneeId
                                        ? <UserAvatar name={selectedMember?.fullName || ""} src={selectedMember?.avatarUrl ?? undefined} size={20} />
                                        : <UserCircle size={20} className="text-gray-400" />
                                    }
                                </div>
                                <div className="absolute right-3 top-3.5 h-0 w-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="flex-1">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-800">Ngày hết hạn</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dueDate}
                                    min={minDueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="h-10 w-full rounded-lg border border-gray-200 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                />
                                <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-6">
                        <div className="flex-1">
                            <label className="mb-2 block text-sm font-semibold text-gray-800">Task cha</label>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                <div className="truncate text-sm font-medium text-gray-700">
                                    {parentTitle || "Sub-task này sẽ được gắn vào task hiện tại"}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1">
                            <label className="mb-2 block text-sm font-semibold text-gray-800">Story Points</label>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {STORY_POINT_PRESETS.map((point) => (
                                    <button
                                        key={point}
                                        type="button"
                                        onClick={() => {
                                            setStoryPoints(point)
                                            setIsCustomSP(false)
                                            setCustomSP("")
                                        }}
                                        className={cn(
                                            "h-9 w-9 rounded-xl border text-sm font-medium transition-all",
                                            storyPoints === point && !isCustomSP
                                                ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                                        )}
                                    >
                                        {point}
                                    </button>
                                ))}

                                {isCustomSP ? (
                                    <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        autoFocus
                                        value={customSP}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setCustomSP(value)
                                            const parsed = Number.parseInt(value, 10)
                                            setStoryPoints(!Number.isNaN(parsed) && parsed >= 1 && parsed <= 100 ? parsed : null)
                                        }}
                                        onBlur={() => {
                                            if (!customSP) {
                                                setIsCustomSP(false)
                                            }
                                        }}
                                        placeholder="1-100"
                                        className="h-9 w-20 rounded-xl border-2 border-blue-400 text-center text-sm font-medium outline-none"
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCustomSP(true)
                                            setStoryPoints(null)
                                        }}
                                        className="h-9 rounded-xl border border-dashed border-gray-300 px-2.5 text-xs text-gray-400 transition-all hover:border-blue-300 hover:text-blue-400"
                                    >
                                        Tùy chỉnh
                                    </button>
                                )}

                                {storyPoints !== null ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStoryPoints(null)
                                            setCustomSP("")
                                            setIsCustomSP(false)
                                        }}
                                        className="text-xs text-gray-400 underline hover:text-gray-600"
                                    >
                                        Xóa
                                    </button>
                                ) : null}
                            </div>
                            <p className="mt-1.5 text-[11px] text-gray-400">Chọn nhanh hoặc nhập tay trong khoảng 1-100.</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t bg-gray-50/50 px-6 py-4">
                    <label className="flex cursor-pointer items-center gap-2 select-none">
                        <input
                            type="checkbox"
                            checked={createAnother}
                            onChange={() => setCreateAnother((prev) => !prev)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-[14px] font-medium text-gray-700">Tạo thêm sub-task</span>
                    </label>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={addSubTask.isPending}
                            className="h-10 rounded-lg border-gray-200 px-6 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!title.trim() || addSubTask.isPending || membersLoading || columnsLoading}
                            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-8 text-sm font-bold text-white shadow-md hover:bg-blue-600"
                        >
                            {addSubTask.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                            Tạo sub-task
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
