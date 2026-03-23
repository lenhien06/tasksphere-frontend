"use client"

import React from "react"
import { Bug, CheckSquare, BookOpen, Zap, Subtitles, MoreHorizontal, Trash2, X, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import TaskDetailTabs from "@/components/task-detail/TaskDetailTabs"
import { STATUS_CONFIG } from "@/components/task-detail/config"
import SubTaskSection from "@/components/task-detail/SubTaskSection"
import DependencySection from "@/components/task-detail/DependencySection"
import RecurringSection from "@/components/task-detail/RecurringSection"
import CustomFieldSection from "@/components/task-detail/CustomFieldSection"
import TaskMetaGrid from "@/components/task-detail/TaskMetaGrid"
import TaskDescription from "@/components/task-detail/TaskDescription"
import { useTaskWebSocket } from "@/hooks/useTaskWebSocket"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/useAuthStore"

import { SubtaskBlockedDialog } from "@/components/kanban/SubtaskBlockedDialog"
import { TaskDetailService } from "@/app/services/TaskDetailService"
import type { SubTaskResponse } from "@/app/types/task.schema"

// ── Page skeleton ──────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="h-full p-5 space-y-4 animate-pulse bg-white">
            <div className="h-9 bg-slate-100 rounded-lg w-full" />
            <div className="h-10 bg-slate-100 rounded-lg w-2/3" />
            <div className="h-44 bg-slate-100 rounded-xl w-full" />
            <div className="h-12 bg-slate-100 rounded-xl w-full" />
            <div className="h-32 bg-slate-100 rounded-xl w-full" />
        </div>
    )
}

// ── Main component ─────────────────────────────────────────

interface TaskDetailPageContentProps {
    projectId: string
    taskId: string
    currentUserRole: "PM" | "MEMBER" | "VIEWER"
    onClose?: () => void
}

const STATUS_OPTIONS = [
    { value: "TODO", label: "To Do", color: "bg-gray-100 text-gray-700" },
    { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-100 text-blue-700" },
    { value: "IN_REVIEW", label: "In Review", color: "bg-purple-100 text-purple-700" },
    { value: "DONE", label: "Done", color: "bg-green-100 text-green-700" },
    { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-700" },
] as const

// BR-14: IN_PROGRESS → IN_REVIEW only (not directly to DONE)
const VALID_TRANSITIONS: Record<string, string[]> = {
    TODO: ["IN_PROGRESS"],
    IN_PROGRESS: ["IN_REVIEW"],
    IN_REVIEW: ["IN_PROGRESS", "DONE"],
    DONE: [],
    CANCELLED: [],
}

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export default function TaskDetailPageContent({
    projectId,
    taskId,
    currentUserRole,
    onClose,
}: TaskDetailPageContentProps) {
    // ... (rest of logic remains same)

    const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
        BUG:      { icon: Bug,         color: "text-rose-600",   bg: "bg-rose-50" },
        TASK:     { icon: CheckSquare, color: "text-blue-600",   bg: "bg-blue-50" },
        STORY:    { icon: BookOpen,    color: "text-emerald-600", bg: "bg-emerald-50" },
        EPIC:     { icon: Zap,         color: "text-violet-600",  bg: "bg-violet-50" },
        SUB_TASK: { icon: Subtitles,   color: "text-sky-600",     bg: "bg-sky-50" },
        FEATURE:  { icon: Zap,         color: "text-amber-600",   bg: "bg-amber-50" },
    }
    const tCfg = typeConfig[task.type.toUpperCase()] || typeConfig.TASK
    const TypeIcon = tCfg.icon

    return (
        <div className={cn("bg-white", onClose ? "flex flex-col h-full" : "flex flex-col min-h-screen")}>
            <div className={cn("px-8 py-6 flex-1", onClose ? "overflow-y-auto" : "")}>
                
                {/* Professional Jira-style Header */}
                <div className="flex items-start justify-between gap-6 mb-8">
                    <div className="flex-1 min-w-0">
                        {/* Breadcrumb row: Key + Actions */}
                        <div className="flex items-center gap-2 mb-3 text-[13px] font-medium text-slate-500">
                            <div className={cn("p-1 rounded-md", tCfg.bg)}>
                                <TypeIcon size={14} className={tCfg.color} />
                            </div>
                            <span className="hover:underline cursor-pointer transition-all">{task.taskCode}</span>
                            <span>/</span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200 uppercase tracking-tight">
                                <Link2 size={10} /> Link Issue
                            </div>
                        </div>

                        {/* Title Row */}
                        {editingTitle && canEdit ? (
                            <textarea
                                autoFocus
                                className="w-full text-2xl font-bold leading-tight text-slate-900 resize-none border-0 outline-none focus:ring-2 focus:ring-blue-100 rounded-lg p-1 -ml-1 bg-slate-50"
                                value={titleDraft}
                                rows={1}
                                onChange={(e) => setTitleDraft(e.target.value)}
                                onBlur={() => {
                                    const trimmed = titleDraft.trim()
                                    if (trimmed && trimmed !== task.title) updateTitle.mutate(trimmed)
                                    setEditingTitle(false)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault()
                                        const trimmed = titleDraft.trim()
                                        if (trimmed && trimmed !== task.title) updateTitle.mutate(trimmed)
                                        setEditingTitle(false)
                                    }
                                    if (e.key === "Escape") setEditingTitle(false)
                                }}
                            />
                        ) : (
                            <h1
                                className={cn(
                                    "text-2xl font-bold leading-tight text-slate-900 break-words tracking-tight",
                                    canEdit && "cursor-pointer hover:bg-slate-50 rounded-lg p-1 -mx-1 transition-colors"
                                )}
                                onClick={() => {
                                    if (canEdit) { setTitleDraft(task.title); setEditingTitle(true) }
                                }}
                            >
                                {task.title}
                            </h1>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-1">
                        {canDelete && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
                                        <MoreHorizontal size={20} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 p-1.5 rounded-xl border-slate-200 shadow-xl">
                                    <DropdownMenuItem
                                        className="text-rose-600 font-semibold focus:text-rose-600 focus:bg-rose-50 rounded-lg cursor-pointer"
                                        onClick={() => {
                                            if (confirm("Tất cả sub-task sẽ bị xóa theo. Bạn có chắc chắn muốn xóa task này?")) deleteTask.mutate()
                                        }}
                                        disabled={deleteTask.isPending}
                                    >
                                        <Trash2 size={16} className="mr-2" /> Xóa task
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all" onClick={handleClose}>
                            <X size={22} />
                        </Button>
                    </div>
                </div>

                {/* Rest of the content */}
                <div className="mb-8">
                    <TaskMetaGrid task={task} projectId={projectId} canEdit={canEdit} etag={data.etag} />
                </div>

                {/* Description block */}
                <div className="mb-6">
                    <TaskDescription task={task} projectId={projectId} canEdit={canEdit} />
                </div>

                {/* Accordion sections */}
                <Accordion type="multiple" defaultValue={["subtasks", "dependencies"]} className="space-y-1">
                    <AccordionItem value="subtasks" className="border-0">
                        <AccordionTrigger className="hover:no-underline py-2 text-sm font-bold text-slate-900 group">
                            <span className="flex items-center gap-2">
                                Sub-tasks ({task.subtaskDone}/{task.subtaskCount})
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                             <SubTaskSection task={task} projectId={projectId} canEdit={canEdit} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="dependencies" className="border-0">
                        <AccordionTrigger className="hover:no-underline py-2 text-sm font-bold text-slate-900 group">
                            Dependencies
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                            <DependencySection taskId={task.id} projectId={projectId} canEdit={canEdit} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="recurrence" className="border-0">
                        <AccordionTrigger className="hover:no-underline py-2 text-sm font-bold text-slate-900 group">
                            Recurrence
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                            <RecurringSection taskId={task.id} projectId={projectId} isRecurring={task.recurring ?? false} canEdit={canEdit} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="custom-fields" className="border-0">
                        <AccordionTrigger className="hover:no-underline py-2 text-sm font-bold text-slate-900 group">
                            Custom Fields
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                            <CustomFieldSection
                                projectId={projectId}
                                taskId={taskId}
                                definitions={customFieldDefs}
                                values={task.customFieldValues || []}
                                canEdit={canEdit}
                                canManage={isAdminOrPM}
                            />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {/* Tabs section */}
                <div className="mt-8">
                    <TaskDetailTabs task={task} projectId={projectId} currentUserRole={currentUserRole} />
                </div>
            </div>

            {blockedDialog?.open && (
                <SubtaskBlockedDialog
                    open={blockedDialog.open}
                    taskTitle={blockedDialog.taskTitle}
                    pendingSubtasks={blockedDialog.pendingSubtasks}
                    onClose={() => setBlockedDialog(null)}
                    onViewSubtasks={scrollToSubtasks}
                />
            )}
        </div>
    )
}
