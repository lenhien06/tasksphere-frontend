"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import {
    GripVertical, Pencil, Trash2, Plus, X, Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TaskService } from "@/app/services/TaskService"
import type { ColumnResponse, TaskStatus, CreateColumnRequest } from "@/app/types/task.schema"

// ════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════

const PRESET_COLORS = [
    "#8C8C8C", "#1677FF", "#52C41A", "#FA8C16", "#FF4D4F",
    "#722ED1", "#13C2C2", "#EB2F96", "#FADB14", "#2F54EB",
]

const MAPPED_STATUS_OPTIONS: { value: TaskStatus }[] = [
    { value: "TODO" },
    { value: "IN_PROGRESS" },
    { value: "READY_FOR_TEST" },
    { value: "TESTING" },
    { value: "IN_REVIEW" },
    { value: "DONE" },
]

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

// ════════════════════════════════════════
// ERROR HANDLER
// ════════════════════════════════════════

function handleApiError(error: unknown, action: string) {
    const err = error as { response?: { status?: number; data?: { meta?: { message?: string } } } }
    const status  = err?.response?.status
    const message = err?.response?.data?.meta?.message
    const map: Record<number, string> = {
        400: `Invalid data: ${message ?? ""}`,
        403: "You do not have permission to perform this action",
        404: "Data not found",
        409: message ?? "Data already exists",
        422: message ?? "Business rule violation",
    }
    toast.error(map[status ?? 0] ?? `Error while ${action}`)
}

// ════════════════════════════════════════
// COLOR PICKER
// ════════════════════════════════════════

function ColorPicker({
    value,
    onChange,
}: {
    value: string
    onChange: (hex: string) => void
}) {
    const [hexInput, setHexInput] = useState(value)

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => { onChange(c); setHexInput(c) }}
                        className={cn(
                            "w-8 h-8 rounded-full cursor-pointer border-2 transition-all",
                            value === c ? "ring-2 ring-offset-2 ring-blue-500 border-white" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-gray-200 shrink-0" style={{ backgroundColor: HEX_REGEX.test(hexInput) ? hexInput : value }} />
                <input
                    value={hexInput}
                    onChange={e => {
                        setHexInput(e.target.value)
                        if (HEX_REGEX.test(e.target.value)) onChange(e.target.value)
                    }}
                    className="flex-1 h-8 border border-gray-200 rounded-lg px-2 text-sm font-mono"
                    placeholder="#1677FF"
                />
            </div>
        </div>
    )
}

// ════════════════════════════════════════
// SORTABLE ROW
// ════════════════════════════════════════

function SortableColumnRow({
    column,
    canEdit,
    onRename,
    onColorChange,
    onDelete,
}: {
    column: ColumnResponse
    canEdit: boolean
    onRename: (id: string, name: string) => void
    onColorChange: (id: string, color: string) => void
    onDelete: (column: ColumnResponse) => void
}) {
    const { t } = useTranslation()
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: column.id,
        disabled: !canEdit,
    })
    const style = { transition, transform: CSS.Translate.toString(transform) }

    const [isEditing, setIsEditing]       = useState(false)
    const [nameInput, setNameInput]       = useState(column.name)
    const [showColorPicker, setShowColorPicker] = useState(false)

    const colColor = column.colorHex ?? "#94A3B8"

    const commitRename = () => {
        const trimmed = nameInput.trim()
        if (trimmed && trimmed !== column.name) onRename(column.id, trimmed)
        setIsEditing(false)
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-white transition-shadow group",
                isDragging && "shadow-lg opacity-80"
            )}
        >
            {/* Drag handle */}
            {canEdit && (
                <button {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 shrink-0">
                    <GripVertical size={16} />
                </button>
            )}

            {/* Color swatch */}
            <div className="relative shrink-0">
                <button
                    type="button"
                    onClick={() => canEdit && setShowColorPicker(p => !p)}
                    className={cn("w-7 h-7 rounded-lg border border-gray-200 transition-all", canEdit && "hover:ring-2 hover:ring-offset-1 hover:ring-blue-300")}
                    style={{ backgroundColor: colColor }}
                />
                {showColorPicker && canEdit && (
                    <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-[220px]">
                        <ColorPicker
                            value={colColor}
                            onChange={hex => onColorChange(column.id, hex)}
                        />
                        <button
                            onClick={() => setShowColorPicker(false)}
                            className="mt-2 text-xs text-gray-400 hover:text-gray-600"
                        >
                            {t('common.close')}
                        </button>
                    </div>
                )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input
                        autoFocus
                        value={nameInput}
                        maxLength={50}
                        onChange={e => setNameInput(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => {
                            if (e.key === "Enter") commitRename()
                            if (e.key === "Escape") { setIsEditing(false); setNameInput(column.name) }
                        }}
                        className="w-full text-sm border-b border-blue-300 outline-none bg-transparent font-medium"
                    />
                ) : (
                    <span className="text-sm font-semibold text-gray-800 truncate">{column.name}</span>
                )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
                {column.isDefault && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{t('columns.default')}</span>
                )}
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{column.taskCount} {t('nav.tasks').toLowerCase()}</span>
            </div>

            {/* Actions */}
            {canEdit && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        title={t('common.edit')}
                    >
                        <Pencil size={13} />
                    </button>
                    <button
                        onClick={() => !column.isDefault && onDelete(column)}
                        disabled={column.isDefault}
                        title={column.isDefault ? t('columns.cannotDeleteDefault') : t('columns.deleteColumn', { name: column.name })}
                        className={cn(
                            "p-1 rounded-lg transition-all",
                            column.isDefault
                                ? "text-gray-200 cursor-not-allowed"
                                : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                        )}
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            )}
        </div>
    )
}

// ════════════════════════════════════════
// ADD COLUMN MODAL
// ════════════════════════════════════════

function AddColumnModal({
    onClose,
    onSubmit,
    isPending,
}: {
    onClose: () => void
    onSubmit: (data: CreateColumnRequest) => void
    isPending: boolean
}) {
    const { t } = useTranslation()
    const [name, setName]             = useState("")
    const [colorHex, setColorHex]     = useState("#1677FF")
    const [mappedStatus, setMappedStatus] = useState<TaskStatus>("IN_PROGRESS")

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-bold text-gray-900">{t('columns.addNew')}</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Preview */}
                    <div
                        className="h-8 rounded-lg flex items-center px-3 text-white text-sm font-bold transition-all"
                        style={{ backgroundColor: colorHex }}
                    >
                        {name || t('columns.namePlaceholder')}
                    </div>

                    {/* Name */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                            {t('columns.name')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            autoFocus
                            value={name}
                            maxLength={50}
                            onChange={e => setName(e.target.value)}
                            placeholder={t('columns.nameInputPlaceholder')}
                            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                        />
                        <div className="text-[11px] text-gray-400 text-right mt-1">{name.length}/50</div>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{t('columns.color')}</label>
                        <ColorPicker value={colorHex} onChange={setColorHex} />
                    </div>

                    {/* Mapped Status */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">{t('columns.type')}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {MAPPED_STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setMappedStatus(opt.value)}
                                    className={cn(
                                        "h-9 text-sm font-medium rounded-lg border transition-all",
                                        mappedStatus === opt.value
                                            ? "border-blue-500 bg-blue-50 text-blue-700"
                                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    {t(`task.status_${opt.value}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="h-9 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={() => onSubmit({ name: name.trim(), colorHex, mappedStatus })}
                        disabled={!name.trim() || isPending}
                        className="h-9 px-4 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isPending ? t('columns.adding') : t('columns.add')}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════

export interface CustomColumnsManagerProps {
    projectId: string
    currentUserRole: "PM" | "MEMBER" | "VIEWER"
    onColumnsChange?: (columns: ColumnResponse[]) => void
    onClose?: () => void
}

export default function CustomColumnsManager({
    projectId,
    currentUserRole,
    onColumnsChange,
    onClose,
}: CustomColumnsManagerProps) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const canEdit = currentUserRole === "PM"
    const qKey = ["columns", projectId]

    const [showAddModal, setShowAddModal]   = useState(false)
    const [localOrder, setLocalOrder]       = useState<ColumnResponse[] | null>(null)

    const { data: columns = [], isLoading } = useQuery({
        queryKey: qKey,
        queryFn: () => TaskService.getColumns(projectId),
        enabled: !!projectId,
    })

    const displayColumns = localOrder ?? columns

    const sensors = useSensors(useSensor(PointerSensor))

    // ── Mutations ──────────────────────────────────

    const createMutation = useMutation({
        mutationFn: (data: CreateColumnRequest) => TaskService.createColumn(projectId, data),
        onSuccess: (newCol) => {
            queryClient.invalidateQueries({ queryKey: qKey })
            setShowAddModal(false)
            toast.success(t('columns.addedSuccess', { name: newCol.name }))
        },
        onError: (error: unknown) => {
            const err = error as { response?: { status?: number } }
            if (err?.response?.status === 409) toast.error(t('columns.nameExists'))
            else if (err?.response?.status === 400) toast.error(t('columns.invalidColor'))
            else handleApiError(error, "adding column")
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: { name?: string; colorHex?: string } }) =>
            TaskService.updateColumn(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
        onError: (e) => handleApiError(e, "updating column"),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => TaskService.deleteColumn(id),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: qKey })
            toast.success(t('columns.deletedSuccess', { count: result.movedTaskCount, column: result.movedToColumn }))
            const updated = columns.filter(c => c.id !== (deleteMutation.variables as string))
            onColumnsChange?.(updated)
        },
        onError: (e) => handleApiError(e, "deleting column"),
    })

    const reorderMutation = useMutation({
        mutationFn: (orderedIds: string[]) => TaskService.reorderColumns(projectId, orderedIds),
        onError: (e) => handleApiError(e, "reordering columns"),
    })

    // ── DnD ────────────────────────────────────────

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const base = localOrder ?? columns
        const oldIdx = base.findIndex(c => c.id === active.id)
        const newIdx = base.findIndex(c => c.id === over.id)
        const newOrder = arrayMove(base, oldIdx, newIdx)
        setLocalOrder(newOrder)
        reorderMutation.mutate(newOrder.map(c => c.id))
    }

    const handleDelete = (column: ColumnResponse) => {
        if (!window.confirm(t('columns.confirmDelete', { name: column.name, count: column.taskCount }))) return
        deleteMutation.mutate(column.id)
    }

    const handleRename = (id: string, name: string) => {
        updateMutation.mutate({ id, data: { name } })
    }

    const handleColorChange = (id: string, colorHex: string) => {
        updateMutation.mutate({ id, data: { colorHex } })
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">{t('columns.management')}</h2>
                <div className="flex items-center gap-2">
                    {canEdit && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-1.5 h-8 px-3 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                        >
                            <Plus size={14} /> {t('columns.add')}
                        </button>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Column list */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={displayColumns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {displayColumns.map(col => (
                                    <SortableColumnRow
                                        key={col.id}
                                        column={col}
                                        canEdit={canEdit}
                                        onRename={handleRename}
                                        onColorChange={handleColorChange}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Add modal */}
            {showAddModal && (
                <AddColumnModal
                    onClose={() => setShowAddModal(false)}
                    onSubmit={(data) => createMutation.mutate(data)}
                    isPending={createMutation.isPending}
                />
            )}
        </div>
    )
}
