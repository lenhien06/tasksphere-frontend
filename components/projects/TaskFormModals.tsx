"use client"

import React, { useState, useMemo } from 'react'
import { UserCircle, Calendar, Loader2, TriangleAlert, X, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/common/UserAvatar'
import { toast } from 'sonner'
import { useProjectSprints } from '@/hooks/useProjectSprints'
import { useQueryClient } from '@tanstack/react-query'

// ── Types ─────────────────────────────────────────────────────

export type TaskPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
export type TaskType = "TASK" | "BUG" | "FEATURE" | "STORY" | "EPIC" | "SUB_TASK"

export interface CreateTaskPayload {
    title: string
    description?: string
    type: TaskType
    priority: TaskPriority
    assigneeId: string | null
    dueDate: string | null
    storyPoints: number | null
    estimatedHours?: number | null
    skillTagsRequired: string[]
    confirmActiveSprintChange?: boolean
    statusColumnId: string
    parentTaskId: string | null
    sprintId: string | null
}

export interface Member {
    id: string
    name: string
    email: string
    avatarUrl?: string
    skillTags?: string[]
}

export interface Column {
    id: string
    name: string
    color: string
}

export interface Sprint {
    id: string
    name: string
    status: "ACTIVE" | "PLANNED" | "COMPLETED"
}

export interface ParentTask {
    id: string
    taskCode: string
    title: string
}

// ── Configs ───────────────────────────────────────────────────

// FIX 1: FEATURE = "Feature", STORY = "Story"
const TYPE_CONFIG: Record<TaskType, { icon: string; bg: string; text: string }> = {
    BUG:      { icon: "🐛", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]" },
    FEATURE:  { icon: "✨", bg: "bg-[#EFF6FF]", text: "text-[#1D4ED8]" },
    TASK:     { icon: "📋", bg: "bg-slate-100",  text: "text-slate-700" },
    STORY:    { icon: "📖", bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
    EPIC:     { icon: "🚀", bg: "bg-[#DBEAFE]",  text: "text-[#1E40AF]" },
    SUB_TASK: { icon: "🔗", bg: "bg-gray-100",   text: "text-gray-600" },
}

const PRIORITY_CONFIG: Record<TaskPriority, { bg: string; text: string }> = {
    CRITICAL: { bg: "bg-[#F3E8FF]", text: "text-[#722ED1]" },
    HIGH:     { bg: "bg-[#FEE2E2]", text: "text-[#B91C1C]" },
    MEDIUM:   { bg: "bg-[#FEF3C7]", text: "text-[#B45309]" },
    LOW:      { bg: "bg-[#DBEAFE]", text: "text-[#1D4ED8]" },
}

const STORY_POINT_PRESETS = [1, 2, 3, 5, 8, 13]

const QUICK_CREATE_TYPES: TaskType[] = ["BUG", "FEATURE", "TASK", "STORY"]
const MAX_REQUIRED_SKILLS = 8

const TYPE_LABELS: Record<TaskType, string> = {
    BUG: "Bug",
    FEATURE: "Feature",
    TASK: "Task",
    STORY: "Story",
    EPIC: "Epic",
    SUB_TASK: "Sub-task",
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
    CRITICAL: "Critical",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
}

function normalizeSkillTag(value: string) {
    return value.trim().replace(/\s+/g, " ")
}

function getSprintStatusLabel(status: Sprint["status"]) {
    return status === "ACTIVE"
        ? "Active"
        : status === "PLANNED"
            ? "Planned"
            : "Completed"
}

function getSprintOptionLabel(sprint: Sprint) {
    return `${sprint.name} (${getSprintStatusLabel(sprint.status)})`
}

function getSuggestedSkills(members: Member[]) {
    return Array.from(
        new Set(
            members
                .flatMap((member) => member.skillTags ?? [])
                .map(normalizeSkillTag)
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b))
}

// ── SprintSelector (FIX 5) ────────────────────────────────────
// ≤3 sprints → button group, >3 → dropdown

interface SprintSelectorProps {
    sprints: Sprint[]
    isLoading: boolean
    value: string | null      // null = Backlog
    onChange: (id: string | null) => void
}

function SprintSelector({ sprints, isLoading, value, onChange }: SprintSelectorProps) {
    if (isLoading) {
        return (
            <div className="flex gap-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        )
    }

    const backlogBtn = (
        <button
            type="button"
            onClick={() => onChange(null)}
            className={cn(
                "px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all border",
                value === null
                    ? "bg-gray-700 text-white border-gray-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            )}
        >
            Backlog
        </button>
    )

    if (sprints.length === 0) {
        return (
            <div className="flex items-center gap-3">
                {backlogBtn}
                <span className="text-sm text-gray-400 italic">No available sprints</span>
            </div>
        )
    }

    if (false && sprints.length <= 3) {
        return (
            <div className="flex gap-1.5 flex-wrap">
                {backlogBtn}
                {sprints.map(s => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => onChange(s.id)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all border",
                            value === s.id
                                ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]"
                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                        )}
                    >
                        {s.status === "ACTIVE" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        )}
                        <Zap size={13} className="text-blue-500 shrink-0" />
                        {s.name}
                    </button>
                ))}
            </div>
        )
    }

    // >3 sprints — dropdown
    return (
        <select
            value={value ?? ""}
            onChange={e => onChange(e.target.value || null)}
            className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white"
        >
            <option value="">Backlog</option>
            {sprints.map(s => (
                <option key={s.id} value={s.id}>
                    {getSprintOptionLabel(s)}
                </option>
            ))}
        </select>
    )
}

// ── QuickCreateTask ───────────────────────────────────────────

interface ActiveSprintWarningDialogProps {
    open: boolean
    sprintName?: string | null
    isSubmitting: boolean
    onCancel: () => void
    onConfirm: () => void
}

function ActiveSprintWarningDialog({
    open,
    sprintName,
    isSubmitting,
    onCancel,
    onConfirm,
}: ActiveSprintWarningDialogProps) {
    if (!open) return null

    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]">
            <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-600">
                        <TriangleAlert size={18} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-900">
                            Sprint progress warning
                        </h3>
                        <p className="text-sm leading-6 text-slate-600">
                            You are adding a task to an active sprint{ sprintName ? ` (${sprintName})` : "" }. This will increase total Story Points and directly affect the burndown chart.
                        </p>
                    </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                        Add anyway
                    </button>
                </div>
            </div>
        </div>
    )
}

interface QuickCreateProps {
    columnId: string
    columnName: string
    onConfirm: (payload: CreateTaskPayload) => void | Promise<unknown>
    onCancel: () => void
    onOpenFull: (title: string) => void
}

export function QuickCreateTask({ columnId, columnName, onConfirm, onCancel, onOpenFull }: QuickCreateProps) {
    const [title, setTitle] = useState("")

    const handleSubmit = () => {
        if (!title.trim()) return
        void onConfirm({
            title: title.trim(),
            priority: "MEDIUM",
            type: "TASK",
            statusColumnId: columnId,
            assigneeId: null,
            dueDate: null,
            storyPoints: null,
            skillTagsRequired: [],
            parentTaskId: null,
            sprintId: null,
        })
        setTitle("")
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white border border-[#1677FF] rounded-xl px-3 py-2.5 shadow-md mb-3"
        >
            <textarea
                autoFocus
                rows={2}
                maxLength={255}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSubmit())}
                placeholder={`Task name - ${columnName}`}
                className="w-full text-sm text-gray-800 resize-none outline-none leading-relaxed"
            />
            <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <button type="button" onClick={() => onOpenFull(title)} className="text-[11px] text-blue-500 font-medium">Open full form</button>
                <div className="flex gap-1">
                    <button type="button" onClick={onCancel} className="text-[11px] text-gray-500 px-2">Cancel</button>
                    <button type="button" onClick={handleSubmit} disabled={!title.trim()} className="bg-[#1677FF] text-white text-[11px] h-7 px-3 rounded-lg font-medium disabled:opacity-50">Create</button>
                </div>
            </div>
        </motion.div>
    )
}

// ── FullCreateTask ────────────────────────────────────────────

interface FullCreateProps {
    projectId: string
    defaultColumnId?: string
    defaultTitle?: string
    parentTask?: ParentTask
    projectMembers: Member[]
    columns: Column[]
    projectKey?: string
    onConfirm: (payload: CreateTaskPayload) => Promise<unknown>
    onClose: () => void
}

export function FullCreateTask({
    projectId, defaultColumnId, defaultTitle, parentTask,
    projectMembers, columns, projectKey,
    onConfirm, onClose,
}: FullCreateProps) {
    // Fetch sprints for the correct project (FIX: no hardcoding, do not use global store)
    const { data: sprints = [], isLoading: sprintsLoading } = useProjectSprints(projectId)
    const queryClient = useQueryClient()

    const [title, setTitle]           = useState(defaultTitle || "")
    const [description, setDescription] = useState("")
    const [type, setType]             = useState<TaskType>("TASK")
    const [priority, setPriority]     = useState<TaskPriority>("MEDIUM")
    const [assigneeId, setAssigneeId] = useState<string | null>(null)
    const [dueDate, setDueDate]       = useState<string | null>(null)
    const [sprintId, setSprintId]     = useState<string | null>(null)
    const [createAnother, setCreateAnother] = useState(false)
    const [isSubmitting, setIsSubmitting]   = useState(false)

    // FIX 3 — Story Points with custom input (range 1-100)
    const [storyPoints, setStoryPoints] = useState<number | null>(null)
    const [customSP, setCustomSP]       = useState("")
    const [isCustomSP, setIsCustomSP]   = useState(false)

    // NEW field: estimatedHours
    const [requiredSkillInput, setRequiredSkillInput] = useState("")
    const [requiredSkills, setRequiredSkills] = useState<string[]>([])
    const estimatedHours = ""
    const setEstimatedHours = (_value: string) => {}

    // FIX-7 — 400 inline field errors
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [showActiveSprintWarning, setShowActiveSprintWarning] = useState(false)
    const [pendingPayload, setPendingPayload] = useState<CreateTaskPayload | null>(null)

    // EPIC cannot be assigned to a sprint — clear sprintId when type changes to EPIC
    const selectedMember = useMemo(
        () => projectMembers.find(m => m.id === assigneeId),
        [projectMembers, assigneeId]
    )

    const minDueDate = useMemo(() => {
        return new Date().toISOString().split("T")[0]
    }, [])

    const suggestedSkills = useMemo(() => getSuggestedSkills(projectMembers), [projectMembers])
    const suggestedAssignee = useMemo(() => {
        if (requiredSkills.length === 0) return null
        return projectMembers
            .map((member) => {
                const memberSkills = (member.skillTags ?? []).map((skill) => skill.toLowerCase())
                const matchedSkills = requiredSkills.filter((skill) => memberSkills.includes(skill.toLowerCase()))
                return matchedSkills.length > 0 ? { member, matchedSkills } : null
            })
            .filter((item): item is { member: Member; matchedSkills: string[] } => item !== null)
            .sort((a, b) => b.matchedSkills.length - a.matchedSkills.length)[0] ?? null
    }, [projectMembers, requiredSkills])

    const taskCode = projectKey ? `${projectKey}-???` : "???"

    // FIX 2 — counter color
    const titleCounterClass =
        title.length > 245 ? "text-red-500" :
        title.length > 230 ? "text-amber-500" :
        "text-gray-400"

    const addRequiredSkill = (rawValue: string) => {
        const normalized = normalizeSkillTag(rawValue)
        if (!normalized) return
        if (requiredSkills.some((skill) => skill.toLowerCase() === normalized.toLowerCase())) return
        if (requiredSkills.length >= MAX_REQUIRED_SKILLS) {
            toast.error("You can add up to 8 required skills per task.")
            return
        }
        setRequiredSkills((current) => [...current, normalized])
        setRequiredSkillInput("")
    }

    const resetModernForm = () => {
        setTitle("")
        setDescription("")
        setType("TASK")
        setPriority("MEDIUM")
        setAssigneeId(null)
        setDueDate(null)
        setSprintId(null)
        setStoryPoints(null)
        setCustomSP("")
        setIsCustomSP(false)
        setRequiredSkillInput("")
        setRequiredSkills([])
        setFieldErrors({})
        setPendingPayload(null)
        setShowActiveSprintWarning(false)
    }

    const submitModernPayload = async (payload: CreateTaskPayload) => {
        setIsSubmitting(true)
        try {
            await onConfirm(payload)
            if (createAnother) {
                resetModernForm()
                setIsSubmitting(false)
            } else {
                onClose()
            }
        } catch (err: any) {
            setIsSubmitting(false)
            const status = err?.response?.status
            const message = err?.response?.data?.message ?? err?.response?.data?.detail
            if (status === 404) {
                toast.error(`Not found: ${message ?? "sprint or column does not exist"}`)
                queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
            } else if (status === 409) {
                toast.warning(message ?? "Sprint dang chay va can xac nhan truoc khi them task.")
            } else if (status === 422) {
                toast.error(message ?? "Business rule violation")
            } else if (status === 400) {
                const raw = err?.response?.data?.meta?.message ?? message ?? ""
                const parsed: Record<string, string> = {}
                raw.split(", ").forEach((part: string) => {
                    const colonIdx = part.indexOf(": ")
                    if (colonIdx !== -1) {
                        const field = part.substring(0, colonIdx).trim()
                        const msg = part.substring(colonIdx + 2).trim()
                        if (field) parsed[field] = msg
                    }
                })
                if (Object.keys(parsed).length > 0) {
                    setFieldErrors(parsed)
                }
                toast.error(raw || "Du lieu khong hop le")
            }
        }
    }

    const handleCreateTask = async () => {
        if (!title.trim() || isSubmitting) return
        setFieldErrors({})

        if (title.length > 255) {
            toast.error("Title must be 255 characters or fewer.")
            return
        }
        if (dueDate && dueDate < minDueDate) {
            toast.error("Due date must be today or later.")
            return
        }
        if (storyPoints !== null && (storyPoints < 1 || storyPoints > 100)) {
            toast.error("Story Points must be between 1 and 100.")
            return
        }
        if (sprintId && !sprints.find((sprint) => sprint.id === sprintId)) {
            toast.error("The selected sprint is no longer available.")
            setSprintId(null)
            queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
            return
        }

        const payload: CreateTaskPayload = {
            title: title.trim(),
            description: description || undefined,
            type: QUICK_CREATE_TYPES.includes(type) ? type : "TASK",
            priority,
            assigneeId,
            dueDate,
            storyPoints,
            skillTagsRequired: requiredSkills,
            statusColumnId: defaultColumnId || columns[0]?.id || "",
            parentTaskId: parentTask?.id || null,
            sprintId,
        }

        const selectedSprint = payload.sprintId
            ? sprints.find((sprint) => sprint.id === payload.sprintId) ?? null
            : null

        if (selectedSprint?.status === "ACTIVE") {
            setPendingPayload(payload)
            setShowActiveSprintWarning(true)
            return
        }

        await submitModernPayload(payload)
    }

    const handleSubmit = async () => {
        if (!title.trim() || isSubmitting) return
        setFieldErrors({})

        if (title.length > 255) {
            toast.error("Title must be 255 characters or fewer.")
            return
        }
        if (dueDate && dueDate <= new Date().toISOString().split("T")[0]) {
            toast.error("Due date must be later than today.")
            return
        }
        // Updated range for Story Points (1-127)
        if (storyPoints !== null && (storyPoints < 1 || storyPoints > 100)) {
            toast.error("Story Points must be between 1 and 100.")
            return
        }

        const estHoursNum = estimatedHours.trim() ? parseFloat(estimatedHours) : null;
        if (estHoursNum !== null && (isNaN(estHoursNum) || estHoursNum < 0 || estHoursNum > 999.99)) {
            toast.error("Estimated hours must be between 0 and 999.99.")
            return
        }

        // Validate sprint belongs to the correct project
        if (sprintId && !sprints.find(s => s.id === sprintId)) {
            toast.error("The selected sprint is no longer available.")
            setSprintId(null)
            queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
            return
        }

        setIsSubmitting(true)
        const payload: CreateTaskPayload = {
            title: title.trim(),
            description: description || undefined,
            type,
            priority,
            assigneeId,
            dueDate,
            storyPoints,
            estimatedHours: estHoursNum,
            skillTagsRequired: requiredSkills,
            statusColumnId: defaultColumnId || columns[0]?.id || "", // Always use default TODO status
            parentTaskId: parentTask?.id || null,
            sprintId,
        }

        try {
            await onConfirm(payload)
            if (createAnother) {
                setTitle("")
                setDescription("")
                setStoryPoints(null)
                setCustomSP("")
                setIsCustomSP(false)
                setEstimatedHours("")
                setIsSubmitting(false)
            } else {
                onClose()
            }
        } catch (err: any) {
            setIsSubmitting(false)
            const status = err?.response?.status
            const message = err?.response?.data?.message ?? err?.response?.data?.detail
            if (status === 404) {
                toast.error(`Not found: ${message ?? "sprint or column does not exist"}`)
                queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
            } else if (status === 422) {
                toast.error(message ?? "Business rule violation")
            } else if (status === 400) {
                // Parse "field: message, field2: message2" format into inline errors
                const raw = err?.response?.data?.meta?.message ?? message ?? ""
                const parsed: Record<string, string> = {}
                raw.split(", ").forEach((part: string) => {
                    const colonIdx = part.indexOf(": ")
                    if (colonIdx !== -1) {
                        const field = part.substring(0, colonIdx).trim()
                        const msg = part.substring(colonIdx + 2).trim()
                        if (field) parsed[field] = msg
                    }
                })
                if (Object.keys(parsed).length > 0) {
                    setFieldErrors(parsed)
                }
                toast.error(raw || "Invalid data")
            }
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            />

            <motion.div
                initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }}
                className="relative bg-white rounded-2xl w-full max-w-[700px] shadow-2xl flex flex-col overflow-hidden"
            >
                <ActiveSprintWarningDialog
                    open={showActiveSprintWarning}
                    sprintName={pendingPayload?.sprintId ? sprints.find((sprint) => sprint.id === pendingPayload.sprintId)?.name : null}
                    isSubmitting={isSubmitting}
                    onCancel={() => {
                        setPendingPayload(null)
                        setShowActiveSprintWarning(false)
                    }}
                    onConfirm={() => pendingPayload ? submitModernPayload({ ...pendingPayload, confirmActiveSprintChange: true }) : undefined}
                />

                {/* Header */}
                <div className="px-6 pt-5 pb-4 flex justify-between items-center border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Create New Task</h2>
                    <span className="bg-[#E5E7EB] text-gray-500 font-mono text-sm px-2 py-0.5 rounded-md">{taskCode}</span>
                </div>

                <div className="px-6 py-4 space-y-3.5 overflow-y-auto max-h-[75vh] custom-scrollbar">

                    <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)_160px]">
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-800">Type</label>
                            <div className="relative">
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as TaskType)}
                                    className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                                >
                                    {QUICK_CREATE_TYPES.map((key) => (
                                        <option key={key} value={key}>
                                            {TYPE_LABELS[key]}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-3.5 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-800 flex gap-1 mb-1">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                autoFocus
                                maxLength={255}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Task name"
                                className="w-full h-10 border border-gray-200 rounded-lg px-3 text-[15px] focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                            />
                            <div className={cn("text-right text-[10px] mt-0.5", titleCounterClass)}>
                                {title.length}/255
                            </div>
                            {fieldErrors.title && (
                                <p className="text-[11px] text-red-500 mt-1">{fieldErrors.title}</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-800">Priority</label>
                            <div className="relative">
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                                    className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                                >
                                    {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((key) => (
                                        <option key={key} value={key}>
                                            {PRIORITY_LABELS[key]}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-3.5 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm font-semibold text-gray-800 mb-1 block">Description</label>
                        <textarea
                            rows={3}
                            maxLength={2000}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Describe the task in detail..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[15px] resize-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-semibold text-gray-800 block">Required Skills</label>
                            <span className="text-[11px] text-gray-400">Optional</span>
                        </div>
                        <div className="rounded-xl border border-gray-200 px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                                {requiredSkills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                                    >
                                        {skill}
                                        <button
                                            type="button"
                                            onClick={() => setRequiredSkills((current) => current.filter((item) => item !== skill))}
                                            className="text-slate-400 hover:text-slate-700"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    value={requiredSkillInput}
                                    onChange={(e) => setRequiredSkillInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === ",") {
                                            e.preventDefault()
                                            addRequiredSkill(requiredSkillInput)
                                        }
                                    }}
                                    onBlur={() => {
                                        if (requiredSkillInput.trim()) addRequiredSkill(requiredSkillInput)
                                    }}
                                    placeholder="Type a skill and press Enter"
                                    className="min-w-[180px] flex-1 border-none p-0 text-sm outline-none placeholder:text-gray-400"
                                />
                            </div>
                        </div>
                        {suggestedSkills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {suggestedSkills.slice(0, 10).map((skill) => (
                                    <button
                                        key={skill}
                                        type="button"
                                        onClick={() => addRequiredSkill(skill)}
                                        className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-500"
                                    >
                                        {skill}
                                    </button>
                                ))}
                            </div>
                        )}
                        <p className="text-[11px] text-gray-400 mt-1.5">
                            Used to suggest the best assignee while creating the task. It does not need to appear again in task details.
                        </p>
                    </div>

                    {/* Assignee + Due Date */}
                    <div className="flex gap-6">
                        <div className="flex-1">
                            <label className="text-sm font-semibold text-gray-800 mb-1.5 block">Assignee</label>
                            <div className="relative">
                                <select
                                    value={assigneeId || ""}
                                    onChange={e => setAssigneeId(e.target.value || null)}
                                    className="w-full h-10 border border-gray-200 rounded-lg pl-10 pr-4 text-sm appearance-none bg-white cursor-pointer hover:border-gray-300 transition-all"
                                >
                                    <option value="">Unassigned</option>
                                    {projectMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                <div className="absolute left-2.5 top-2.5 w-5 h-5 rounded-full overflow-hidden">
                                    {assigneeId
                                        ? <UserAvatar name={selectedMember?.name || ""} src={selectedMember?.avatarUrl} size={20} />
                                        : <UserCircle size={20} className="text-gray-400" />
                                    }
                                </div>
                                <div className="absolute right-3 top-3.5 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-gray-400 pointer-events-none" />
                            </div>
                            {suggestedAssignee && assigneeId !== suggestedAssignee.member.id && (
                                <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                                    <div className="font-semibold">
                                        Suggested assignee: {suggestedAssignee.member.name}
                                    </div>
                                    <div className="mt-1">
                                        Matches {suggestedAssignee.matchedSkills.length} skill{suggestedAssignee.matchedSkills.length === 1 ? "" : "s"} for this task.
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAssigneeId(suggestedAssignee.member.id)}
                                        className="mt-2 font-semibold underline"
                                    >
                                        Use this assignee
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <label className="text-sm font-semibold text-gray-800 mb-1.5 block">Due Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dueDate || ""}
                                    min={minDueDate}
                                    onChange={e => setDueDate(e.target.value || null)}
                                    className="w-full h-10 border border-gray-200 rounded-lg pl-10 pr-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                                <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                            </div>
                            {fieldErrors.dueDate && (
                                <p className="text-[11px] text-red-500 mt-1">{fieldErrors.dueDate}</p>
                            )}
                        </div>
                    </div>

                    {/* Sprint (FIX 5) + Story Points (FIX 3) */}
                    <div className="flex gap-6">
                        {type !== "EPIC" ? (
                        <div className="flex-1">
                            <label className="text-sm font-semibold text-gray-800 mb-2 block">Sprint</label>
                            <SprintSelector sprints={sprints} isLoading={sprintsLoading} value={sprintId} onChange={setSprintId} />
                            {sprintId && sprints.find((sprint) => sprint.id === sprintId) && (
                                <p className="text-[11px] text-gray-500 mt-1.5">
                                    {getSprintOptionLabel(sprints.find((sprint) => sprint.id === sprintId)!)}
                                </p>
                            )}
                        </div>
                        ) : (
                        <div className="flex-1">
                            <label className="text-sm font-semibold text-gray-800 mb-2 block">Sprint</label>
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                Epics cannot be assigned to a sprint.
                            </p>
                        </div>
                        )}

                        {/* FIX 3 — Story Points with custom input */}
                        <div className="flex-1">
                            <label className="text-sm font-semibold text-gray-800 mb-2 block">Story Points</label>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {STORY_POINT_PRESETS.map(pt => (
                                    <button
                                        key={pt}
                                        type="button"
                                        onClick={() => { setStoryPoints(pt); setIsCustomSP(false); setCustomSP("") }}
                                        className={cn(
                                            "w-9 h-9 rounded-xl text-sm font-medium border transition-all",
                                            storyPoints === pt && !isCustomSP
                                                ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        {pt}
                                    </button>
                                ))}

                                {/* Custom input button */}
                                {isCustomSP ? (
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        autoFocus
                                        value={customSP}
                                        onChange={e => {
                                            const val = e.target.value
                                            setCustomSP(val)
                                            const num = parseInt(val)
                                            setStoryPoints(!isNaN(num) && num >= 1 && num <= 100 ? num : null)
                                        }}
                                        onBlur={() => { if (!customSP) { setIsCustomSP(false) } }}
                                        placeholder="1-100"
                                        className="w-20 h-9 border-2 border-blue-400 rounded-xl text-sm text-center outline-none font-medium"

                                    />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => { setIsCustomSP(true); setStoryPoints(null) }}
                                        className="h-9 px-2.5 rounded-xl text-xs text-gray-400 border border-dashed border-gray-300 hover:border-blue-300 hover:text-blue-400 transition-all"
                                    >
                                        Custom
                                    </button>
                                )}

                                {storyPoints !== null && (
                                    <button
                                        type="button"
                                        onClick={() => { setStoryPoints(null); setIsCustomSP(false); setCustomSP("") }}
                                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1.5">
                                Use Fibonacci sizing: 1, 2, 3, 5, 8, 13.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50/50 flex justify-between items-center">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={createAnother}
                            onChange={() => setCreateAnother(!createAnother)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-[14px] text-gray-700 font-medium">Create another task</span>
                    </label>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="h-10 px-6 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateTask}
                            disabled={!title.trim() || isSubmitting}
                            className="h-10 px-8 rounded-lg bg-[#3B82F6] text-white text-sm font-bold shadow-md hover:bg-blue-600 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                            Create task
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
