"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, Bug, Link2 } from "lucide-react"
import type { AxiosError } from "axios"
import { Modal, FieldLabel, InputStyled, PrimaryButton, SecondaryButton } from "@/components/projects/ProjectModals"
import { TaskService } from "@/app/services/TaskService"
import type { TaskResponse } from "@/app/types/task.schema"
import { cn } from "@/lib/utils"
import { hasTestingSkill } from "@/lib/skillRules"

export interface BugCreationDialogProps {
  open: boolean
  onClose: () => void
  parentTask: TaskResponse | null
  projectId: string
  onBugCreated?: () => void
  userSkills?: string[]
  allowWithoutTestingSkill?: boolean
}

const PRIORITY_COLORS = {
  CRITICAL: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  HIGH: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  MEDIUM: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  LOW: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
}

export default function BugCreationDialog({
  open,
  onClose,
  parentTask,
  projectId,
  onBugCreated,
  userSkills = [],
  allowWithoutTestingSkill = false,
}: BugCreationDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const canCreateBug = allowWithoutTestingSkill || hasTestingSkill(userSkills)
  const { data: parentTaskDetail } = useQuery({
    queryKey: ["task", projectId, parentTask?.id],
    queryFn: () => TaskService.getTaskById(projectId, parentTask!.id),
    enabled: open && !!projectId && !!parentTask?.id,
    staleTime: 15_000,
  })

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">("HIGH")
  const [assigneeId, setAssigneeId] = useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setTitle("")
      setDescription("")
      setPriority("HIGH")
      setAssigneeId(null)
    }
  }, [open])

  const createBugMutation = useMutation({
    mutationFn: async () => {
      if (!parentTask) throw new Error("Parent task not found")

      // 1. Tạo bug ticket với parentTaskId
      const bugTask = await TaskService.createTask(projectId, {
        title: title.trim(),
        description,
        type: "BUG",
        priority,
        assigneeId: assigneeId || parentTaskDetail?.task.assignee?.id || undefined,
        sprintId: parentTaskDetail?.task.sprint?.id,
      })
      await TaskService.addDependency(bugTask.id, parentTask.id, "RELATES_TO")

      // 2. Revert parent task về "In Progress"
      await TaskService.updateStatus(projectId, parentTask.id, {
        status: "IN_PROGRESS",
      })

      return bugTask
    },
    onSuccess: (bugTask) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      queryClient.invalidateQueries({ queryKey: ["task", projectId, parentTask?.id] })
      queryClient.invalidateQueries({ queryKey: ["task", projectId, bugTask.id] })
      queryClient.invalidateQueries({ queryKey: ["dependencies", parentTask?.id] })
      toast.success(
        t("bug.createdSuccess", {
          defaultValue: `🐛 Created bug ticket ${bugTask.taskCode}`,
        })
      )
      onBugCreated?.()
      onClose()
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ meta?: { message: string }; message?: string }>
      toast.error(
        axiosError?.response?.data?.meta?.message ??
          axiosError?.response?.data?.message ??
          t("bug.createError", { defaultValue: "Failed to create bug" })
      )
    },
  })

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error(t("bug.titleRequired", { defaultValue: "Bug title is required" }))
      return
    }

    createBugMutation.mutate()
  }

  if (!parentTask) return null

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t("bug.report", { defaultValue: "🐛 Report Bug" })}
      maxWidth="max-w-lg"
    >
      {!canCreateBug ? (
        <div className="flex flex-col items-center text-center py-8">
          <AlertTriangle size={40} className="text-red-500 mb-4" />
          <p className="text-lg font-bold text-gray-900 mb-2">
            {t("bug.permissionDenied", { defaultValue: "Permission Denied" })}
          </p>
          <p className="text-sm text-gray-600 mb-6">
            {t("bug.qaSkillRequired", {
              defaultValue: "Only team members with QA/Testing skills can create bug reports.",
            })}
          </p>
          <SecondaryButton onClick={onClose}>{t("common.close")}</SecondaryButton>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Parent Task Link Info */}
          <div className={cn(
            "flex items-start gap-3 p-4 rounded-xl border-2",
            "bg-amber-50 border-amber-200"
          )}>
            <div className="flex-shrink-0 mt-0.5">
              <Link2 size={18} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                {t("bug.linkedTo", { defaultValue: "Linked to" })}
              </p>
              <p className="text-sm font-bold text-amber-900">{parentTask.taskCode}</p>
              <p className="text-sm text-amber-800 mt-0.5 line-clamp-2">{parentTask.title}</p>
            </div>
          </div>

          {/* Warning */}
          <div className={cn(
            "flex items-start gap-3 p-3 rounded-xl border-2",
            "bg-red-50 border-red-200"
          )}>
            <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">
              {t("bug.revertWarning", {
                defaultValue:
                  "Creating this bug will automatically move the parent task back to 'In Progress' for the developer to fix.",
              })}
            </p>
          </div>

          {/* BUG Title */}
          <div>
            <FieldLabel required>{t("bug.title", { defaultValue: "Bug Title" })}</FieldLabel>
            <InputStyled
              placeholder={t("bug.titlePlaceholder", {
                defaultValue: "e.g., Login button not clickable on mobile",
              })}
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel>{t("bug.description", { defaultValue: "Description" })}</FieldLabel>
            <textarea
              className="w-full min-h-[120px] p-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none"
              placeholder={t("bug.descriptionPlaceholder", {
                defaultValue: "Steps to reproduce, expected behavior, actual behavior...",
              })}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
            <p className="text-xs text-gray-500 mt-1">{description.length} / 2000</p>
          </div>

          {/* Priority */}
          <div>
            <FieldLabel required>{t("bug.priority", { defaultValue: "Priority" })}</FieldLabel>
            <div className="grid grid-cols-4 gap-2">
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "py-2 px-3 rounded-lg border-2 font-bold text-sm transition-all",
                    priority === p
                      ? `${PRIORITY_COLORS[p].bg} ${PRIORITY_COLORS[p].border} border-2`
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  {t(`priority.${p.toLowerCase()}`, { defaultValue: p })}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <SecondaryButton onClick={onClose}>{t("common.cancel")}</SecondaryButton>
            <PrimaryButton
              onClick={handleSubmit}
              loading={createBugMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              <Bug size={16} className="mr-2" />
              {t("bug.create", { defaultValue: "Create Bug" })}
            </PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  )
}
