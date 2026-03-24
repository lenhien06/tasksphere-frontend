"use client"

import React, { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import type { SprintDetail } from "@/app/types/task.schema"
import { useCompleteSprint } from "@/hooks/useCompleteSprint"

export function CompleteSprintModal({
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
    /** đóng accordion sprint vừa complete */
    onSuccess?: (sprintId: string) => void
}) {
    const { t } = useTranslation()
    const mutation = useCompleteSprint(projectId)

    const doneCount = sprint?.doneCount ?? 0
    const total = sprint?.taskCount ?? 0
    const notDone = useMemo(() => Math.max(0, total - doneCount), [total, doneCount])

    if (!sprint) return null

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="max-w-md rounded-2xl bg-white p-6">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold">
                        {t("backlog.completeSprintTitle", { name: sprint.name })}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 py-2">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                        <p className="text-2xl font-black text-emerald-600">{doneCount}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                            {t("sprint.done")}
                        </p>
                        <p className="mt-1 text-[11px] text-emerald-700">{t("backlog.keepInSprintHint")}</p>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-center">
                        <p className="text-2xl font-black text-amber-600">{notDone}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">
                            {t("sprint.notDone")}
                        </p>
                        <p className="mt-1 text-[11px] text-amber-800">{t("backlog.moveToBacklogHint")}</p>
                    </div>
                </div>
                {notDone > 0 && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                        {t("backlog.completeSprintWarning", { count: notDone })}
                    </p>
                )}
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
                            mutation.mutate(
                                {
                                    sprintId: sprint.id,
                                    body: { unfinishedTasksAction: "backlog" },
                                },
                                {
                                    onSuccess: res => {
                                        const moved = res.report?.movedToBacklog ?? notDone
                                        toast.success(
                                            t("backlog.completeSprintSuccess", { count: moved }),
                                        )
                                        onSuccess?.(sprint.id)
                                        onClose()
                                    },
                                    onError: (err: any) => {
                                        toast.error(
                                            err?.response?.data?.meta?.message ??
                                                err?.response?.data?.message ??
                                                t("backlog.completeSprintError"),
                                        )
                                    },
                                },
                            )
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 sm:flex-initial"
                    >
                        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t("backlog.endSprint")}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
