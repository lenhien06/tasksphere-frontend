"use client"

import React from "react"
import { useTranslation } from "react-i18next"
import {
    CheckCircle2,
    ChevronDown,
    Lock,
    Play,
    Flag,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useDroppable } from "@dnd-kit/core"
import type { SprintDetail, SprintStatus, TaskResponse } from "@/app/types/task.schema"
import { useSprintTasks } from "@/hooks/useSprintTasks"
import { formatSprintDateRange } from "./utils"
import { DraggableSprintTaskRow } from "./SprintTaskRow"

function SprintStatusBadge({ status }: { status: SprintStatus }) {
    const { t } = useTranslation()
    const map = {
        ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
        PLANNED: "border-slate-200 bg-slate-100 text-slate-600",
        COMPLETED: "border-gray-200 bg-gray-50 text-gray-400",
    } as const
    const labelKey =
        status === "ACTIVE"
            ? "sprint.status_ACTIVE"
            : status === "PLANNED"
              ? "sprint.status_PLANNED"
              : "sprint.status_COMPLETED"
    return (
        <span
            className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                map[status],
            )}
        >
            {t(labelKey)}
        </span>
    )
}

export function SprintSection({
    projectId,
    sprint,
    isOpen,
    onToggle,
    isPM,
    isMemberOnly,
    anyActiveSprint,
    onStartSprint,
    onCompleteSprint,
    onOpenTask,
    onMoveTaskToBacklog,
    dragEnabled,
}: {
    projectId: string
    sprint: SprintDetail
    isOpen: boolean
    onToggle: () => void
    isPM: boolean
    /** true khi user là MEMBER (không phải PM) — BR-20 khóa thao tác sprint ACTIVE */
    isMemberOnly: boolean
    anyActiveSprint: boolean
    onStartSprint: () => void
    onCompleteSprint: () => void
    onOpenTask: (taskId: string) => void
    onMoveTaskToBacklog: (taskId: string) => Promise<void>
    dragEnabled: boolean
}) {
    const { t } = useTranslation()
    const { data: page, isLoading } = useSprintTasks(projectId, sprint.id, isOpen)

    const readOnly = sprint.status === "COMPLETED"
    const sprintLockedForMember = sprint.status === "ACTIVE" && isMemberOnly
    const showStart =
        isPM && sprint.status === "PLANNED" && !anyActiveSprint && !readOnly
    const showComplete = isPM && sprint.status === "ACTIVE" && !readOnly
    const canMoveTaskToBacklogRow =
        isPM && !readOnly && !(sprint.status === "ACTIVE" && sprintLockedForMember)

    const { setNodeRef, isOver } = useDroppable({
        id: `sprint-drop-${sprint.id}`,
        disabled: readOnly || !dragEnabled,
        data: {
            type: "sprint-drop",
            sprintId: sprint.id,
        },
    })

    const tasks: TaskResponse[] = page?.content ?? []
    const totalPts = tasks.reduce((s, x) => s + (x.storyPoints ?? 0), 0)
    const dateLabel = formatSprintDateRange(sprint.startDate, sprint.endDate)
    const statsLabel = `${sprint.taskCount} ${t("nav.tasks").toLowerCase()} · ${totalPts || "—"} pts`

    return (
        <div
            className={cn(
                "mb-4 overflow-hidden rounded-md border border-[#DFE1E6] bg-white transition-colors",
                sprint.status === "ACTIVE" && "border-[#85B8FF]",
                sprint.status === "COMPLETED" && "opacity-85",
                isOver && "ring-2 ring-[#0C66E4] ring-inset",
            )}
        >
            <div className="flex items-start gap-2 bg-[#FAFBFC] px-3 py-3 sm:px-4">
                <button
                    type="button"
                    onClick={onToggle}
                    className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                    aria-expanded={isOpen}
                >
                    <ChevronDown
                        size={18}
                        className={cn("transition-transform", !isOpen && "-rotate-90")}
                    />
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        {sprint.status === "ACTIVE" && (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" strokeWidth={2.5} />
                        )}
                        <h3
                            className={cn(
                                "text-sm font-semibold sm:text-base",
                                sprint.status === "COMPLETED" ? "text-gray-500" : "text-gray-900",
                            )}
                        >
                            {sprint.name}
                        </h3>
                        <SprintStatusBadge status={sprint.status} />
                        {sprint.status === "ACTIVE" && sprintLockedForMember && (
                            <span title={t("backlog.sprintLockedMemberHint")}>
                                <Lock className="h-3.5 w-3.5 text-amber-600" />
                            </span>
                        )}
                        {sprint.status === "ACTIVE" && isPM && (
                            <span title={t("backlog.sprintLockPMHint")}>
                                <Lock className="h-3.5 w-3.5 text-blue-500" />
                            </span>
                        )}
                    </div>
                    {sprint.goal && (
                        <p className="mt-0.5 truncate text-xs italic text-gray-500">{sprint.goal}</p>
                    )}
                    <p className="mt-1 text-[11px] text-gray-500">
                        {dateLabel}
                        <span className="mx-1.5 text-gray-300">·</span>
                        {statsLabel}
                    </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    {showStart && (
                        <button
                            type="button"
                            onClick={onStartSprint}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                        >
                            <Play size={12} className="fill-current" />
                            {t("backlog.startSprint")}
                        </button>
                    )}
                    {showComplete && (
                        <button
                            type="button"
                            onClick={onCompleteSprint}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                            {t("backlog.endSprint")}
                        </button>
                    )}
                    {sprint.status === "PLANNED" && isPM && anyActiveSprint && (
                        <span className="max-w-[140px] text-right text-[10px] text-amber-700">
                            {t("backlog.startBlockedActiveExists")}
                        </span>
                    )}
                </div>
            </div>

            {isOpen && (
                <div
                    ref={setNodeRef}
                    className={cn(
                        "border-t border-[#EBECF0]",
                        isOver && "bg-[#E9F2FF]/60"
                    )}
                >
                    {isLoading ? (
                        <div className="space-y-2 p-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
                            ))}
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="flex min-h-[76px] flex-col items-center justify-center py-6 text-center text-sm text-gray-400">
                            <Flag className="mb-2 h-8 w-8 text-gray-200" />
                            {readOnly ? t("backlog.sprintNoTasksHistorical") : t("backlog.sprintDropHint")}
                        </div>
                    ) : (
                        <>
                            <div className="hidden bg-[#F7F8F9] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:flex sm:gap-2 sm:px-2.5">
                                <span className="hidden w-[88px] sm:block">{t("task.type")}</span>
                                <span className="w-20">{t("backlog.taskId", { defaultValue: "ID" })}</span>
                                <span className="flex-1">{t("backlog.taskTitle", { defaultValue: "Title" })}</span>
                                <span className="w-24 text-center">{t("task.priority")}</span>
                                <span className="hidden w-14 text-center lg:block">
                                    {t("backlog.storyPts")}
                                </span>
                                <span className="w-20 text-center">{t("project.status_TODO", { defaultValue: "Status" })}</span>
                                <span className="w-12 text-center">{t("task.assignee")}</span>
                                {canMoveTaskToBacklogRow && <span className="w-8" />}
                            </div>
                            {tasks.map(task => (
                                <DraggableSprintTaskRow
                                    key={task.id}
                                    task={task}
                                    onRowClick={() => onOpenTask(task.id)}
                                    readOnly={readOnly}
                                    canMoveToBacklog={canMoveTaskToBacklogRow}
                                    onMoveToBacklog={() => onMoveTaskToBacklog(task.id)}
                                    sourceSprintId={sprint.id}
                                    dragDisabled={!dragEnabled || readOnly}
                                />
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
