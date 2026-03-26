"use client"

import React, { useState, useRef, useEffect } from "react"
import { TYPE_CONFIG, PRIORITY_CONFIG } from "@/components/task-detail/config"
import type { TaskDetailResponse, TaskType } from "@/app/types/task.schema"
import { TaskService } from "@/app/services/TaskService"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { invalidateTaskCollections, patchTaskCollections } from "@/lib/task-query-sync"

interface TaskHeaderProps {
    task: TaskDetailResponse
    projectId: string
    canEdit: boolean
    etag?: string
}

// ── Inline title edit ─────────────────────────────────────

function InlineTitle({
    taskId,
    projectId,
    title,
    canEdit,
}: {
    taskId: string
    projectId: string
    title: string
    canEdit: boolean
}) {
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(title)
    const inputRef = useRef<HTMLInputElement>(null)
    const qc = useQueryClient()

    useEffect(() => { setValue(title) }, [title])
    useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

    const save = useMutation({
        mutationFn: (newTitle: string) =>
            TaskService.updateTask(projectId, taskId, {
                title: newTitle,
                description: undefined,
            }),
        onSuccess: (_, newTitle) => {
            patchTaskCollections(qc, projectId, taskId, { title: newTitle })
            qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
            invalidateTaskCollections(qc, projectId)
            setEditing(false)
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Unable to update title")
        },
    })

    const handleBlur = () => {
        const trimmed = value.trim()
        if (!trimmed) { setValue(title); setEditing(false); return }
        if (trimmed === title) { setEditing(false); return }
        save.mutate(trimmed)
    }

    if (!canEdit) {
        return <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight break-words">{title}</h1>
    }

    return editing ? (
        <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); handleBlur() }
                if (e.key === "Escape") { setValue(title); setEditing(false) }
            }}
            className="w-full text-2xl md:text-3xl font-black text-slate-900 leading-tight bg-slate-50/50 rounded-xl px-2 border-b-2 border-blue-600 outline-none break-words"
            maxLength={255}
            aria-label="Task title"
        />
    ) : (
        <h1
            className="text-2xl md:text-3xl font-black text-slate-900 leading-tight cursor-pointer hover:text-blue-600 transition-colors break-words"
            onClick={() => setEditing(true)}
            title="Click to edit title"
            tabIndex={0}
            onKeyDown={e => e.key === "Enter" && setEditing(true)}
        >
            {title}
        </h1>
    )
}

// ── Main header (type + priority badge + title) ───────────

export default function TaskHeader({ task, projectId, canEdit }: TaskHeaderProps) {
    const priorityConfig: Record<string, any> = {
        critical: { label: "Critical",  cls: "bg-red-50 text-red-700 border-red-100" },
        high:     { label: "High",       cls: "bg-orange-50 text-orange-700 border-orange-100" },
        medium:   { label: "Medium",     cls: "bg-amber-50 text-amber-700 border-amber-100" },
        low:      { label: "Low",        cls: "bg-blue-50 text-blue-700 border-blue-100" },
    }
    const typeConfig: Record<string, any> = {
        bug:      { label: "Bug",       cls: "bg-rose-50 text-rose-700 border-rose-100" },
        feature:  { label: "Feature",   cls: "bg-indigo-50 text-indigo-700 border-indigo-100" },
        task:     { label: "Task",      cls: "bg-slate-100 text-slate-700 border-slate-200" },
        story:    { label: "Story",     cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
        epic:     { label: "Epic",      cls: "bg-violet-50 text-violet-700 border-violet-100" },
        sub_task: { label: "Sub-task",  cls: "bg-slate-50 text-slate-600 border-slate-100" },
    }

    const tCfg = typeConfig[task.type.toLowerCase()] || typeConfig.task
    const pCfg = priorityConfig[task.priority.toLowerCase()] || priorityConfig.medium

    return (
        <div className="space-y-4">
            {/* Type + Priority badges */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-black border uppercase tracking-wider", tCfg.cls)}>
                    {tCfg.label}
                </span>
                <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-black border uppercase tracking-wider", pCfg.cls)}>
                    {pCfg.label}
                </span>
            </div>

            {/* Title */}
            <InlineTitle
                taskId={task.id}
                projectId={projectId}
                title={task.title}
                canEdit={canEdit}
            />
        </div>
    )
}
