"use client"

import React, { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserAvatar } from "@/components/common/UserAvatar"
import { useWorklogs, useAddWorklog, useUpdateWorklog, useDeleteWorklog } from "@/hooks/useWorklogs"
import { formatDuration, timeAgo } from "@/components/task-detail/config"
import type { WorklogResponse } from "@/app/types/task.schema"
import { useAuthStore } from "@/stores/useAuthStore"
import { cn } from "@/lib/utils"

interface WorklogTabProps {
    projectId: string
    taskId: string
    currentUserRole?: "PM" | "MEMBER" | "VIEWER"
}

// ── Add/Edit form ─────────────────────────────────────────

interface WorklogFormProps {
    taskId: string
    projectId: string
    initial?: { timeSpent: number; logDate: string; note?: string }
    worklogId?: string
    onDone: () => void
}

function WorklogForm({ taskId, projectId, initial, worklogId, onDone }: WorklogFormProps) {
    const initH = initial ? Math.floor(initial.timeSpent / 3600) : 0
    const initM = initial ? Math.floor((initial.timeSpent % 3600) / 60) : 0
    const [hours, setHours] = useState(String(initH))
    const [minutes, setMinutes] = useState(String(initM))
    const [logDate, setLogDate] = useState(initial?.logDate ?? new Date().toISOString().slice(0, 10))
    const [note, setNote] = useState(initial?.note ?? "")

    const addWorklog = useAddWorklog(projectId, taskId)
    const updateWorklog = useUpdateWorklog(taskId)

    const today = new Date().toISOString().slice(0, 10)

    const handleSubmit = () => {
        const h = parseInt(hours) || 0
        const m = parseInt(minutes) || 0
        const timeSpent = h * 3600 + m * 60
        if (timeSpent <= 0) return
        if (logDate > today) return

        const data = { timeSpent, logDate, note: note || undefined }
        if (worklogId) {
            updateWorklog.mutate({ worklogId, data }, { onSuccess: onDone })
        } else {
            addWorklog.mutate(data, { onSuccess: onDone })
        }
    }

    const isPending = addWorklog.isPending || updateWorklog.isPending
    const totalSec = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60

    return (
        <div className="border rounded-lg p-4 space-y-3 bg-card">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label className="text-xs">Time spent</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number" min={0} max={24}
                            value={hours}
                            onChange={e => setHours(e.target.value)}
                            className="h-8 text-sm w-20"
                            placeholder="0"
                            aria-label="Hours"
                        />
                        <span className="text-sm text-muted-foreground shrink-0">h</span>
                        <Input
                            type="number" min={0} max={59}
                            value={minutes}
                            onChange={e => setMinutes(e.target.value)}
                            className="h-8 text-sm w-20"
                            placeholder="0"
                            aria-label="Minutes"
                        />
                        <span className="text-sm text-muted-foreground shrink-0">m</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input
                        type="date"
                        value={logDate}
                        max={today}
                        onChange={e => setLogDate(e.target.value)}
                        className="h-8 text-sm"
                        aria-label="Log date"
                    />
                </div>
            </div>
            <div className="space-y-1">
                <Label className="text-xs">Description (optional)</Label>
                <Input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Work description..."
                    className="h-8 text-sm"
                    maxLength={500}
                />
            </div>
            <div className="flex items-center justify-between">
                {totalSec > 0 && (
                    <span className="text-xs text-muted-foreground">= {formatDuration(totalSec)}</span>
                )}
                <div className="flex gap-2 ml-auto">
                    <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={isPending || totalSec <= 0 || logDate > today}
                    >
                        Log
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ── Worklog item ──────────────────────────────────────────

interface WorklogItemProps {
    log: WorklogResponse
    currentUserId: string
    taskId: string
    projectId: string
    canManageLog: boolean
}

function WorklogItem({ log, currentUserId, taskId, projectId, canManageLog }: WorklogItemProps) {
    const [editing, setEditing] = useState(false)
    const deleteWorklog = useDeleteWorklog(taskId)
    const isOwn = log.user.id === currentUserId
    const canEditLog = isOwn || canManageLog

    if (editing) {
        return (
            <WorklogForm
                taskId={taskId}
                projectId={projectId}
                worklogId={log.id}
                initial={{ timeSpent: log.timeSpent, logDate: log.logDate, note: log.note ?? undefined }}
                onDone={() => setEditing(false)}
            />
        )
    }

    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">
                        {log.timeSpentFormatted || formatDuration(log.timeSpent)}
                    </span>
                    <span className="text-xs text-gray-400">
                        {new Date(log.logDate).toLocaleDateString("vi-VN")}
                    </span>
                </div>
                {log.note && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{log.note}</p>
                )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <div className="inline-flex items-center gap-1">
                    <UserAvatar src={log.user.avatarUrl ?? undefined} name={log.user.fullName} size={18} />
                    <span className="text-xs text-gray-400">{log.user.fullName}</span>
                </div>
                {canEditLog && (
                    <>
                        <button onClick={() => setEditing(true)} className="text-xs text-blue-500 hover:underline ml-2">
                            Sửa
                        </button>
                        <button onClick={() => deleteWorklog.mutate(log.id)} className="text-xs text-red-500 hover:underline ml-1">
                            Xóa
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

// ── Main tab ─────────────────────────────────────────────

export default function WorklogTab({ projectId, taskId, currentUserRole }: WorklogTabProps) {
    const { data, isLoading } = useWorklogs(taskId)
    const { user } = useAuthStore()
    const currentUserId = user?.id?.toString() ?? ""
    const [showForm, setShowForm] = useState(false)
    const canManageLog = currentUserRole === "PM"

    if (isLoading) {
        return <div className="space-y-3 animate-pulse">
            {[1, 2].map(i => (
                <div key={i} className="flex gap-3 p-3">
                    <div className="w-8 h-8 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted rounded w-32" />
                        <div className="h-3 bg-muted rounded w-20" />
                    </div>
                </div>
            ))}
        </div>
    }

    const logs = data?.logs ?? []
    const total = data?.totalSeconds ?? 0

    return (
        <div className="space-y-4">
            {/* Total */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Total time: <span className="font-semibold text-foreground">{formatDuration(total)}</span>
                </div>
                {!showForm && (
                    <Button size="sm" variant="outline" onClick={() => setShowForm(true)} aria-label="Log time">
                        <Plus size={13} className="mr-1" /> Log time
                    </Button>
                )}
            </div>

            {showForm && (
                <WorklogForm projectId={projectId} taskId={taskId} onDone={() => setShowForm(false)} />
            )}

            {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No worklogs yet.</p>
            ) : (
                <div className="space-y-1">
                    {logs.map(log => (
                        <WorklogItem
                            key={log.id}
                            log={log}
                            currentUserId={currentUserId}
                            taskId={taskId}
                            projectId={projectId}
                            canManageLog={canManageLog}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
