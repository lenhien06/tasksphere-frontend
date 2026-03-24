"use client"

import React from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Play, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import type { SprintDetail } from "@/app/types/task.schema"
import { useStartSprint } from "@/hooks/useStartSprint"

export function StartSprintModal({
    projectId,
    open,
    sprint,
    onClose,
    onSuccess,
}: {
    projectId: string
    open: boolean
    sprint: SprintDetail | null
    onClose: () => void
    onSuccess?: () => void
}) {
    const { t } = useTranslation()
    const mutation = useStartSprint(projectId)

    if (!sprint) return null

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="max-w-md rounded-2xl bg-white p-6">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold">
                        {t("backlog.confirmStartTitle", { name: sprint.name })}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center py-2 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-blue-50 text-blue-600 shadow-lg">
                        <Play size={28} className="fill-current" />
                    </div>
                    <div className="w-full space-y-2 rounded-xl bg-gray-50 p-4 text-left text-sm">
                        <div className="flex justify-between text-xs font-semibold uppercase text-gray-400">
                            <span>{t("sprint.workload")}</span>
                            <span className="text-gray-900">
                                {sprint.taskCount} {t("nav.tasks").toLowerCase()}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold uppercase text-gray-400">
                            <span>{t("sprint.duration")}</span>
                            <span className="text-right font-normal capitalize text-gray-700">
                                {new Date(sprint.startDate).toLocaleDateString("vi-VN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })}{" "}
                                –{" "}
                                {new Date(sprint.endDate).toLocaleDateString("vi-VN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </span>
                        </div>
                    </div>
                </div>
                <DialogFooter className="mt-2 flex gap-3 sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold hover:bg-gray-50 sm:flex-initial"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        type="button"
                        disabled={mutation.isPending}
                        onClick={() =>
                            mutation.mutate(sprint.id, {
                                onSuccess: () => {
                                    toast.success(t("sprint.startedSuccess", { name: sprint.name }))
                                    onSuccess?.()
                                    onClose()
                                },
                                onError: (error: unknown) => {
                                    const err = error as {
                                        response?: {
                                            status?: number
                                            data?: { meta?: { message?: string; code?: string } }
                                        }
                                    }
                                    const msg = err?.response?.data?.meta?.message
                                    const code = err?.response?.data?.meta?.code
                                    if (code === "SPR_003" || err?.response?.status === 409) {
                                        toast.error(t("backlog.activeSprintBlockToast"))
                                    } else {
                                        toast.error(msg ?? t("backlog.startSprintError"))
                                    }
                                },
                            })
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 sm:flex-initial"
                    >
                        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t("backlog.startSprint")}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
