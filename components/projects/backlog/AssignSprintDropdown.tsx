"use client"

import React, { useEffect } from "react"
import { useTranslation } from "react-i18next"
import type { SprintDetail } from "@/app/types/task.schema"

/** Chỉ sprint PLANNED — không gán trực tiếp vào ACTIVE từ backlog (BR-20). */
export function AssignSprintDropdown({
    sprintOptions,
    onAssign,
    onClose,
}: {
    sprintOptions: SprintDetail[]
    onAssign: (sprintId: string) => void
    onClose: () => void
}) {
    const { t } = useTranslation()
    useEffect(() => {
        const handleClickOutside = () => onClose()
        document.addEventListener("click", handleClickOutside)
        return () => document.removeEventListener("click", handleClickOutside)
    }, [onClose])

    return (
        <div
            className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl"
            onClick={e => e.stopPropagation()}
        >
            <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t("backlog.assignToSprint")}
            </p>
            {sprintOptions.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-slate-400">
                    {t("backlog.noPlannedSprintsForAssign")}
                </p>
            ) : (
                sprintOptions.map(sprint => (
                    <button
                        key={sprint.id}
                        type="button"
                        onClick={() => onAssign(sprint.id)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50"
                        style={{ color: "#0f172a" }}
                    >
                        <span className={sprint.status === "ACTIVE" ? "h-2 w-2 shrink-0 rounded-full bg-emerald-500" : "h-2 w-2 shrink-0 rounded-full bg-slate-400"} />
                        <span className="min-w-0 flex-1 truncate font-semibold" style={{ color: "#0f172a" }}>
                            {sprint.name}
                        </span>
                        <span
                            className={
                                sprint.status === "ACTIVE"
                                    ? "shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700"
                                    : "shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                            }
                        >
                            {sprint.status}
                        </span>
                    </button>
                ))
            )}
        </div>
    )
}
