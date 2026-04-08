"use client"

import React from "react"
import { useTranslation } from "react-i18next"
import { User } from "lucide-react"
import { UserAvatar } from "@/components/common/UserAvatar"
import { cn } from "@/lib/utils"
import type {
    TaskPriority,
    TaskStatus,
    TaskType,
    TaskResponse,
} from "@/app/types/task.schema"

export const TYPE_CONFIG: Record<TaskType, { bg: string; text: string }> = {
    BUG: { bg: "bg-[#FEE2E2]", text: "text-[#991B1B]" },
    FEATURE: { bg: "bg-[#EFF6FF]", text: "text-[#1D4ED8]" },
    TASK: { bg: "bg-slate-100", text: "text-slate-700" },
    STORY: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
    EPIC: { bg: "bg-[#EDE9FE]", text: "text-[#5B21B6]" },
    SUB_TASK: { bg: "bg-gray-100", text: "text-gray-600" },
}

const PRIORITY_CONFIG: Record<TaskPriority, { dot: string }> = {
    CRITICAL: { dot: "bg-violet-600" },
    HIGH: { dot: "bg-red-500" },
    MEDIUM: { dot: "bg-amber-400" },
    LOW: { dot: "bg-emerald-500" },
}

const STATUS_BADGE: Record<TaskStatus, { bg: string; text: string }> = {
    TODO: { bg: "bg-slate-100", text: "text-slate-600" },
    IN_PROGRESS: { bg: "bg-blue-50", text: "text-blue-700" },
    TESTING: { bg: "bg-violet-50", text: "text-violet-700" },
    IN_REVIEW: { bg: "bg-amber-50", text: "text-amber-700" },
    DONE: { bg: "bg-emerald-50", text: "text-emerald-700" },
    CANCELLED: { bg: "bg-red-50", text: "text-red-600" },
}

export function PriorityDot({ priority }: { priority: TaskPriority }) {
    const cfg = PRIORITY_CONFIG[priority] || { dot: "bg-gray-300" }
    return <span className={cn("h-2 w-2 shrink-0 rounded-full", cfg.dot)} title={priority} />
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
    const { t } = useTranslation()
    const cfg = STATUS_BADGE[status] || STATUS_BADGE.TODO
    return (
        <span
            className={cn(
                "whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold",
                cfg.bg,
                cfg.text,
            )}
        >
            {t(`project.status_${status}`, { defaultValue: status })}
        </span>
    )
}

export function TypeBadgeMini({ type }: { type: TaskType }) {
    const { t } = useTranslation()
    const cfg = TYPE_CONFIG[type] || { bg: "bg-gray-100", text: "text-gray-600" }
    return (
        <span
            className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                cfg.bg,
                cfg.text,
            )}
        >
            {t(`project.type_${type}`, { defaultValue: type })}
        </span>
    )
}

export function AssigneeCell({ task }: { task: TaskResponse }) {
    if (task.assignee) {
        return (
            <div className="flex justify-center" title={task.assignee.fullName}>
                <UserAvatar
                    name={task.assignee.fullName}
                    src={task.assignee.avatarUrl || undefined}
                    size={28}
                />
            </div>
        )
    }
    return (
        <div className="flex justify-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-gray-200">
                <User size={12} className="text-gray-300" />
            </div>
        </div>
    )
}

export function taskRowOverdueBg(task: TaskResponse): string {
    const overdue =
        task.overdue ||
        (!!task.dueDate &&
            task.taskStatus !== "DONE" &&
            task.taskStatus !== "CANCELLED" &&
            new Date(task.dueDate) < new Date(new Date().toDateString()))
    return overdue ? "bg-red-50/90 hover:bg-red-50" : ""
}
