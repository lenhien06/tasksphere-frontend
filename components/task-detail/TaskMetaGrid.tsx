"use client"

import React, { useState, useEffect } from "react"
import {
    Calendar, AlertTriangle, ChevronDown, Clock, Timer, User, 
    Hash, Flag, PlayCircle, Users, Target, Layers, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { UserAvatar } from "@/components/common/UserAvatar"
import {
    STATUS_CONFIG, PRIORITY_CONFIG, TYPE_CONFIG, formatDate,
} from "@/components/task-detail/config"
import type {
    TaskDetailResponse, TaskStatus, TaskPriority, UserSummary,
} from "@/app/types/task.schema"
import { TaskService } from "@/app/services/TaskService"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAddWorklog } from "@/hooks/useWorklogs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { invalidateTaskCollections, patchTaskCollections } from "@/lib/task-query-sync"

interface TaskMetaGridProps {
    task: TaskDetailResponse
    projectId: string
    canEdit: boolean
    etag?: string
    onBlockedBySubtask?: (pendingSubtasks: any[]) => void
}

// ── Reusable Field Label with Icon ─────────────────────────

function FieldLabel({ icon: Icon, label }: { icon: any; label: string }) {
    return (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 mb-1">
            <Icon size={12} className="text-slate-400" />
            {label}
        </div>
    )
}

// ── Status Field ──────────────────────────────────────────

const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]

function StatusField({ task, projectId, canEdit, etag, onBlockedBySubtask }: { task: TaskDetailResponse; projectId: string; canEdit: boolean; etag?: string; onBlockedBySubtask?: (p: any[]) => void }) {
    const qc = useQueryClient()

    const updateStatus = useMutation({
        mutationFn: ({ status }: { status: TaskStatus }) =>
            TaskService.updateStatus(projectId, task.id, { status }, etag),
        onSuccess: (data, { status }) => {
            const patch: Record<string, unknown> = { taskStatus: status }
            if (data?.columnId) patch.columnId = data.columnId
            patchTaskCollections(qc, projectId, task.id, patch)
            qc.invalidateQueries({ queryKey: ["task", projectId, task.id] })
            qc.invalidateQueries({ queryKey: ["activity", projectId, task.id] })
            invalidateTaskCollections(qc, projectId)
            toast.success("Updated status")
        },
        onError: (err: any) => {
            if (err?.response?.status === 422) {
                const pending = err?.response?.data?.meta?.pendingSubtasks
                if (pending && onBlockedBySubtask) {
                    onBlockedBySubtask(pending)
                } else {
                    toast.error(err?.response?.data?.message ?? "Không thể chuyển trạng thái")
                }
            } else {
                toast.error(err?.response?.data?.message ?? "Error updating status")
            }
        },
    })

    const cfg = STATUS_CONFIG[task.taskStatus] ?? STATUS_CONFIG["TODO"]
    const statusClasses = {
        "TODO": "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
        "IN_PROGRESS": "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100",
        "IN_REVIEW": "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100",
        "DONE": "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100",
        "CANCELLED": "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100",
    }
    const cls = statusClasses[task.taskStatus] || statusClasses["TODO"]

    return (
        <>
            {canEdit ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className={cn("w-fit min-w-[110px] justify-between h-7 px-2.5 text-[11px] font-bold rounded-md border transition-all shadow-sm", cls)}
                            disabled={updateStatus.isPending}
                        >
                            <span className="flex items-center gap-2">
                                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                                {cfg.label}
                            </span>
                            <ChevronDown size={12} className="opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 p-1.5 rounded-lg border-slate-200 shadow-xl">
                        {STATUS_ORDER.map(s => {
                            const c = STATUS_CONFIG[s]
                            const sCls = statusClasses[s] || statusClasses["TODO"]
                            return (
                                <DropdownMenuItem
                                    key={s}
                                    onClick={() => {
                                        if (
                                            s === "DONE" &&
                                            (task.subtaskCount ?? 0) > (task.subtaskDone ?? 0)
                                        ) {
                                            const remaining = (task.subtaskCount ?? 0) - (task.subtaskDone ?? 0)
                                            const confirmed = window.confirm(
                                                `Còn ${remaining} sub-task chưa xong. Vẫn chuyển sang Done?`
                                            )
                                            if (!confirmed) return
                                        }
                                        updateStatus.mutate({ status: s })
                                    }}
                                    className={cn("flex items-center gap-2.5 px-2.5 py-1.5 rounded-md mb-0.5 last:mb-0 cursor-pointer text-[11px] font-semibold transition-colors", sCls)}
                                >
                                    <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
                                    {c.label}
                                </DropdownMenuItem>
                            )
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <div className={cn("w-fit min-w-[110px] flex items-center gap-2 h-7 px-2.5 text-[11px] font-bold rounded-md border shadow-sm", cls)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                    {cfg.label}
                </div>
            )}
        </>
    )
}

// ── Priority Field ─────────────────────────────────────────

const PRIORITY_ORDER: TaskPriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

function PriorityField({
    priority,
    onSave,
    readOnly,
    isSaving = false,
}: {
    priority: TaskPriority
    onSave: (p: TaskPriority) => void
    readOnly: boolean
    isSaving?: boolean
}) {
    const priorityConfig: Record<TaskPriority, { label: string; cls: string; dot: string }> = {
        CRITICAL: { label: "Critical", cls: "bg-red-50 text-red-700 border-red-100 hover:bg-red-100", dot: "bg-red-500" },
        HIGH: { label: "High", cls: "bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100", dot: "bg-orange-500" },
        MEDIUM: { label: "Medium", cls: "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100", dot: "bg-amber-500" },
        LOW: { label: "Low", cls: "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100", dot: "bg-blue-500" },
    }
    const cfg = priorityConfig[priority] || priorityConfig.MEDIUM

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={readOnly || isSaving}>
                <Button
                    variant="ghost"
                    className={cn("w-fit min-w-[100px] justify-between h-7 px-2.5 text-[11px] font-bold rounded-md border transition-all shadow-sm", cfg.cls, readOnly && "cursor-default")}
                >
                    <span className="flex items-center gap-2">
                        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                        {cfg.label}
                    </span>
                    {!readOnly && <ChevronDown size={12} className="opacity-50" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 p-1.5 rounded-lg border-slate-200 shadow-xl">
                {PRIORITY_ORDER.map((p) => {
                    const c = priorityConfig[p]
                    return (
                        <DropdownMenuItem key={p} onClick={() => onSave(p)} className={cn("flex items-center gap-2.5 px-2.5 py-1.5 rounded-md mb-0.5 last:mb-0 cursor-pointer text-[11px] font-semibold transition-colors", c.cls)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
                            {c.label}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// ── Helper Fields ──────────────────────────────────────────

function AssigneeField({ assignee, projectId, onSave, readOnly }: { assignee: UserSummary | null; projectId: string; onSave: (id: string | null) => void; readOnly: boolean }) {
    const { data: members = [] } = useQuery({ queryKey: ["project-members", projectId], queryFn: () => ProjectMemberService.getMembers(projectId), staleTime: 60000 })
    const memberList = (members as any[]).map(m => ({ id: m.user?.id || m.id, fullName: m.user?.fullName || m.fullName || "Unknown", avatarUrl: m.user?.avatarUrl || m.avatarUrl || null }))

    if (readOnly) return <span className="text-[14px] font-semibold text-slate-900">{assignee?.fullName || "Unassigned"}</span>

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 hover:text-blue-600 transition-colors text-[14px] font-semibold text-slate-900 group">
                    <span className="truncate">{assignee?.fullName || "Unassigned"}</span>
                    <ChevronDown size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-lg border-slate-200 shadow-xl">
                <DropdownMenuItem onClick={() => onSave(null)} className="rounded-md text-[11px] font-bold text-slate-400">Unassign</DropdownMenuItem>
                {memberList.map(m => (
                    <DropdownMenuItem key={m.id} onClick={() => onSave(m.id)} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-slate-50">
                        <UserAvatar src={m.avatarUrl ?? undefined} name={m.fullName} size={20} />
                        <span className="text-[12px] font-semibold text-slate-700">{m.fullName}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function InlineNumberField({ value, onSave, readOnly }: { value: number | null; onSave: (v: number | null) => void; readOnly: boolean }) {
    const [editing, setEditing] = useState(false)
    const [raw, setRaw] = useState(value != null ? String(value) : "")
    useEffect(() => setRaw(value != null ? String(value) : ""), [value])
    const handleBlur = () => { setEditing(false); const n = raw === "" ? null : Number(raw); if (!isNaN(n as any) && n !== value) onSave(n) }

    if (readOnly) return <span className="text-[14px] font-bold text-slate-900">{value ?? "—"}</span>
    return editing ? (
        <Input type="number" value={raw} onChange={e => setRaw(e.target.value)} onBlur={handleBlur} onKeyDown={e => { if (e.key === "Enter") handleBlur(); if (e.key === "Escape") setEditing(false) }} className="h-6 w-16 text-xs font-bold px-1.5 py-0.5 rounded border-slate-200" autoFocus />
    ) : (
        <span className="cursor-pointer hover:bg-slate-50 px-1 rounded transition-colors text-[14px] font-bold text-slate-900" onClick={() => setEditing(true)}>{value ?? "—"}</span>
    )
}

function DateField({ value, isOverdue, onSave, readOnly }: { value: string | null; isOverdue: boolean; onSave: (v: string | null) => void; readOnly: boolean }) {
    const [editing, setEditing] = useState(false)
    const [raw, setRaw] = useState(value ? value.slice(0, 10) : "")
    useEffect(() => setRaw(value ? value.slice(0, 10) : ""), [value])
    const handleBlur = () => { setEditing(false); const n = raw || null; if (n !== (value?.slice(0, 10) ?? null)) onSave(n) }

    if (editing) return <Input type="date" value={raw} onChange={e => setRaw(e.target.value)} onBlur={handleBlur} onKeyDown={e => { if (e.key === "Enter") handleBlur(); if (e.key === "Escape") setEditing(false) }} className="h-6 w-32 text-xs font-semibold px-1.5 py-0.5 rounded border-slate-200" autoFocus />
    return (
        <div className={cn("flex items-center gap-1.5 text-[14px] font-semibold transition-colors cursor-pointer group px-1 rounded", isOverdue ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50")} onClick={() => !readOnly && setEditing(true)}>
            {formatDate(value)}
            {isOverdue && <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold border border-rose-200">Overdue</span>}
        </div>
    )
}

// ── Worklog Section ────────────────────────────────────────

function WorklogWidget({ task, projectId, canEdit }: { task: TaskDetailResponse; projectId: string; canEdit: boolean }) {
    const [open, setOpen] = useState(false)
    const [hours, setHours] = useState("0")
    const [minutes, setMinutes] = useState("0")
    const [note, setNote] = useState("")
    const addWorklog = useAddWorklog(projectId, task.id)
    const percent = Math.min(Math.round(((task.actualHours || 0) / (task.estimatedHours || 1)) * 100), 100)

    const handleSubmit = () => {
        const total = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60
        if (total <= 0) return
        addWorklog.mutate({ timeSpent: total, logDate: new Date().toISOString().slice(0, 10), note: note || undefined }, { onSuccess: () => { setOpen(false); setHours("0"); setMinutes("0"); setNote("") } })
    }

    return (
        <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100/80 mt-2">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <Timer size={12} className="text-slate-400" /> Worklog
                </div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{percent}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-2 shadow-inner">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-medium text-slate-500 mb-3">
                <span>Est: <span className="font-bold text-slate-800">{task.estimatedHours ?? 0}h</span></span>
                <span>Act: <span className="font-bold text-slate-800">{task.actualHours ?? 0}h</span></span>
            </div>
            {canEdit && (
                <Button size="sm" variant="ghost" className="w-full h-7 text-[11px] font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700 border border-blue-100" onClick={() => setOpen(true)}>
                    <PlayCircle size={12} className="mr-1.5" /> Log work
                </Button>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-xs p-6 rounded-xl">
                    <DialogHeader><DialogTitle className="text-lg font-bold">Log time</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div className="flex gap-4">
                            <div className="flex-1"><Label className="text-[10px] font-bold mb-1 block">Hours</Label><Input type="number" value={hours} onChange={e => setHours(e.target.value)} className="h-9" /></div>
                            <div className="flex-1"><Label className="text-[10px] font-bold mb-1 block">Minutes</Label><Input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} className="h-9" /></div>
                        </div>
                        <div><Label className="text-[10px] font-bold mb-1 block">Note</Label><Input value={note} onChange={e => setNote(e.target.value)} className="h-9" placeholder="What did you do?" /></div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleSubmit} disabled={addWorklog.isPending}>Save</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ── Main Component ─────────────────────────────────────────

export default function TaskMetaGrid({ task, projectId, canEdit, etag, onBlockedBySubtask }: TaskMetaGridProps) {
    const qc = useQueryClient()
    const updateTask = useMutation({
        mutationFn: (data: any) => TaskService.updateTask(projectId, task.id, { title: task.title, ...data }),
        onSuccess: (_, data) => {
            patchTaskCollections(qc, projectId, task.id, data)
            qc.invalidateQueries({ queryKey: ["task", projectId, task.id] })
            qc.invalidateQueries({ queryKey: ["activity", projectId, task.id] })
            invalidateTaskCollections(qc, projectId)
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Error updating task")
        },
    })

    return (
        <div className="grid grid-cols-2 gap-x-12 gap-y-5 py-4">
            <div className="space-y-5">
                <div className="flex items-start gap-3">
                    <UserAvatar src={task.assignee?.avatarUrl ?? undefined} name={task.assignee?.fullName ?? "U"} size={36} />
                    <div className="flex-1 min-w-0">
                        <FieldLabel icon={User} label="Assignee" />
                        <AssigneeField assignee={task.assignee} projectId={projectId} onSave={id => updateTask.mutate({ assigneeId: id })} readOnly={!canEdit} />
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <UserAvatar src={task.reporter.avatarUrl ?? undefined} name={task.reporter.fullName} size={36} />
                    <div className="flex-1 min-w-0">
                        <FieldLabel icon={Users} label="Reporter" />
                        <span className="text-[14px] font-semibold text-slate-900">{task.reporter.fullName}</span>
                    </div>
                </div>
                <div><FieldLabel icon={Calendar} label="Due Date" /><DateField value={task.dueDate} isOverdue={task.overdue} onSave={d => updateTask.mutate({ dueDate: d })} readOnly={!canEdit} /></div>
                <div><FieldLabel icon={Hash} label="Story Points" /><InlineNumberField value={task.storyPoints} onSave={v => updateTask.mutate({ storyPoints: v })} readOnly={!canEdit} /></div>
            </div>
            <div className="space-y-5">
                <div><FieldLabel icon={Target} label="Status" /><StatusField task={task} projectId={projectId} canEdit={canEdit} etag={etag} onBlockedBySubtask={onBlockedBySubtask} /></div>
                <div><FieldLabel icon={Flag} label="Priority" /><PriorityField priority={task.priority} onSave={p => updateTask.mutate({ priority: p })} readOnly={!canEdit} isSaving={updateTask.isPending} /></div>
                <WorklogWidget task={task} projectId={projectId} canEdit={canEdit} />
            </div>
        </div>
    )
}
