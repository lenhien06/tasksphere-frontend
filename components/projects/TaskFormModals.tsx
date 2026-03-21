"use client"

import React, { useState, useMemo } from 'react'
import { UserCircle, Calendar, Zap, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/common/UserAvatar'
import { toast } from 'sonner'
import { useProjectSprints } from '@/hooks/useProjectSprints'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

// ── Types ─────────────────────────────────────────────────────

export type TaskPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
// FIX 1: add FEATURE (standard BE enum), STORY = "Story" in agile
export type TaskType = "TASK" | "BUG" | "FEATURE" | "STORY" | "EPIC" | "SUB_TASK"

export interface CreateTaskPayload {
    title: string
    description?: string
    type: TaskType
    priority: TaskPriority
    assigneeId: string | null
    dueDate: string | null
    storyPoints: number | null
    statusColumnId: string
    parentTaskId: string | null
    sprintId: string | null
}

export interface Member {
    id: string
    name: string
    email: string
    avatarUrl?: string
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

const STORY_POINT_PRESETS = [1, 2, 3, 5, 8]

// ── SprintSelector (FIX 5) ────────────────────────────────────
// ≤3 sprints → button group, >3 → dropdown

interface SprintSelectorProps {
    sprints: Sprint[]
    isLoading: boolean
    value: string | null      // null = Backlog
    onChange: (id: string | null) => void
}

function SprintSelector({ sprints, isLoading, value, onChange }: SprintSelectorProps) {
    const { t } = useTranslation()

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
            📦 {t('common.backlog')}
        </button>
    )

    if (sprints.length === 0) {
        return (
            <div className="flex items-center gap-3">
                {backlogBtn}
                <span className="text-sm text-gray-400 italic">{t('backlog.noAvailableSprints')}</span>
            </div>
        )
    }

    if (sprints.length <= 3) {
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
            <option value="">📦 Backlog</option>
            {sprints.map(s => (
                <option key={s.id} value={s.id}>
                    {s.status === "ACTIVE" ? "🟢" : "⚪"} {s.name}
                </option>
            ))}
        </select>
    )
}

// ── QuickCreateTask ───────────────────────────────────────────

interface QuickCreateProps {
    columnId: string
    columnName: string
    onConfirm: (payload: CreateTaskPayload) => void
    onCancel: () => void
    onOpenFull: (title: string) => void
}

export function QuickCreateTask({ columnId, columnName, onConfirm, onCancel, onOpenFull }: QuickCreateProps) {
    const { t } = useTranslation()
    const [title, setTitle] = useState("")

    const handleSubmit = () => {
        if (!title.trim()) return
        onConfirm({
            title: title.trim(),
            priority: "MEDIUM",
            type: "TASK",
            statusColumnId: columnId,
            assigneeId: null,
            dueDate: null,
            storyPoints: null,
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
                placeholder={t('task.namePlaceholder')}
                className="w-full text-sm text-gray-800 resize-none outline-none leading-relaxed"
            />
            <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <button type="button" onClick={() => onOpenFull(title)} className="text-[11px] text-blue-500 font-medium">{t('task.openFullForm')}</button>
                <div className="flex gap-1">
                    <button type="button" onClick={onCancel} className="text-[11px] text-gray-500 px-2">{t('common.cancel')}</button>
                    <button type="button" onClick={handleSubmit} disabled={!title.trim()} className="bg-[#1677FF] text-white text-[11px] h-7 px-3 rounded-lg font-medium disabled:opacity-50">{t('task.create')}</button>
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
    onConfirm: (payload: CreateTaskPayload) => void
    onClose: () => void
}

export function FullCreateTask({
    projectId, defaultColumnId, defaultTitle, parentTask,
    projectMembers, columns, projectKey,
    onConfirm, onClose,
}: FullCreateProps) {
    const { t } = useTranslation()
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
    const [columnId, setColumnId]     = useState(defaultColumnId || columns[0]?.id || "")
    const [createAnother, setCreateAnother] = useState(false)
    const [isSubmitting, setIsSubmitting]   = useState(false)

    // FIX 3 — Story Points with custom input
    const [storyPoints, setStoryPoints] = useState<number | null>(null)
    const [customSP, setCustomSP]       = useState("")
    const [isCustomSP, setIsCustomSP]   = useState(false)

    const selectedMember = useMemo(
        () => projectMembers.find(m => m.id === assigneeId),
        [projectMembers, assigneeId]
    )

    // min date = tomorrow (BE @Future rejects today)
    const minDueDate = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d.toISOString().split("T")[0]
    }, [])

    const taskCode = projectKey ? `${projectKey}-???` : "???"

    // FIX 2 — counter color
    const titleCounterClass =
        title.length > 245 ? "text-red-500" :
        title.length > 230 ? "text-amber-500" :
        "text-gray-400"

    const handleSubmit = async () => {
        if (!title.trim() || isSubmitting) return

        if (title.length > 255) {
            toast.error(t('task.titleMaxLength'))
            return
        }
        if (dueDate && dueDate <= new Date().toISOString().split("T")[0]) {
            toast.error(t('task.dueDateAfterToday'))
            return
        }
        if (storyPoints !== null && (storyPoints < 0 || storyPoints > 100)) {
            toast.error(t('task.storyPointsRange'))
            return
        }
        // Validate sprint belongs to the correct project
        if (sprintId && !sprints.find(s => s.id === sprintId)) {
            toast.error(t('task.invalidSprint'))
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
            statusColumnId: columnId,
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
                toast.error(`Invalid data: ${message ?? ""}`)
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
                {/* Header */}
                <div className="px-6 pt-5 pb-4 flex justify-between items-center border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('task.createNew')}</h2>
                    <span className="bg-[#E5E7EB] text-gray-500 font-mono text-sm px-2 py-0.5 rounded-md">{taskCode}</span>
                </div>

                <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[75vh]">

                    {/* Title — FIX 2 */}
                    <div>
                        <label className="text-sm font-semibold text-gray-800 flex gap-1 mb-1.5">
                            {t('task.name')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            autoFocus
                            maxLength={255}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={t('task.namePlaceholder')}
                            className="w-full h-10 border border-gray-200 rounded-lg px-3 text-[15px] focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                        />
                        <div className={cn("text-right text-xs mt-1", titleCounterClass)}>
                            {title.length}/255
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm font-semibold text-gray-800 mb-1.5 block">{t('task.description')}</label>
                        <textarea
                            rows={3}
                            maxLength={2000}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={t('task.descriptionPlaceholder')}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[15px] resize-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                        />
                    </div>

                    {/* Type + Priority */}
                    <div className="flex gap-6">
                        <div className="flex-1">
                            <label className="text-sm font-semibold text-gray-800 mb-2 block">{t('task.type')}</label>
                            <div className="flex gap-1.5 flex-wrap">
                                {(Object.entries(TYPE_CONFIG) as [TaskType, typeof TYPE_CONFIG[TaskType]][]).map(([key, val]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setType(key)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2 border-transparent",
                                            val.bg, val.text,
                                            type === key ? "ring-2 ring-offset-1 ring-blue-200" : "opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <span>{val.icon}</span>{t(`task.type_${key}`)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1">
                            <label className="text-sm font-semibold text-gray-800 mb-2 block">{t('task.priority')}</label>
                            <div className="flex gap-1.5 flex-wrap">
                                {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG[TaskPriority]][]).map(([key, val]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setPriority(key)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2 border-transparent",
                                            val.bg, val.text,
                                            priority === key ? "ring-2 ring-offset-1 ring-blue-200" : "opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        {t(`task.priority_${key}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Assignee + Due Date */}
                    <div className="flex gap-6">
                        <div className="flex-1">
                            <label className="text-sm font-semibold text-gray-800 mb-1.5 block">{t('task.assignee')}</label>
                            <div className="relative">
                                <select
                                    value={assigneeId || ""}
                                    onChange={e => setAssigneeId(e.target.value || null)}
                                    className="w-full h-10 border border-gray-200 rounded-lg pl-10 pr-4 text-sm appearance-none bg-white cursor-pointer hover:border-gray-300 transition-all"
                                >
                                    <option value="">{t('task.unassigned')}</option>
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
                        </div>

                        <div className="flex-1">
                            <label className="text-sm font-semibold text-gray-800 mb-1.5 block">{t('task.dueDate')}</label>
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
                        </div>
                    </div>

                    {/* Sprint (FIX 5) + Story Points (FIX 3) */}
                    <div className="flex gap-6">
                        <div className="flex-1">
                            <label className="text-sm font-semibold text-gray-800 mb-2 block">{t('task.sprint')}</label>
                            <SprintSelector sprints={sprints} isLoading={sprintsLoading} value={sprintId} onChange={setSprintId} />
                        </div>

                        {/* FIX 3 — Story Points with custom input */}
                        <div className="flex-1">
                            <label className="text-sm font-semibold text-gray-800 mb-2 block">{t('task.storyPoints')}</label>
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
                                            setStoryPoints(!isNaN(num) && num >= 0 && num <= 100 ? num : null)
                                        }}
                                        onBlur={() => { if (!customSP) { setIsCustomSP(false) } }}
                                        placeholder="0–100"
                                        className="w-20 h-9 border-2 border-blue-400 rounded-xl text-sm text-center outline-none font-medium"
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => { setIsCustomSP(true); setStoryPoints(null) }}
                                        className="h-9 px-2.5 rounded-xl text-xs text-gray-400 border border-dashed border-gray-300 hover:border-blue-300 hover:text-blue-400 transition-all"
                                    >
                                        {t('task.customPoints')}
                                    </button>
                                )}

                                {storyPoints !== null && (
                                    <button
                                        type="button"
                                        onClick={() => { setStoryPoints(null); setIsCustomSP(false); setCustomSP("") }}
                                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                                    >
                                        {t('task.clearPoints')}
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1.5">{t('task.storyPointsHint')}</p>
                        </div>
                    </div>

                    {/* Kanban Column */}
                    <div>
                        <label className="text-sm font-semibold text-gray-800 mb-2 block">{t('task.kanbanColumn')}</label>
                        <div className="flex gap-5 flex-wrap">
                            {columns.map(col => {
                                const isSelected = columnId === col.id
                                return (
                                    <button
                                        key={col.id}
                                        type="button"
                                        onClick={() => setColumnId(col.id)}
                                        className="flex items-center gap-2 group cursor-pointer"
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                            isSelected ? "border-blue-500" : "border-gray-300 group-hover:border-gray-400"
                                        )}>
                                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                                            <span className={cn("text-sm font-medium transition-all", isSelected ? "text-gray-900" : "text-gray-500")}>{col.name}</span>
                                        </div>
                                    </button>
                                )
                            })}
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
                        <span className="text-[14px] text-gray-700 font-medium">{t('task.createAnother')}</span>
                    </label>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="h-10 px-6 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!title.trim() || isSubmitting}
                            className="h-10 px-8 rounded-lg bg-[#3B82F6] text-white text-sm font-bold shadow-md hover:bg-blue-600 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                            {t('task.create')}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
