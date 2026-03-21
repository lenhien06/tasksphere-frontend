"use client"

import React, { useState } from "react"
import { Plus, X, Search, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { STATUS_CONFIG } from "@/components/task-detail/config"
import { TaskService } from "@/app/services/TaskService"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { TaskDependenciesResponse, DependencyItem, TaskStatus } from "@/app/types/task.schema"
import { cn } from "@/lib/utils"
import { apiJava } from "@/lib/axios"

interface DependencySectionProps {
    taskId: string
    projectId: string
    canEdit: boolean
}

const ALL_LINK_GROUPS = [
    "BLOCKS",
    "BLOCKED_BY",
    "RELATES_TO",
    "DUPLICATES",
    "IS_DUPLICATED_BY"
] as const

const LINK_TYPE_OPTIONS = [
    { value: "BLOCKS", label: "Blocks" },
    { value: "BLOCKED_BY", label: "Blocked by" },
    { value: "RELATES_TO", label: "Relates to" },
    { value: "DUPLICATES", label: "Duplicates" },
    { value: "IS_DUPLICATED_BY", label: "Is duplicated by" },
]

// ── Dependency row ────────────────────────────────────────

function DepRow({
    dep,
    label,
    onDelete,
    canEdit,
}: {
    dep: DependencyItem
    label: string
    onDelete: (depId: string) => void
    canEdit: boolean
}) {
    const statusCfg = STATUS_CONFIG[dep.task.taskStatus as TaskStatus] ?? STATUS_CONFIG["TODO"]
    const displayLabel = LINK_TYPE_OPTIONS.find(opt => opt.value === label)?.label ?? label

    return (
        <div className="grid grid-cols-[130px_minmax(0,1fr)_auto_auto] items-center gap-2 py-1.5 group">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{displayLabel}:</span>
            <div className="min-w-0 flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground shrink-0">[{dep.task.taskCode}]</span>
                <span className="text-sm truncate">{dep.task.title}</span>
            </div>
            <Badge className={cn("text-xs px-2 py-0 h-5 border-0 shrink-0", statusCfg.bg)}>{statusCfg.label}</Badge>
            {canEdit ? (
                <button
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                    onClick={() => onDelete(dep.depId)}
                    aria-label="Remove link"
                >
                    <X size={13} />
                </button>
            ) : <span />}
        </div>
    )
}

// ── Add dependency dialog ─────────────────────────────────

interface AddDepDialogProps {
    open: boolean
    onClose: () => void
    taskId: string
    projectId: string
}

function AddDepDialog({ open, onClose, taskId, projectId }: AddDepDialogProps) {
    const qc = useQueryClient()
    const [search, setSearch] = useState("")
    const [linkType, setLinkType] = useState("BLOCKS")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleSearchChange = (v: string) => {
        setSearch(v)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setDebouncedSearch(v), 300)
    }

    const { data: searchResults = [] } = useQuery({
        queryKey: ["task-search", projectId, debouncedSearch],
        queryFn: async () => {
            if (!debouncedSearch.trim()) return []
            const res = await apiJava.get(`/v1/projects/${projectId}/tasks`, {
                params: { q: debouncedSearch, size: 10 },
            })
            return (res.data?.data?.content ?? []) as { id: string; taskCode: string; title: string; taskStatus: TaskStatus }[]
        },
        enabled: !!debouncedSearch.trim(),
        staleTime: 10_000,
    })

    const addDep = useMutation({
        mutationFn: ({ targetId }: { targetId: string }) =>
            TaskService.addDependency(taskId, targetId, linkType),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["dependencies", taskId] })
            toast.success("Dependency added")
            onClose()
            setSearch("")
        },
        onError: (err: any) => {
            const status = err?.response?.status
            if (status === 422) toast.error(err?.response?.data?.message ?? "Circular dependency is not allowed")
            else if (status === 409) toast.error("This link already exists")
            else toast.error(err?.response?.data?.message ?? "Unable to add dependency")
        },
    })

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add Dependency</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* Link Type Select */}
                    <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Link Type</p>
                        <Select value={linkType} onValueChange={setLinkType}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Select link type" />
                            </SelectTrigger>
                            <SelectContent>
                                {LINK_TYPE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Task search */}
                    <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Task</p>
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={e => handleSearchChange(e.target.value)}
                                placeholder="Search by title or task code..."
                                className="pl-8 h-9 text-sm"
                                autoFocus
                            />
                        </div>

                        {searchResults.length > 0 && (
                            <div className="border rounded-md max-h-48 overflow-y-auto divide-y mt-1 shadow-sm">
                                {searchResults
                                    .filter(t => t.id !== taskId)
                                    .map(t => {
                                        const cfg = STATUS_CONFIG[t.taskStatus] ?? STATUS_CONFIG["TODO"]
                                        return (
                                            <button
                                                key={t.id}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent text-left transition-colors"
                                                onClick={() => addDep.mutate({ targetId: t.id })}
                                                disabled={addDep.isPending}
                                            >
                                                <span className="font-mono text-xs text-muted-foreground shrink-0">{t.taskCode}</span>
                                                <span className="flex-1 text-sm truncate font-medium">{t.title}</span>
                                                <Badge className={cn("text-[10px] px-1.5 py-0 border-0 shrink-0 h-5", cfg.bg)}>
                                                    {cfg.label}
                                                </Badge>
                                            </button>
                                        )
                                    })}
                            </div>
                        )}

                        {debouncedSearch && searchResults.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4 bg-slate-50 rounded-md border border-dashed mt-1">No tasks found.</p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Main section ──────────────────────────────────────────

export default function DependencySection({ taskId, projectId, canEdit }: DependencySectionProps) {
    const qc = useQueryClient()
    const [addOpen, setAddOpen] = useState(false)

    const { data, isLoading } = useQuery({
        queryKey: ["dependencies", taskId],
        queryFn: () => TaskService.getDependencies(taskId),
        staleTime: 30_000,
        enabled: !!taskId,
    })

    const deleteDep = useMutation({
        mutationFn: (depId: string) => TaskService.deleteDependency(taskId, depId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["dependencies", taskId] })
            toast.success("Link removed")
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? "Unable to remove link"),
    })

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                    <Link2 size={14} /> Dependencies
                </span>
                {canEdit && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={() => setAddOpen(true)}
                        aria-label="Add dependency"
                    >
                        <Plus size={13} className="mr-0.5" /> Add
                    </Button>
                )}
            </div>

            {isLoading && (
                <div className="space-y-2 animate-pulse pl-2">
                    <div className="h-5 bg-muted rounded w-3/4" />
                </div>
            )}

            {!isLoading && (
                <div className="divide-y divide-border/40 pl-1">
                    {ALL_LINK_GROUPS.map((group) => {
                        const rows = 
                            group === "BLOCKS" ? (data?.blocking ?? []) :
                            group === "BLOCKED_BY" ? (data?.blockedBy ?? []) :
                            group === "RELATES_TO" ? (data?.relatesTo ?? []) :
                            group === "DUPLICATES" ? (data?.duplicates ?? []) :
                            group === "IS_DUPLICATED_BY" ? (data?.isDuplicatedBy ?? []) :
                            []
                        
                        if (rows.length === 0) {
                            const displayLabel = LINK_TYPE_OPTIONS.find(opt => opt.value === group)?.label ?? group
                            return (
                                <div key={group} className="grid grid-cols-[130px_minmax(0,1fr)] items-center gap-2 py-1.5">
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{displayLabel}:</span>
                                    <span className="text-xs text-muted-foreground">—</span>
                                </div>
                            )
                        }
                        return rows.map((dep) => (
                            <DepRow
                                key={`${group}-${dep.depId}`}
                                dep={dep}
                                label={group}
                                onDelete={id => deleteDep.mutate(id)}
                                canEdit={canEdit}
                            />
                        ))
                    })}
                </div>
            )}

            <AddDepDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                taskId={taskId}
                projectId={projectId}
            />
        </div>
    )
}
