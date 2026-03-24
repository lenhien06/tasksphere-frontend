"use client"

import React, { useEffect } from "react"
import { useTranslation } from "react-i18next"
import type { SprintDetail } from "@/app/types/task.schema"

/** Chỉ sprint PLANNED — không gán trực tiếp vào ACTIVE từ backlog (BR-20). */
export function AssignSprintDropdown({
    plannedSprints,
    onAssign,
    onClose,
}: {
    plannedSprints: SprintDetail[]
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
            className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
            onClick={e => e.stopPropagation()}
        >
            <p className="border-b border-gray-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {t("backlog.assignToSprint")}
            </p>
            {plannedSprints.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-gray-400">
                    {t("backlog.noPlannedSprintsForAssign")}
                </p>
            ) : (
                plannedSprints.map(sprint => (
                    <button
                        key={sprint.id}
                        type="button"
                        onClick={() => onAssign(sprint.id)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50"
                    >
                        <span className="h-2 w-2 shrink-0 rounded-full bg-gray-400" />
                        <span className="min-w-0 flex-1 truncate font-medium text-gray-800">{sprint.name}</span>
                    </button>
                ))
            )}
        </div>
    )
}
