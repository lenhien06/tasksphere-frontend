"use client"

import React, { useState, useEffect } from "react"
import {
    Calendar, AlertTriangle, ChevronDown, Clock, Timer, User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UserAvatar } from "@/components/common/UserAvatar"
import {
    STATUS_CONFIG, PRIORITY_CONFIG, TYPE_CONFIG, formatDate, formatDuration,
} from "@/components/task-detail/config"
import type {
    TaskDetailResponse, TaskStatus, TaskPriority, TaskType, UserSummary,
} from "@/app/types/task.schema"
import { TaskService } from "@/app/services/TaskService"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAddWorklog } from "@/hooks/useWorklogs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface TaskMetaGridProps {
    task: TaskDetailResponse
    projectId: string
    canEdit: boolean
    etag?: string
}

// ── Reusable meta row ──────────────────────────────────────

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 min-h-[40px]">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 w-28 shrink-0">
                {label}
            </p>
            <div className="text-[14px] font-bold text-slate-700 flex-1 min-w-0">{children}</div>
        </div>
    )
}

// ── Status badge + dropdown ────────────────────────────────

const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]

function getAllowedNextStatuses(current: TaskStatus): TaskStatus[] {
    switch (current) {
        case "TODO":        return ["IN_PROGRESS"]
        case "IN_PROGRESS": return ["IN_REVIEW", "DONE", "CANCELLED"]
        case "IN_REVIEW":   return ["DONE", "IN_PROGRESS", "CANCELLED"]
        case "DONE":        return []
        case "CANCELLED":   return []
        default:            return []
    }
}

function StatusField({
    task,
    projectId,
    canEdit,
    etag,
}: {
    task: TaskDetailResponse
    projectId: string
    canEdit: boolean
    etag?: string
}) {
    const qc = useQueryClient()
    const [blockedSubtasks, setBlockedSubtasks] = useState<string[]>([])
    const [showBlockedModal, setShowBlockedModal] = useState(false)

    const updateStatus = useMutation({
        mutationFn: ({ status }: { status: TaskStatus }) =>
            TaskService.updateStatus(
                projectId,
                task.id,
                { status, statusColumnId: task.columnId },
                etag,
            ),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["task", projectId, task.id] })
            qc.invalidateQueries({ queryKey: ["tasks", projectId] })
            toast.success("Status updated")
        },
        onError: (err: any) => {
            const status = err?.response?.status
            if (status === 422) {
                const detail = err?.response?.data
                const blocked = detail?.data?.blockedSubtasks as string[] | undefined
                if (blocked?.length) {
                    setBlockedSubtasks(blocked)
                    setShowBlockedModal(true)
                } else {
                    toast.error(detail?.message ?? "Unable to change status")
                }
            } else if (status === 403) {
                toast.error("You do not have permission to change status")
            } else {
                toast.error(err?.response?.data?.message ?? "Error updating status")
            }
        },
    })

    const allowed = getAllowedNextStatuses(task.taskStatus)
    const cfg = STATUS_CONFIG[task.taskStatus] ?? STATUS_CONFIG["TODO"]

    const statusClasses = {
        "TODO":        "bg-slate-100 text-slate-700 border-slate-200",
        "IN_PROGRESS": "bg-blue-50 text-blue-700 border-blue-100",
        "IN_REVIEW":   "bg-amber-50 text-amber-700 border-amber-100",
        "DONE":        "bg-emerald-50 text-emerald-700 border-emerald-100",
        "CANCELLED":   "bg-rose-50 text-rose-700 border-rose-100",
    }
    const cls = statusClasses[task.taskStatus] || statusClasses["TODO"]

    return (
        <>
            {canEdit && allowed.length > 0 ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className={cn("w-full justify-between h-11 px-4 text-[13px] font-black uppercase tracking-wider rounded-xl border transition-all active:scale-[0.98]", cls)}
                            disabled={updateStatus.isPending}
                            aria-label={`Status: ${cfg.label}`}
                        >
                            <span className="flex items-center gap-2">
                                <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                                {cfg.label}
                            </span>
                            <ChevronDown size={14} className="opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-slate-200 shadow-xl">
                        {allowed.map(s => {
                            const c = STATUS_CONFIG[s]
                            const sCls = statusClasses[s] || statusClasses["TODO"]
                            return (
                                <DropdownMenuItem
                                    key={s}
                                    onClick={() => updateStatus.mutate({ status: s })}
                                    className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 last:mb-0 cursor-pointer transition-colors text-[13px] font-black uppercase tracking-wider", sCls)}
                                >
                                    <span className={cn("w-2 h-2 rounded-full", c.dot)} />
                                    {c.label}
                                </DropdownMenuItem>
                            )
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <div className={cn("w-full flex items-center gap-2 h-11 px-4 text-[13px] font-black uppercase tracking-wider rounded-xl border", cls)}>
                    <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                    {cfg.label}
                </div>
            )}

            <Dialog open={showBlockedModal} onOpenChange={setShowBlockedModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle size={18} /> Incomplete Sub-tasks
                        </DialogTitle>
                        <DialogDescription>
                            All sub-tasks must be completed before marking this task as DONE.
                        </DialogDescription>
                    </DialogHeader>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        {blockedSubtasks.map((name, i) => <li key={i}>{name}</li>)}
                    </ul>
                    <div className="flex justify-end">
                        <Button size="sm" onClick={() => setShowBlockedModal(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ── Inline number edit ─────────────────────────────────────

function InlineNumberField({
    value,
    onSave,
    readOnly,
    placeholder = "—",
}: {
    value: number | null
    onSave: (v: number | null) => void
    readOnly: boolean
    placeholder?: string
}) {
    const [editing, setEditing] = useState(false)
    const [raw, setRaw] = useState(value != null ? String(value) : "")

    useEffect(() => { setRaw(value != null ? String(value) : "") }, [value])

    const handleBlur = () => {
        setEditing(false)
        const n = raw === "" ? null : Number(raw)
        if (isNaN(n as number)) { setRaw(value != null ? String(value) : ""); return }
        if (n !== value) onSave(n)
    }

    if (readOnly) return <span>{value ?? <span className="text-muted-foreground">{placeholder}</span>}</span>

    return editing ? (
        <Input
            type="number"
            value={raw}
            onChange={e => setRaw(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={e => {
                if (e.key === "Enter") handleBlur()
                if (e.key === "Escape") { setRaw(value != null ? String(value) : ""); setEditing(false) }
            }}
            className="h-7 w-24 text-sm"
            autoFocus
            min={0}
        />
    ) : (
        <span
            className="cursor-pointer hover:text-primary"
            onClick={() => setEditing(true)}
            title="Click to edit"
            tabIndex={0}
            onKeyDown={e => e.key === "Enter" && setEditing(true)}
        >
            {value ?? <span className="text-muted-foreground">{placeholder}</span>}
        </span>
    )
}

// ── Due date field ─────────────────────────────────────────

function DateField({
    value,
    isOverdue,
    onSave,
    readOnly,
}: {
    value: string | null
    isOverdue: boolean
    onSave: (v: string | null) => void
    readOnly: boolean
}) {
    const [editing, setEditing] = useState(false)
    const [raw, setRaw] = useState(value ? value.slice(0, 10) : "")

    useEffect(() => { setRaw(value ? value.slice(0, 10) : "") }, [value])

    const handleBlur = () => {
        setEditing(false)
        const newDate = raw || null
        if (newDate !== (value ? value.slice(0, 10) : null)) onSave(newDate)
    }

    if (readOnly) {
        return (
            <span className={cn("flex items-center gap-2 font-black", isOverdue ? "text-rose-600" : "text-slate-700")}>
                {isOverdue && <AlertTriangle size={14} className="text-rose-500" />}
                <Calendar size={14} className="text-slate-400" />
                {formatDate(value)}
                {isOverdue && <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-lg border border-rose-200 uppercase tracking-wider ml-1">OVERDUE</span>}
            </span>
        )
    }

    return editing ? (
        <Input
            type="date"
            value={raw}
            onChange={e => setRaw(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={e => {
                if (e.key === "Enter") handleBlur()
                if (e.key === "Escape") { setRaw(value ? value.slice(0, 10) : ""); setEditing(false) }
            }}
            className="h-10 w-full bg-slate-50/50 border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
            autoFocus
            aria-label="Due date"
        />
    ) : (
        <button
            className={cn(
                "flex items-center gap-2 hover:text-blue-600 text-sm font-black transition-colors group",
                isOverdue ? "text-rose-600" : "text-slate-700"
            )}
            onClick={() => setEditing(true)}
            title="Click to edit due date"
        >
            {isOverdue && <AlertTriangle size={14} className="text-rose-500" />}
            <Calendar size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
            {value ? formatDate(value) : <span className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">Not set</span>}
            {isOverdue && <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-lg border border-rose-200 uppercase tracking-wider ml-1">OVERDUE</span>}
        </button>
    )
}

// ── Assignee selector ──────────────────────────────────────

function AssigneeField({
    assignee,
    projectId,
    onSave,
    readOnly,
}: {
    assignee: UserSummary | null
    projectId: string
    onSave: (id: string | null) => void
    readOnly: boolean
}) {
    const { data: members = [] } = useQuery({
        queryKey: ["project-members", projectId],
        queryFn: () => ProjectMemberService.getMembers(projectId),
        staleTime: 60_000,
    })

    const memberList = (members as any[]).map((m: any) => ({
        id: m.user?.id || m.id,
        fullName: m.user?.fullName || m.fullName || "Unknown",
        avatarUrl: m.user?.avatarUrl || m.avatarUrl || null,
    }))

    if (readOnly) {
        return assignee ? (
            <div className="flex items-center gap-2.5">
                <UserAvatar src={assignee.avatarUrl ?? undefined} name={assignee.fullName} size={26} />
                <span className="truncate font-black text-slate-700">{assignee.fullName}</span>
            </div>
        ) : <span className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">Unassigned</span>
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 hover:text-blue-600 transition-colors text-sm w-full group" aria-label="Select assignee">
                    {assignee ? (
                        <>
                            <UserAvatar src={assignee.avatarUrl ?? undefined} name={assignee.fullName} size={26} />
                            <span className="flex-1 text-left truncate font-black text-slate-700 group-hover:text-blue-600 transition-colors">{assignee.fullName}</span>
                        </>
                    ) : (
                        <div className="flex items-center gap-2.5">
                           <div className="w-[26px] h-[26px] rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User size={14} /></div>
                           <span className="text-slate-400 font-bold uppercase tracking-widest text-[11px] flex-1 text-left">Unassigned</span>
                        </div>
                    )}
                    <ChevronDown size={14} className="text-slate-300 shrink-0 group-hover:text-blue-400 transition-colors" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-2 rounded-xl border-slate-200 shadow-xl">
                <DropdownMenuItem onClick={() => onSave(null)} className="rounded-lg mb-1">
                    <span className="text-slate-400 font-black uppercase tracking-widest text-[11px]">Unassign</span>
                </DropdownMenuItem>
                {memberList.map(m => (
                    <DropdownMenuItem key={m.id} onClick={() => onSave(m.id)} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50">
                        <UserAvatar src={m.avatarUrl ?? undefined} name={m.fullName} size={24} />
                        <span className="text-[13px] font-bold text-slate-700">{m.fullName}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// ── Priority selector ──────────────────────────────────────

function PriorityField({
    priority,
    onSave,
    readOnly,
}: {
    priority: TaskPriority
    onSave: (p: TaskPriority) => void
    readOnly: boolean
}) {
    const priorityConfig: Record<string, any> = {
        critical: { label: "Critical",  cls: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-500" },
        high:     { label: "High",       cls: "bg-orange-50 text-orange-700 border-orange-100", dot: "bg-orange-500" },
        medium:   { label: "Medium",     cls: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" },
        low:      { label: "Low",        cls: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
    }
    const cfg = priorityConfig[priority.toLowerCase()] || priorityConfig.medium

    if (readOnly) {
        return (
            <span className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-lg font-black border uppercase tracking-wider text-[10px]", cfg.cls)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                {cfg.label}
            </span>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={cn("inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg font-black border uppercase tracking-wider text-[11px] transition-all active:scale-[0.98] w-fit min-w-[120px]", cfg.cls)} aria-label="Select priority">
                    <span className="flex items-center gap-2">
                        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                        {cfg.label}
                    </span>
                    <ChevronDown size={12} className="opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 p-2 rounded-xl border-slate-200 shadow-xl">
                {(Object.keys(priorityConfig)).map(p => {
                    const c = priorityConfig[p]
                    return (
                        <DropdownMenuItem key={p} onClick={() => onSave(p as TaskPriority)} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg mb-1 last:mb-0 cursor-pointer transition-colors text-[11px] font-black uppercase tracking-wider", c.cls)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
                            {c.label}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// ── Sprint selector ────────────────────────────────────────

function SprintField({
    task,
    projectId,
    onSave,
    readOnly,
}: {
    task: TaskDetailResponse
    projectId: string
    onSave: (sprintId: string | null) => void
    readOnly: boolean
}) {
    const { data: sprints = [] } = useQuery({
        queryKey: ["sprints", projectId],
        queryFn: () => TaskService.getSprints(projectId),
        staleTime: 60_000,
    })

    const activeSprints = (sprints as any[]).filter((s: any) =>
        s.status === "PLANNED" || s.status === "ACTIVE"
    )

    const currentName = task.sprint?.name ?? "Backlog"

    if (readOnly) return <span>{currentName}</span>

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 hover:text-primary text-sm w-full" aria-label="Select sprint">
                    <span className="flex-1 text-left">{currentName}</span>
                    <ChevronDown size={12} className="text-muted-foreground shrink-0" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => onSave(null)}>
                    <span className="text-muted-foreground text-sm">Backlog</span>
                </DropdownMenuItem>
                {activeSprints.map((s: any) => (
                    <DropdownMenuItem key={s.id} onClick={() => onSave(s.id)} className="text-sm">
                        {s.name} <span className="ml-1 text-xs text-muted-foreground">({s.status})</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// ── Version selector ───────────────────────────────────────

function VersionField({
    task,
    projectId,
    onSave,
    readOnly,
}: {
    task: TaskDetailResponse
    projectId: string
    onSave: (versionId: string | null) => void
    readOnly: boolean
}) {
    const { data: versions = [] } = useQuery({
        queryKey: ["versions", projectId],
        queryFn: () => TaskService.getVersions(projectId),
        staleTime: 60_000,
    })

    const currentName = task.versionInfo?.name ?? "—"

    if (readOnly) return <span>{currentName}</span>

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 hover:text-primary text-sm w-full" aria-label="Select version">
                    <span className="flex-1 text-left">{currentName}</span>
                    <ChevronDown size={12} className="text-muted-foreground shrink-0" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => onSave(null)}>
                    <span className="text-muted-foreground text-sm">Unassigned</span>
                </DropdownMenuItem>
                {(versions as any[]).map((v: any) => (
                    <DropdownMenuItem key={v.id} onClick={() => onSave(v.id)} className="text-sm">
                        {v.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// ── Worklog Dialog ─────────────────────────────────────────

function WorklogDialog({
    projectId,
    taskId,
}: {
    projectId: string
    taskId: string
}) {
    const [open, setOpen] = useState(false)
    const [hours, setHours] = useState("0")
    const [minutes, setMinutes] = useState("0")
    const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10))
    const [note, setNote] = useState("")
    const addWorklog = useAddWorklog(projectId, taskId)
    const today = new Date().toISOString().slice(0, 10)

    const totalSec = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60

    const handleSubmit = () => {
        if (totalSec <= 0 || logDate > today) return
        addWorklog.mutate(
            { timeSpent: totalSec, logDate, note: note || undefined },
            {
                onSuccess: () => {
                    setOpen(false)
                    setHours("0")
                    setMinutes("0")
                    setNote("")
                    setLogDate(new Date().toISOString().slice(0, 10))
                },
            }
        )
    }

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                className="w-full text-[13px] font-black uppercase tracking-widest h-10 gap-2 border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all active:scale-[0.98] shadow-sm shadow-slate-200/50"
                onClick={() => setOpen(true)}
            >
                <Timer size={15} className="text-blue-500" />
                Log Worklog
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-sm rounded-[24px] border-slate-200 p-8">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl font-black text-slate-900 tracking-tight">
                            <div className="p-2 bg-blue-50 rounded-xl"><Clock size={20} className="text-blue-600" /></div>
                            Log Work Time
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Record actual hours worked on this task.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Time</Label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 flex items-center gap-2">
                                    <Input
                                        type="number" min={0} max={24}
                                        value={hours}
                                        onChange={e => setHours(e.target.value)}
                                        className="h-11 bg-slate-50/50 border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                        placeholder="0"
                                        aria-label="Hours"
                                    />
                                    <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest">h</span>
                                </div>
                                <div className="flex-1 flex items-center gap-2">
                                    <Input
                                        type="number" min={0} max={59}
                                        value={minutes}
                                        onChange={e => setMinutes(e.target.value)}
                                        className="h-11 bg-slate-50/50 border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                        placeholder="0"
                                        aria-label="Minutes"
                                    />
                                    <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest">m</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Work Date</Label>
                            <Input
                                type="date"
                                value={logDate}
                                max={today}
                                onChange={e => setLogDate(e.target.value)}
                                className="h-11 bg-slate-50/50 border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                aria-label="Log date"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Description (optional)</Label>
                            <Input
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Describe the work done..."
                                className="h-11 bg-slate-50/50 border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                maxLength={500}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <Button variant="ghost" className="h-11 px-6 rounded-xl font-bold text-slate-500 hover:bg-slate-50" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button
                            className="h-11 px-8 bg-[#111827] text-white rounded-xl font-extrabold uppercase tracking-wide shadow-lg active:scale-[0.98]"
                            onClick={handleSubmit}
                            disabled={addWorklog.isPending || totalSec <= 0 || logDate > today}
                        >
                            {addWorklog.isPending ? "Saving..." : "Log Time"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ── Main sidebar ───────────────────────────────────────────

export default function TaskMetaGrid({ task, projectId, canEdit, etag }: TaskMetaGridProps) {
    const qc = useQueryClient()

    const updateTask = useMutation({
        mutationFn: (data: Partial<Parameters<typeof TaskService.updateTask>[2]>) =>
            TaskService.updateTask(projectId, task.id, {
                title: task.title,
                ...data,
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["task", projectId, task.id] })
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Unable to update task")
        },
    })

    const assignToSprint = useMutation({
        mutationFn: (sprintId: string | null) => TaskService.assignTaskToSprint(task.id, sprintId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["task", projectId, task.id] }),
        onError: (err: any) => toast.error(err?.response?.data?.message ?? "Unable to assign sprint"),
    })

    const assignToVersion = useMutation({
        mutationFn: (versionId: string | null) => TaskService.assignTaskToVersion(task.id, versionId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["task", projectId, task.id] }),
        onError: (err: any) => toast.error(err?.response?.data?.message ?? "Unable to assign version"),
    })

    // Worklog progress
    const estimatedH = task.estimatedHours ?? 0
    const actualH = task.actualHours ?? 0
    const worklogPercent = estimatedH > 0 ? Math.min(Math.round((actualH / estimatedH) * 100), 100) : 0

    return (
        <div className="space-y-4">
            {/* ── Status ── */}
            <StatusField task={task} projectId={projectId} canEdit={canEdit} etag={etag} />

            <Separator />

            {/* ── People ── */}
            <div className="space-y-3">
                <MetaRow label="Assignee">
                    <AssigneeField
                        assignee={task.assignee}
                        projectId={projectId}
                        onSave={id => updateTask.mutate({ assigneeId: id })}
                        readOnly={!canEdit}
                    />
                </MetaRow>

                <MetaRow label="Reporter">
                    <div className="flex items-center gap-2">
                        <UserAvatar
                            src={task.reporter.avatarUrl ?? undefined}
                            name={task.reporter.fullName}
                            size={20}
                        />
                        <span className="truncate">{task.reporter.fullName}</span>
                    </div>
                </MetaRow>
            </div>

            <Separator />

            {/* ── Planning ── */}
            <div className="space-y-3">
                <MetaRow label="Priority">
                    <PriorityField
                        priority={task.priority}
                        onSave={p => updateTask.mutate({ priority: p })}
                        readOnly={!canEdit}
                    />
                </MetaRow>

                <MetaRow label="Sprint">
                    <SprintField
                        task={task}
                        projectId={projectId}
                        onSave={id => assignToSprint.mutate(id)}
                        readOnly={!canEdit}
                    />
                </MetaRow>

                <MetaRow label="Story Pts">
                    <InlineNumberField
                        value={task.storyPoints}
                        onSave={v => updateTask.mutate({ storyPoints: v })}
                        readOnly={!canEdit}
                        placeholder="Not set"
                    />
                </MetaRow>

                <MetaRow label="Version">
                    <VersionField
                        task={task}
                        projectId={projectId}
                        onSave={id => assignToVersion.mutate(id)}
                        readOnly={!canEdit}
                    />
                </MetaRow>
            </div>

            <Separator />

            {/* ── Dates ── */}
            <div className="space-y-3">
                <MetaRow label="Due Date">
                    <DateField
                        value={task.dueDate}
                        isOverdue={task.overdue}
                        onSave={date => updateTask.mutate({ dueDate: date })}
                        readOnly={!canEdit}
                    />
                </MetaRow>

                <MetaRow label="Created">
                    <span className="text-muted-foreground">{formatDate(task.createdAt)}</span>
                </MetaRow>

                <MetaRow label="Updated">
                    <span className="text-muted-foreground">{formatDate(task.updatedAt)}</span>
                </MetaRow>
            </div>

            <Separator />

            {/* ── Worklog ── */}
            <div className="space-y-4 pt-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Worklog
                </p>

                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Estimated: <span className="text-slate-900">{estimatedH}h</span></span>
                    <span>Actual: <span className="text-slate-900">{actualH}h</span></span>
                </div>

                {estimatedH > 0 && (
                    <div className="space-y-2">
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div 
                                className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                                style={{ width: `${worklogPercent}%` }}
                            />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 text-right uppercase tracking-wider">{worklogPercent}% completed</p>
                    </div>
                )}

                {canEdit && <WorklogDialog projectId={projectId} taskId={task.id} />}
            </div>

            {/* ── Custom Fields ── */}
            {task.customFieldValues && task.customFieldValues.length > 0 && (
                <>
                    <Separator className="bg-slate-100" />
                    <div className="space-y-4 pt-2">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                            Custom Fields
                        </p>
                        {task.customFieldValues.map(cf => (
                            <MetaRow key={cf.fieldDefinitionId} label={cf.fieldName}>
                                <span className="font-bold text-slate-700">{cf.value ?? "—"}</span>
                            </MetaRow>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
