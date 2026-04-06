"use client"

import React, { useState } from "react"
import {
    ArrowLeftToLine,
    GripVertical,
    Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { TaskResponse } from "@/app/types/task.schema"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import {
    AssigneeCell,
    PriorityDot,
    TaskStatusBadge,
    TypeBadgeMini,
    taskRowOverdueBg,
} from "./backlog-row-shared"

function SprintTaskRowInner({
    task,
    onRowClick,
    readOnly,
    canMoveToBacklog,
    onMoveToBacklog,
    draggable = false,
    dragAttributes,
    dragListeners,
    setDragHandleRef,
}: {
    task: TaskResponse
    onRowClick: () => void
    readOnly: boolean
    canMoveToBacklog: boolean
    onMoveToBacklog?: () => void
    draggable?: boolean
    dragAttributes?: React.HTMLAttributes<HTMLElement>
    dragListeners?: React.HTMLAttributes<HTMLElement>
    setDragHandleRef?: (element: HTMLButtonElement | null) => void
}) {
    const [pending, setPending] = useState(false)

    const overdueCls = taskRowOverdueBg(task)

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onRowClick}
            onKeyDown={e => e.key === "Enter" && onRowClick()}
            className={cn(
                "group flex cursor-pointer items-center gap-3 border-b border-[#EBECF0] px-3 py-2.5 text-left transition-colors hover:bg-[#F7F8FA]",
                overdueCls,
            )}
        >
            {draggable && setDragHandleRef && (
                <button
                    type="button"
                    ref={setDragHandleRef}
                    className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-gray-300 opacity-0 transition-opacity hover:text-gray-500 active:cursor-grabbing group-hover:opacity-100"
                    {...dragAttributes}
                    {...dragListeners}
                    onClick={e => e.stopPropagation()}
                >
                    <GripVertical size={14} />
                </button>
            )}
            <div className="hidden w-[88px] shrink-0 sm:block">
                <TypeBadgeMini type={task.type} />
            </div>
            <span className="w-20 shrink-0 font-mono text-[11px] text-gray-500">{task.taskCode}</span>
            <div className="min-w-0 flex-1">
                <span
                    className={cn(
                        "line-clamp-1 text-sm font-semibold",
                        task.taskStatus === "DONE" || task.taskStatus === "CANCELLED"
                            ? "text-gray-400 line-through"
                            : "text-gray-800",
                    )}
                >
                    {task.title}
                </span>
            </div>
            <div className="flex w-24 shrink-0 items-center justify-center gap-1.5">
                <PriorityDot priority={task.priority} />
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
            <div className="w-20 shrink-0">
                <TaskStatusBadge status={task.taskStatus} />
            </div>
            <div className="w-10 shrink-0">
                <AssigneeCell task={task} />
            </div>
            {canMoveToBacklog && !readOnly && onMoveToBacklog && (
                <button
                    type="button"
                    title="Chuyển về Backlog"
                    disabled={pending}
                    onClick={e => {
                        e.stopPropagation()
                        setPending(true)
                        Promise.resolve(onMoveToBacklog()).finally(() => setPending(false))
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                >
                    {pending ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftToLine size={16} />}
                </button>
            )}
        </div>
    )
}

export function SprintTaskRow(props: {
    task: TaskResponse
    onRowClick: () => void
    readOnly: boolean
    canMoveToBacklog: boolean
    onMoveToBacklog?: () => void
}) {
    return <SprintTaskRowInner {...props} />
}

export function DraggableSprintTaskRow(props: {
    task: TaskResponse
    onRowClick: () => void
    readOnly: boolean
    canMoveToBacklog: boolean
    onMoveToBacklog?: () => void
    sourceSprintId: string
    dragDisabled?: boolean
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
        id: props.task.id,
        disabled: props.dragDisabled,
        data: {
            type: "sprint-task",
            taskId: props.task.id,
            sourceSprintId: props.sourceSprintId,
        },
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.55 : undefined,
    }

    return (
        <div ref={setNodeRef} style={style}>
            <SprintTaskRowInner
                {...props}
                draggable={!props.dragDisabled}
                dragAttributes={attributes}
                dragListeners={listeners}
                setDragHandleRef={setActivatorNodeRef}
            />
        </div>
    )
}
