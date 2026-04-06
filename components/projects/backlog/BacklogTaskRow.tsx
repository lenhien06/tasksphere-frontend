"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import {
    Link2,
    MoreHorizontal,
    Pencil,
    Trash2,
    GripVertical,
    MessageSquare,
    Paperclip,
    Layers,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { TaskResponse } from "@/app/types/task.schema"
import type { SprintDetail } from "@/app/types/task.schema"
import { AssignSprintDropdown } from "./AssignSprintDropdown"
import {
    AssigneeCell,
    PriorityDot,
    taskRowOverdueBg,
    TypeBadgeMini,
} from "./backlog-row-shared"
import { toast } from "sonner"

export type BacklogTaskRowBaseProps = {
    task: TaskResponse
    isSelected: boolean
    onSelect: (id: string) => void
    onClick: () => void
    isPM: boolean
    isMemberOnly: boolean
    isViewer: boolean
    currentUserId: string
    projectId: string
    sprintOptions: SprintDetail[]
    onAssignToSprint: (taskId: string, sprintId: string) => void
    onDeleteTask: (taskId: string) => void
    sortable: boolean
    dragDisabled: boolean
}

function BacklogTaskRowInner({
    task,
    isSelected,
    onSelect,
    onClick,
    isPM,
    isMemberOnly,
    isViewer,
    currentUserId,
    projectId,
    sprintOptions,
    onAssignToSprint,
    onDeleteTask,
    sortable,
    dragDisabled,
    gripRef,
    gripAttributes,
    gripListeners,
}: BacklogTaskRowBaseProps & {
    gripRef?: React.Ref<HTMLButtonElement>
    gripAttributes?: React.HTMLAttributes<HTMLElement>
    gripListeners?: React.HTMLAttributes<HTMLElement>
}) {
    const { t } = useTranslation()
    const [showSprintMenu, setShowSprintMenu] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const canEdit = isPM || (isMemberOnly && !!currentUserId && task.assignee?.id === currentUserId)
    const canDelete = isPM
    const canReorder = !isViewer && !dragDisabled && sortable
    const showAssign = isPM && task.type !== "EPIC"

    const handleCopyLink = (e: React.MouseEvent) => {
        e.stopPropagation()
        const url = `${window.location.origin}/projects/${projectId}/tasks/${task.id}`
        void navigator.clipboard.writeText(url).then(() => toast.success(t("backlog.linkCopied")))
    }

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && onClick()}
                className={cn(
                    "group flex cursor-pointer items-center gap-3 border-b border-[#EBECF0] px-3 py-2.5 transition-colors",
                    isSelected ? "bg-[#E9F2FF]" : "hover:bg-[#F7F8FA]",
                    taskRowOverdueBg(task),
                )}
                onClick={onClick}
            >
                {canReorder && gripRef && (
                    <button
                        type="button"
                        ref={gripRef}
                        className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-gray-300 hover:text-gray-500 active:cursor-grabbing"
                        {...gripAttributes}
                        {...gripListeners}
                        onClick={e => e.stopPropagation()}
                    >
                        <GripVertical size={14} />
                    </button>
                )}
                {isPM && (
                    <div onClick={e => e.stopPropagation()} className="flex items-center">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelect(task.id)}
                            className="h-4 w-4 flex-shrink-0 cursor-pointer rounded border-gray-300 accent-blue-500"
                        />
                    </div>
                )}
                <div className="hidden w-[88px] shrink-0 md:block">
                    <TypeBadgeMini type={task.type} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="shrink-0 font-mono text-[11px] text-gray-400">{task.taskCode}</span>
                        <span
                            className={cn(
                                "truncate text-sm font-semibold",
                                task.taskStatus === "DONE" || task.taskStatus === "CANCELLED"
                                    ? "text-gray-400 line-through"
                                    : "text-gray-800",
                            )}
                        >
                            {task.title}
                        </span>
                        <PriorityDot priority={task.priority} />
                    </div>
                </div>
                <div className="hidden w-24 shrink-0 justify-center md:flex">
                    <span className="text-[10px] font-medium text-gray-600">
                        {t(`project.priority_${task.priority}`, { defaultValue: task.priority })}
                    </span>
                </div>
                <div className="hidden w-14 shrink-0 justify-center lg:flex">
                    {task.storyPoints != null ? (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white ring-2 ring-blue-100">
                            {task.storyPoints}
                        </span>
                    ) : (
                        <span className="text-xs text-gray-300">—</span>
                    )}
                </div>
                <div className="hidden w-20 shrink-0 items-center justify-center gap-2 text-gray-400 xl:flex">
                    <MessageSquare size={12} />
                    <span className="text-[10px] font-medium">{task.commentsCount || 0}</span>
                    <Paperclip size={12} />
                    <span className="text-[10px] font-medium">{task.attachmentsCount || 0}</span>
                </div>
                <div className="w-10 shrink-0">
                    <AssigneeCell task={task} />
                </div>
                <div
                    className="flex w-28 shrink-0 items-center justify-end gap-1"
                    onClick={e => e.stopPropagation()}
                >
                    {showAssign && (
                        <div className="relative opacity-0 transition-opacity group-hover:opacity-100">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={e => {
                                        e.stopPropagation()
                                        setShowSprintMenu(!showSprintMenu)
                                    }}
                                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                                >
                                    <Layers size={11} />
                                    {t("backlog.assignToSprintShort")}
                                </button>
                                {showSprintMenu && (
                                    <AssignSprintDropdown
                                        sprintOptions={sprintOptions}
                                        onAssign={sprintId => {
                                            onAssignToSprint(task.id, sprintId)
                                            setShowSprintMenu(false)
                                        }}
                                        onClose={() => setShowSprintMenu(false)}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    {!isViewer && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                                >
                                    <MoreHorizontal size={15} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5 shadow-xl">
                                {canEdit && (
                                    <DropdownMenuItem
                                        className="cursor-pointer rounded-lg text-sm"
                                        onClick={onClick}
                                    >
                                        <Pencil size={14} className="mr-2" /> {t("backlog.editTask")}
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                    className="cursor-pointer rounded-lg text-sm"
                                    onClick={handleCopyLink}
                                >
                                    <Link2 size={14} className="mr-2" /> {t("backlog.copyLink")}
                                </DropdownMenuItem>
                                {canDelete && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="cursor-pointer rounded-lg text-sm text-rose-600 focus:bg-rose-50 focus:text-rose-600"
                                            onClick={() => setShowDeleteConfirm(true)}
                                        >
                                            <Trash2 size={14} className="mr-2" /> {t("backlog.deleteTask")}
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-sm rounded-2xl bg-white p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            {t("backlog.deleteTaskTitle", { code: task.taskCode })}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="mt-1 text-sm text-gray-500">{t("backlog.deleteTaskHint")}</p>
                    <DialogFooter className="mt-5 flex gap-3 sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold hover:bg-gray-50"
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onDeleteTask(task.id)
                                setShowDeleteConfirm(false)
                            }}
                            className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600"
                        >
                            {t("backlog.delete")}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

/** Viewer / khi tắt reorder — không gọi useSortable */
export function BacklogTaskRow(props: BacklogTaskRowBaseProps) {
    return <BacklogTaskRowInner {...props} />
}

export function SortableBacklogTaskRow(props: BacklogTaskRowBaseProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: props.task.id,
        disabled: !props.sortable || props.dragDisabled,
        data: {
            type: "backlog-task",
            taskId: props.task.id,
            sourceSprintId: null,
        },
    })
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : undefined,
    }

    return (
        <div ref={setNodeRef} style={style}>
            <BacklogTaskRowInner
                {...props}
                gripRef={setActivatorNodeRef}
                gripAttributes={attributes}
                gripListeners={listeners}
            />
        </div>
    )
}
