"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { TaskService } from "@/app/services/TaskService"
import type { CreateSprintRequest } from "@/app/types/task.schema"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

function getDurationDays(startDate: string, endDate: string) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diff = end.getTime() - start.getTime()
    return Number.isNaN(diff) ? 0 : Math.floor(diff / 86400000) + 1
}

export function CreateSprintModal({
    projectId,
    open,
    onClose,
}: {
    projectId: string
    open: boolean
    onClose: () => void
}) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()

    const [name, setName] = useState("")
    const [goal, setGoal] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    useEffect(() => {
        if (!open) return
        setName("")
        setGoal("")
        setStartDate("")
        setEndDate("")
    }, [open])

    const durationDays = useMemo(() => {
        if (!startDate || !endDate) return 0
        return getDurationDays(startDate, endDate)
    }, [startDate, endDate])

    const createMutation = useMutation({
        mutationFn: (payload: CreateSprintRequest) => TaskService.createSprint(projectId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
            toast.success(t("sprint.created"))
            onClose()
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.meta?.message ?? err?.response?.data?.message ?? t("backlog.createSprintError"))
        },
    })

    const handleSubmit = () => {
        if (!name.trim() || !startDate || !endDate) {
            toast.error(t("sprint.fillRequired"))
            return
        }

        if (endDate < startDate) {
            toast.error(t("sprint.endAfterStart"))
            return
        }

        createMutation.mutate({
            name: name.trim(),
            goal: goal.trim() || undefined,
            startDate,
            endDate,
        })
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="max-w-md rounded-[28px] border-0 bg-white p-0 shadow-2xl">
                <div className="px-6 py-5">
                    <DialogHeader className="space-y-1 text-left">
                        <DialogTitle className="text-[28px] font-extrabold tracking-tight text-slate-950">
                            {t("sprint.create")}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">
                            {t("sprint.createDesc")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-6 space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-800">
                                {t("sprint.name")} <span className="text-red-500">*</span>
                            </label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t("sprint.namePlaceholder")}
                                maxLength={100}
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-800">
                                {t("sprint.goal")} ({t("common.optional").toLowerCase()})
                            </label>
                            <textarea
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                placeholder={t("sprint.goalPlaceholder")}
                                maxLength={500}
                                className="min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-800">
                                    {t("sprint.startDate")} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-800">
                                    {t("sprint.endDate")} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                />
                            </div>
                        </div>

                        {durationDays > 0 && (
                            <div className="inline-flex rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                                {t("sprint.estimated")}: {durationDays} {t("sprint.days")}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-7 flex gap-3 sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={createMutation.isPending}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t("sprint.create")}
                        </button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}
