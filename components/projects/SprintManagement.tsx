"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
    Plus, Calendar, Play, CheckCircle, Pencil, Trash2, 
    ChevronDown, Archive, Rocket, ClipboardList, Clock, Zap,
    MoreHorizontal, ChevronRight, LayoutDashboard, Search, User,
    AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskService } from "@/app/services/TaskService"
import { ProjectService } from "@/app/services/ProjectService"
import type {
    SprintDetail, SprintStatus, CreateSprintRequest, CompleteSprintRequest,
} from "@/app/types/task.schema"
import {
    Modal, FieldLabel, InputStyled, PrimaryButton, SecondaryButton
} from "@/components/projects/ProjectModals"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

import { useProjectWebSocket } from "@/hooks/useProjectWebSocket"

// ── Helpers ──────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString("en-US", {
        day: "numeric", month: "numeric", year: "numeric"
    })
}

function getDurationDays(start: string, end: string): number {
    if (!start || !end) return 0
    return Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) / 86400000
    ) + 1
}

// ── Components ───────────────────────────────────────────────

const ActiveSprintConflictModal = ({ open, onClose }: { open: boolean, onClose: () => void }) => {
    const { t } = useTranslation()
    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title={t('sprint.conflict')}
            maxWidth="max-w-sm"
        >
            <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4 border-4 border-white shadow-xl">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t('sprint.alreadyActiveTitle')}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                    {t('sprint.alreadyActiveDesc')}
                </p>
                <div className="flex flex-col w-full gap-2">
                    <PrimaryButton className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => {
                        onClose();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}>
                        {t('sprint.goToActive')}
                    </PrimaryButton>
                    <SecondaryButton className="w-full" onClick={onClose}>
                        {t('common.close')}
                    </SecondaryButton>
                </div>
            </div>
        </Modal>
    )
}

function StatusBadge({ status }: { status: SprintStatus }) {
    const { t } = useTranslation()
    const config = {
        PLANNED:   { label: t('sprint.status_PLANNED'), className: "bg-slate-100 text-slate-600 border-slate-200" },
        ACTIVE:    { label: t('sprint.status_ACTIVE'), className: "bg-blue-100 text-blue-700 border-blue-200" },
        COMPLETED: { label: t('sprint.status_COMPLETED'), className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    }
    const { label, className } = config[status]
    return (
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", className)}>
            {label}
        </span>
    )
}

// ── SprintCard ────────────────────────────────────────────────

interface SprintCardProps {
    sprint:          SprintDetail
    isPM:            boolean
    variant:         "planned" | "completed"
    onStart?:        (s: SprintDetail) => void
    onEdit?:         (s: SprintDetail) => void
    onDelete?:       (s: SprintDetail) => void
}

const SprintCard = ({ sprint, isPM, variant, onStart, onEdit, onDelete }: SprintCardProps) => {
    const { t } = useTranslation()
    const remaining = Math.max(0, sprint.taskCount - sprint.doneCount)
    const duration = getDurationDays(sprint.startDate, sprint.endDate)
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-[22px] font-bold tracking-tight text-slate-900">{sprint.name}</h4>
                        <StatusBadge status={variant === "completed" ? "COMPLETED" : sprint.status} />
                    </div>

                    {sprint.goal && (
                        <p className="mt-1 text-sm font-medium italic text-slate-500">{sprint.goal}</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
                        <span>{t('sprint.startDate')}: {formatDate(sprint.startDate)}</span>
                        <span>{t('sprint.duration')}: {duration} {t('sprint.days')}</span>
                        <span>{t('sprint.totalTasks')}: {sprint.taskCount}</span>
                        <span>{t('sprint.velocity')}: {sprint.velocity || 0} pts</span>
                        {variant === "completed" && sprint.completedAt && (
                            <span>{t('sprint.status_COMPLETED')}: {formatDate(sprint.completedAt)}</span>
                        )}
                    </div>
                </div>

                {isPM && variant === "planned" && (
                    <div className="flex items-center gap-2 self-start">
                        <button
                            onClick={() => onStart?.(sprint)}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                            <Play size={14} fill="currentColor" />
                            {t('sprint.start')}
                        </button>
                        <button
                            onClick={() => onEdit?.(sprint)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-700"
                        >
                            <Pencil size={16} />
                        </button>
                        <button
                            onClick={() => onDelete?.(sprint)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            {variant === "planned" && (
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 md:grid-cols-4">
                    <div>
                        <div className="text-xs font-semibold text-slate-400">{t('sprint.total')}</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{sprint.taskCount}</div>
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-400">{t('sprint.done')}</div>
                        <div className="mt-1 text-lg font-bold text-emerald-600">{sprint.doneCount}</div>
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-400">{t('sprint.left')}</div>
                        <div className="mt-1 text-lg font-bold text-amber-600">{remaining}</div>
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-400">{t('sprint.velocity')}</div>
                        <div className="mt-1 text-lg font-bold text-blue-700">{sprint.velocity || 0} <span className="text-sm">pts</span></div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Main Page Component ───────────────────────────────────────

export default function SprintManagement({ projectId, myRole }: { projectId: string, myRole: string }) {
    const { t } = useTranslation()
    const isPM = ["PM", "PROJECT_MANAGER", "SYSTEM_ADMIN"].includes(myRole?.toUpperCase() || "")
    const queryClient = useQueryClient()

    // Real-time updates
    useProjectWebSocket(projectId)

    // UI States
    const [showCreate, setShowCreate] = useState(false)
    const [editingSprint, setEditingSprint] = useState<SprintDetail | null>(null)
    const [startingSprint, setStartingSprint] = useState<SprintDetail | null>(null)
    const [showComplete, setShowComplete] = useState(false)
    const [deletingSprint, setDeletingSprint] = useState<SprintDetail | null>(null)
    const [expandedCompleted, setExpandedCompleted] = useState(false)
    const [showActiveSprintConflict, setShowActiveSprintConflict] = useState(false)

    // Handle Errors inside component to access state
    function handleSprintError(error: unknown) {
        const err = error as { response?: { status?: number; data?: { meta?: { message?: string, code?: string } } } }
        const status  = err?.response?.status
        const message = err?.response?.data?.meta?.message
        const code    = err?.response?.data?.meta?.code

        if (code === "SPR_002" || status === 409) toast.error(t('sprint.nameExists'))
        else if (code === "SPR_004" || status === 422) toast.error(t('sprint.dateOverlap'))
        else if (code === "SPR_003") {
            setShowActiveSprintConflict(true)
        }
        else toast.error(message ?? t('error.generic'))
    }

    // Query Data
    const { data: projectData } = useQuery({
        queryKey: ["project-detail", projectId],
        queryFn:  () => ProjectService.getById(projectId),
        enabled:  !!projectId,
    })

    const { data: sprints = [], isLoading } = useQuery({
        queryKey: ["sprints", projectId],
        queryFn: () => TaskService.getSprints(projectId),
        enabled: !!projectId,
    })

    // Classification
    const activeSprint    = sprints.find(s => s.status === "ACTIVE") ?? null
    const plannedSprints  = sprints.filter(s => s.status === "PLANNED")
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    const completedSprints = sprints.filter(s => s.status === "COMPLETED")
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())

    const projectName = projectData?.data?.name || "Project"
    const daysLeft = activeSprint
        ? Math.ceil((new Date(activeSprint.endDate).getTime() - Date.now()) / 86400000)
        : 0

    // Modals internal components to use handleSprintError
    const CreateEditSprintModal = ({ 
        open, onClose, sprint 
    }: { 
        open: boolean, onClose: () => void, sprint: SprintDetail | null 
    }) => {
        const [name, setName] = useState(sprint?.name || "")
        const [goal, setGoal] = useState(sprint?.goal || "")
        const [startDate, setStartDate] = useState(sprint?.startDate || "")
        const [endDate, setEndDate] = useState(sprint?.endDate || "")

        React.useEffect(() => {
            if (open) {
                setName(sprint?.name || "")
                setGoal(sprint?.goal || "")
                setStartDate(sprint?.startDate || "")
                setEndDate(sprint?.endDate || "")
            }
        }, [open, sprint])

        const mutation = useMutation({
            mutationFn: (data: CreateSprintRequest) => 
                sprint ? TaskService.updateSprint(sprint.id, data) : TaskService.createSprint(projectId, data),
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
                toast.success(sprint ? t('sprint.updated') : t('sprint.created'))
                onClose()
            },
            onError: handleSprintError
        })

        const handleSubmit = () => {
            if (!name.trim() || !startDate || !endDate) {
                toast.error(t('sprint.fillRequired'))
                return
            }
            if (endDate < startDate) {
                toast.error(t('sprint.endAfterStart'))
                return
            }
            mutation.mutate({ name, goal, startDate, endDate })
        }

        return (
            <Modal
                isOpen={open}
                onClose={onClose}
                title={sprint ? t('sprint.edit') : t('sprint.create')}
                description={sprint ? t('sprint.editDesc') : t('sprint.createDesc')}
                maxWidth="max-w-md"
            >
                <div className="space-y-4">
                    <div>
                        <FieldLabel required>{t('sprint.name')}</FieldLabel>
                        <InputStyled
                            placeholder={t('sprint.namePlaceholder')}
                            value={name}
                            onChange={(e: any) => setName(e.target.value)}
                            maxLength={100}
                        />
                    </div>
                    <div>
                        <FieldLabel>{t('sprint.goal')} ({t('common.optional').toLowerCase()})</FieldLabel>
                        <textarea
                            className="w-full min-h-[80px] p-4 rounded-xl border border-gray-200 bg-gray-50/50 text-[14px] outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none"
                            placeholder={t('sprint.goalPlaceholder')}
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            maxLength={500}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <FieldLabel required>{t('sprint.startDate')}</FieldLabel>
                            <InputStyled
                                type="date"
                                value={startDate}
                                onChange={(e: any) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <FieldLabel required>{t('sprint.endDate')}</FieldLabel>
                            <InputStyled
                                type="date"
                                value={endDate}
                                onChange={(e: any) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    {startDate && endDate && (
                        <p className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
                            {t('sprint.estimated')}: {getDurationDays(startDate, endDate)} {t('sprint.days')}
                        </p>
                    )}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                        <SecondaryButton onClick={onClose}>{t('common.cancel')}</SecondaryButton>
                        <PrimaryButton onClick={handleSubmit} loading={mutation.isPending}>
                            {sprint ? t('sprint.saveChanges') : t('sprint.create')}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        )
    }

    const StartSprintModal = ({ 
        open, onClose, sprint 
    }: { 
        open: boolean, onClose: () => void, sprint: SprintDetail | null 
    }) => {
        const mutation = useMutation({
            mutationFn: () => TaskService.startSprint(sprint!.id),
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
                toast.success(t('sprint.startedSuccess', { name: sprint?.name }))
                onClose()
            },
            onError: handleSprintError
        })

        if (!sprint) return null

        return (
            <Modal
                isOpen={open}
                onClose={onClose}
                title={t('sprint.confirmStart', { name: sprint.name })}
                maxWidth="max-w-sm"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4 border-4 border-white shadow-xl">
                        <Play size={32} fill="currentColor" />
                    </div>
                    <p className="text-sm text-gray-500 mb-4">{t('sprint.cannotDeleteAfterStart')}</p>

                    <div className="w-full bg-gray-50 rounded-2xl p-4 space-y-2 mb-6">
                        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                            <span>{t('sprint.duration')}</span>
                            <span className="text-gray-900">{formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                            <span>{t('sprint.workload')}</span>
                            <span className="text-gray-900">{sprint.taskCount} {t('nav.tasks').toLowerCase()}</span>
                        </div>
                    </div>

                    {sprint.taskCount === 0 && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-6 text-left">
                            <Zap size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[12px] text-amber-700 font-bold">{t('sprint.noTasksWarning')}</p>
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <SecondaryButton className="flex-1" onClick={onClose}>{t('common.cancel')}</SecondaryButton>
                    <PrimaryButton className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => mutation.mutate()} loading={mutation.isPending}>
                        {t('sprint.startNow')}
                    </PrimaryButton>
                </div>
            </Modal>
        )
    }

    const CompleteSprintModal = ({ 
        open, onClose, sprint, plannedSprints 
    }: { 
        open: boolean, onClose: () => void, sprint: SprintDetail | null, plannedSprints: SprintDetail[] 
    }) => {
        const [step, setStep] = useState(1)
        const [action, setAction] = useState<"backlog" | "nextSprint">("backlog")
        const [nextSprintId, setNextSprintId] = useState("")

        const unfinishedCount = sprint ? sprint.taskCount - sprint.doneCount : 0

        const mutation = useMutation({
            mutationFn: (data: CompleteSprintRequest) => TaskService.completeSprint(sprint!.id, data),
            onSuccess: (res) => {
                queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
                queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
                toast.success(t('sprint.completedSuccess', { name: sprint?.name, velocity: res.velocity }))
                onClose()
                setStep(1)
            },
            onError: handleSprintError
        })

        const handleComplete = () => {
            if (unfinishedCount > 0 && step === 1) {
                setStep(2)
                return
            }
            mutation.mutate({ 
                unfinishedTasksAction: action, 
                nextSprintId: action === "nextSprint" ? nextSprintId : undefined 
            })
        }

        if (!sprint) return null

        return (
            <Modal
                isOpen={open}
                onClose={onClose}
                title={step === 1 ? t('sprint.confirmComplete', { name: sprint.name }) : t('sprint.handleUnfinished', { count: unfinishedCount })}
                maxWidth="max-w-md"
            >
                {step === 1 ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-green-50 border border-green-100 text-center">
                                <p className="text-2xl font-black text-green-600">{sprint.doneCount}</p>
                                <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">{t('sprint.done')}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 text-center">
                                <p className="text-2xl font-black text-orange-600">{unfinishedCount}</p>
                                <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">{t('sprint.notDone')}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                                <p className="text-2xl font-black text-blue-600">{sprint.velocity}</p>
                                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">{t('sprint.velocityPts')}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                                <p className="text-[11px] font-bold text-gray-600 uppercase mb-1">{t('sprint.duration')}</p>
                                <p className="text-xs font-bold text-gray-900">{formatDate(sprint.startDate)} → {t('sprint.now')}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                                <span>{t('sprint.completionRate')}</span>
                                <span>{sprint.completionRate}%</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${sprint.completionRate}%` }} />
                            </div>
                        </div>

                        {unfinishedCount > 0 && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex gap-2">
                                <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[12px] text-amber-700 font-bold leading-relaxed">
                                    {t('sprint.unfinishedWarning', { count: unfinishedCount })}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <SecondaryButton className="flex-1" onClick={onClose}>{t('common.cancel')}</SecondaryButton>
                            <PrimaryButton className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleComplete}>
                                {unfinishedCount > 0 ? `${t('common.next')} →` : t('sprint.confirmCompletion')}
                            </PrimaryButton>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <RadioGroup value={action} onValueChange={(v: any) => setAction(v)} className="space-y-3">
                            <div className={cn(
                                "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                                action === "backlog" ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-gray-200"
                            )} onClick={() => setAction("backlog")}>
                                <RadioGroupItem value="backlog" id="backlog" />
                                <div className="flex-1">
                                    <Label htmlFor="backlog" className="font-bold text-gray-900 cursor-pointer">{t('sprint.moveToBacklog')}</Label>
                                    <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{t('sprint.moveToBacklogDesc')}</p>
                                </div>
                            </div>

                            <div className={cn(
                                "flex flex-col gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                                action === "nextSprint" ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-gray-200"
                            )} onClick={() => setAction("nextSprint")}>
                                <div className="flex items-center gap-3">
                                    <RadioGroupItem value="nextSprint" id="nextSprint" />
                                    <div className="flex-1">
                                        <Label htmlFor="nextSprint" className="font-bold text-gray-900 cursor-pointer">{t('sprint.moveToNextSprint')}</Label>
                                        <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{t('sprint.moveToNextSprintDesc')}</p>
                                    </div>
                                </div>
                                {action === "nextSprint" && (
                                    <div className="pl-7 animate-in fade-in slide-in-from-top-1">
                                        <select
                                            className="w-full h-10 px-3 rounded-xl border border-blue-200 bg-white text-[13px] font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-500/10"
                                            value={nextSprintId}
                                            onChange={(e) => setNextSprintId(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="">{t('sprint.selectTargetSprint')}</option>
                                            {plannedSprints.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                        {plannedSprints.length === 0 && (
                                            <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{t('sprint.noPlannedSprints')}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </RadioGroup>

                        <div className="flex gap-3 pt-2">
                            <SecondaryButton className="flex-1" onClick={() => setStep(1)}>← {t('common.back')}</SecondaryButton>
                            <PrimaryButton
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={handleComplete}
                                loading={mutation.isPending}
                                disabled={action === "nextSprint" && !nextSprintId}
                            >
                                {t('sprint.complete')}
                            </PrimaryButton>
                        </div>
                    </div>
                )}
            </Modal>
        )
    }

    const DeleteSprintModal = ({ 
        open, onClose, sprint 
    }: { 
        open: boolean, onClose: () => void, sprint: SprintDetail | null 
    }) => {
        const mutation = useMutation({
            mutationFn: () => TaskService.deleteSprint(sprint!.id),
            onSuccess: (res) => {
                queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
                toast.success(t('sprint.deletedSuccess', { count: res.tasksMoved }))
                onClose()
            },
            onError: handleSprintError
        })

        if (!sprint) return null

        return (
            <Modal
                isOpen={open}
                onClose={onClose}
                title={t('sprint.deleteTitle', { name: sprint.name })}
                maxWidth="max-w-sm"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4 border-4 border-white shadow-xl">
                        <Trash2 size={32} />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-2">{t('sprint.cannotUndo')}</p>
                    <p className="text-[13px] text-gray-500 leading-relaxed mb-6">
                        {t('sprint.deleteDesc', { count: sprint.taskCount })}
                    </p>
                </div>
                <div className="flex gap-3">
                    <SecondaryButton className="flex-1" onClick={onClose}>{t('common.cancel')}</SecondaryButton>
                    <PrimaryButton className="flex-1 bg-red-600 hover:bg-red-700 shadow-red-600/20" onClick={() => mutation.mutate()} loading={mutation.isPending}>
                        {t('sprint.confirmDelete')}
                    </PrimaryButton>
                </div>
            </Modal>
        )
    }

    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-white animate-pulse p-8">
                <div className="h-10 w-64 bg-gray-100 rounded-lg mb-8" />
                <div className="h-80 w-full bg-gray-50 rounded-3xl mb-10" />
                <div className="h-40 w-full bg-gray-50 rounded-3xl" />
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col bg-[#F8FAFD]">
            <main className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-6 md:px-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                                <span>{t('nav.projects')}</span>
                                <ChevronRight size={14} className="text-slate-400" />
                                <span>{projectName}</span>
                                <ChevronRight size={14} className="text-slate-400" />
                                <span className="font-semibold text-slate-700">{t('sprint.management')}</span>
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight text-slate-950">{t('sprint.management')}</h1>
                            <p className="mt-2 text-base text-slate-500">
                                {t('sprint.description', { defaultValue: 'Quản lý các chu kỳ phát triển, theo dõi tiến độ và tốc độ làm việc của nhóm.' })}
                            </p>
                        </div>

                        {isPM && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="inline-flex h-11 items-center gap-2 self-start rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" />
                                {t('sprint.create')}
                            </button>
                        )}
                    </div>

                    {activeSprint ? (
                        <section className="rounded-3xl border-2 border-blue-300 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                        <div className="mb-2 flex items-center gap-3">
                                            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                                                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                                {t('sprint.status_ACTIVE')}
                                            </span>
                                        </div>
                                        <h2 className="truncate text-[34px] font-bold tracking-tight text-slate-950">{activeSprint.name}</h2>
                                        {activeSprint.goal && (
                                            <p className="mt-3 text-lg italic text-slate-600">{activeSprint.goal}</p>
                                        )}
                                    </div>

                                    {isPM && (
                                        <button
                                            onClick={() => setShowComplete(true)}
                                            className="inline-flex h-11 items-center gap-2 self-start rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                                        >
                                            <CheckCircle size={18} />
                                            {t('sprint.complete')}
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 divide-x divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-4">
                                    <div className="px-6 py-5 text-center">
                                        <div className="text-sm text-slate-500">{t('sprint.totalTasks')}</div>
                                        <div className="mt-1 text-4xl font-bold text-slate-950">{activeSprint.taskCount}</div>
                                    </div>
                                    <div className="px-6 py-5 text-center">
                                        <div className="text-sm text-slate-500">{t('sprint.status_COMPLETED')}</div>
                                        <div className="mt-1 text-4xl font-bold text-slate-950">{activeSprint.doneCount}</div>
                                    </div>
                                    <div className="px-6 py-5 text-center">
                                        <div className="text-sm text-slate-500">{t('sprint.remaining')}</div>
                                        <div className="mt-1 text-4xl font-bold text-slate-950">{Math.max(0, activeSprint.taskCount - activeSprint.doneCount)}</div>
                                    </div>
                                    <div className="px-6 py-5 text-center">
                                        <div className="text-sm text-slate-500">{t('sprint.velocity')}</div>
                                        <div className="mt-1 text-4xl font-bold text-slate-950">{activeSprint.velocity} <span className="text-xl">pts</span></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-blue-600 transition-all duration-700"
                                            style={{ width: `${activeSprint.completionRate}%` }}
                                        />
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold">
                                        <span className="text-slate-700">{activeSprint.completionRate}% complete</span>
                                        <span className="text-slate-600">
                                            {formatDate(activeSprint.startDate)} → {formatDate(activeSprint.endDate)}
                                            <span className={cn("ml-2 rounded-md px-2 py-1 text-xs", daysLeft > 0 ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700")}>
                                                {daysLeft > 0 ? t('sprint.daysLeft', { count: daysLeft }) : t('task.overdue')}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="rounded-3xl border border-slate-200 bg-white px-8 py-12 text-center shadow-sm">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                                <Rocket size={30} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">{t('sprint.noActiveSprint')}</h3>
                            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">{t('sprint.noActiveSprintDesc')}</p>
                            {isPM && plannedSprints.length > 0 && (
                                <button
                                    onClick={() => setStartingSprint(plannedSprints[0])}
                                    className="mt-6 inline-flex h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                                >
                                    {t('sprint.start')} {plannedSprints[0].name}
                                </button>
                            )}
                        </section>
                    )}

                    <section>
                        <div className="mb-4 flex items-center gap-2 text-slate-900">
                            <Clock size={18} className="text-slate-500" />
                            <h3 className="text-3xl font-bold tracking-tight">{t('sprint.status_PLANNED')}</h3>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">{plannedSprints.length}</span>
                        </div>

                        {plannedSprints.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-400">
                                {t('sprint.noPlanned')}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {plannedSprints.map((sprint) => (
                                    <SprintCard
                                        key={sprint.id}
                                        sprint={sprint}
                                        isPM={isPM}
                                        variant="planned"
                                        onStart={setStartingSprint}
                                        onEdit={setEditingSprint}
                                        onDelete={setDeletingSprint}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {completedSprints.length > 0 && (
                        <section className="pb-8">
                            <button
                                onClick={() => setExpandedCompleted(!expandedCompleted)}
                                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left text-base font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                            >
                                <span>{t('sprint.viewCompleted', { count: completedSprints.length })}</span>
                                <ChevronDown size={18} className={cn("transition-transform duration-300", expandedCompleted ? "rotate-180" : "")} />
                            </button>

                            {expandedCompleted && (
                                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                    {completedSprints.map((sprint) => (
                                        <SprintCard key={sprint.id} sprint={sprint} isPM={isPM} variant="completed" />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </main>

            <CreateEditSprintModal open={showCreate || !!editingSprint} onClose={() => { setShowCreate(false); setEditingSprint(null); }} sprint={editingSprint} />
            <StartSprintModal open={!!startingSprint} onClose={() => setStartingSprint(null)} sprint={startingSprint} />
            <CompleteSprintModal open={showComplete} onClose={() => setShowComplete(false)} sprint={activeSprint} plannedSprints={plannedSprints} />
            <DeleteSprintModal open={!!deletingSprint} onClose={() => setDeletingSprint(null)} sprint={deletingSprint} />
            <ActiveSprintConflictModal open={showActiveSprintConflict} onClose={() => setShowActiveSprintConflict(false)} />
        </div>
    )
}
