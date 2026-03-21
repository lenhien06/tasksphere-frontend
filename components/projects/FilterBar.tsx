"use client"

import React, { useState, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Bookmark, Trash2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { TaskService } from "@/app/services/TaskService"
import type { SavedFilter, TaskFilterParams } from "@/app/types/task.schema"

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════

// Note: timeAgo uses static strings; t() is available inside the component for the dropdown strings
function timeAgo(dateStr: string): string {
    const diff  = Date.now() - new Date(dateStr).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins < 1)   return "Just now"
    if (mins < 60)  return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return "Yesterday"
    return new Date(dateStr).toLocaleDateString()
}

function isFilterActive(filter: TaskFilterParams): boolean {
    return !!(filter.status || filter.assigneeId || filter.sprintId || filter.priority || filter.type || filter.q || filter.overdue)
}

// ════════════════════════════════════════
// SAVED FILTERS DROPDOWN
// ════════════════════════════════════════

export interface SavedFiltersDropdownProps {
    projectId: string
    currentFilter: TaskFilterParams
    onApplyFilter: (filter: TaskFilterParams) => void
}

export function SavedFiltersDropdown({
    projectId,
    currentFilter,
    onApplyFilter,
}: SavedFiltersDropdownProps) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const qKey = ["saved-filters", projectId]

    const [isOpen,        setIsOpen]        = useState(false)
    const [filterName,    setFilterName]    = useState("")
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("click", handler)
        return () => document.removeEventListener("click", handler)
    }, [])

    const { data: savedFilters = [] } = useQuery<SavedFilter[]>({
        queryKey: qKey,
        queryFn: () => TaskService.getSavedFilters(projectId),
        enabled: !!projectId,
    })

    const createMutation = useMutation({
        mutationFn: () => TaskService.createSavedFilter(projectId, {
            name: filterName.trim(),
            filterCriteria: currentFilter as Record<string, unknown>,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qKey })
            setFilterName("")
            toast.success(t('filter.saved'))
        },
        onError: (error: unknown) => {
            const err = error as { response?: { status?: number } }
            if (err?.response?.status === 422) toast.error(t('filter.maxFilters'))
            else toast.error(t('filter.saveError'))
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => TaskService.deleteSavedFilter(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qKey })
            toast.success(t('filter.deleted'))
        },
        onError: () => toast.error(t('filter.deleteError')),
    })

    const applyFilter = (saved: SavedFilter) => {
        onApplyFilter(saved.filterCriteria as TaskFilterParams)
        setIsOpen(false)
        toast.success(t('filter.applied', { name: saved.name }))
    }

    const hasActiveFilter = isFilterActive(currentFilter)
    const count = savedFilters.length

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(p => !p)}
                className={cn(
                    "flex items-center gap-2 h-[40px] px-3 border rounded-xl text-[14px] font-semibold transition-all shadow-sm",
                    count > 0
                        ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                )}
            >
                <Bookmark className="w-4 h-4" />
                <span className="hidden sm:inline">{t('filter.saved')}</span>
                {count > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                        {count}
                    </span>
                )}
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-[260px] bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
                    {/* Header */}
                    <div className="px-3 py-2.5 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t('filter.savedFilters')}</p>
                    </div>

                    {/* Saved filter list */}
                    <div className="max-h-[200px] overflow-y-auto">
                        {savedFilters.length === 0 ? (
                            <p className="px-3 py-4 text-xs text-gray-400 text-center">{t('filter.noSavedFilters')}</p>
                        ) : (
                            savedFilters.map(f => (
                                <div
                                    key={f.id}
                                    className="flex items-center gap-2 px-3 h-9 hover:bg-gray-50 group cursor-pointer"
                                    onClick={() => applyFilter(f)}
                                >
                                    <Bookmark className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
                                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(f.createdAt)}</span>
                                    <button
                                        onClick={e => { e.stopPropagation(); deleteMutation.mutate(f.id) }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all rounded"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* Save current filter */}
                    <div className="px-3 py-2.5">
                        {hasActiveFilter ? (
                            <div className="flex items-center gap-2">
                                <input
                                    value={filterName}
                                    onChange={e => setFilterName(e.target.value)}
                                    placeholder={t('filter.nameFilter')}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && filterName.trim()) createMutation.mutate()
                                    }}
                                    className="flex-1 h-8 border border-gray-200 rounded-lg px-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                />
                                <button
                                    onClick={() => filterName.trim() && createMutation.mutate()}
                                    disabled={!filterName.trim() || createMutation.isPending}
                                    className="h-8 w-8 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shrink-0"
                                    title={t('filter.saveFilter')}
                                >
                                    💾
                                </button>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 text-center py-1">
                                {t('filter.noActiveFilters')}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ════════════════════════════════════════
// FILTER BAR (container with saved filters)
// ════════════════════════════════════════

export interface FilterBarProps {
    projectId: string
    filter: TaskFilterParams
    onFilterChange: (filter: TaskFilterParams) => void
}

export function FilterBar({ projectId, filter, onFilterChange }: FilterBarProps) {
    return (
        <div className="flex items-center gap-2">
            <SavedFiltersDropdown
                projectId={projectId}
                currentFilter={filter}
                onApplyFilter={onFilterChange}
            />
        </div>
    )
}

export default FilterBar
