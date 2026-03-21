"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import {
    Plus, GripVertical, Pencil, Trash2,
    Type, Hash, Calendar, ToggleLeft, List, Eye,
} from "lucide-react"
import type {
    CustomFieldDefinition,
    CustomFieldType,
    CreateCustomFieldRequest,
    UpdateCustomFieldRequest,
} from "@/app/types/task.schema"

// ── Helpers ───────────────────────────────────────────────────

const TYPE_ICON: Record<CustomFieldType, React.ReactNode> = {
    TEXT:    <Type size={15} className="text-gray-500" />,
    NUMBER:  <Hash size={15} className="text-blue-500" />,
    DATE:    <Calendar size={15} className="text-purple-500" />,
    BOOLEAN: <ToggleLeft size={15} className="text-green-600" />,
    SELECT:  <List size={15} className="text-orange-500" />,
}

const TYPE_BADGE: Record<CustomFieldType, string> = {
    TEXT:    "bg-gray-100 text-gray-600",
    NUMBER:  "bg-blue-50 text-blue-600",
    DATE:    "bg-purple-50 text-purple-600",
    BOOLEAN: "bg-green-50 text-green-700",
    SELECT:  "bg-orange-50 text-orange-600",
}

const FIELD_TYPES: CustomFieldType[] = ["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"]

// ── Add/Edit Modal ─────────────────────────────────────────────

interface FieldModalProps {
    projectId: string
    existing?: CustomFieldDefinition
    onClose: () => void
}

function FieldModal({ projectId, existing, onClose }: FieldModalProps) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const qKey = ["custom-fields", projectId]

    const [name, setName] = useState(existing?.name ?? "")
    const [fieldType, setFieldType] = useState<CustomFieldType>(existing?.fieldType ?? "TEXT")
    const [required, setRequired] = useState(existing?.required ?? false)
    const [options, setOptions] = useState<string[]>(existing?.options ?? ["", ""])

    const TYPE_LABELS: Record<CustomFieldType, { label: string; desc: string }> = {
        TEXT:    { label: t('customField.type_TEXT'),    desc: t('customField.typeDesc_TEXT') },
        NUMBER:  { label: t('customField.type_NUMBER'),  desc: t('customField.typeDesc_NUMBER') },
        DATE:    { label: t('customField.type_DATE'),    desc: t('customField.typeDesc_DATE') },
        BOOLEAN: { label: t('customField.type_BOOLEAN'), desc: t('customField.typeDesc_BOOLEAN') },
        SELECT:  { label: t('customField.type_SELECT'),  desc: t('customField.typeDesc_SELECT') },
    }

    const createMutation = useMutation({
        mutationFn: (data: CreateCustomFieldRequest) =>
            TaskService.createCustomField(projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qKey })
            toast.success(t('customField.added'))
            onClose()
        },
        onError: (err: any) => {
            const status = err?.response?.status
            const code   = err?.response?.data?.meta?.code
            if (status === 409 || code === "CF_001") toast.error(t('customField.nameExists'))
            else if (status === 422) toast.error(t('customField.maxFields'))
            else toast.error(t('customField.createError'))
        },
    })

    const updateMutation = useMutation({
        mutationFn: (data: UpdateCustomFieldRequest) =>
            TaskService.updateCustomField(projectId, existing!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qKey })
            toast.success(t('customField.updated'))
            onClose()
        },
        onError: (err: any) => {
            const status = err?.response?.status
            if (status === 422) toast.error(t('customField.typeChangeError'))
            else toast.error(t('customField.updateError'))
        },
    })

    const handleSubmit = () => {
        if (!name.trim()) { toast.error(t('customField.nameRequired')); return }
        if (fieldType === "SELECT") {
            const valid = options.filter(o => o.trim())
            if (valid.length < 2) { toast.error(t('customField.minOptions')); return }
        }
        if (existing) {
            updateMutation.mutate({
                name: name.trim(),
                options: fieldType === "SELECT" ? options.filter(o => o.trim()) : undefined,
                required,
            })
        } else {
            createMutation.mutate({
                name: name.trim(),
                fieldType,
                options: fieldType === "SELECT" ? options.filter(o => o.trim()) : undefined,
                required,
            })
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {existing ? t('customField.editField') : t('customField.addField')}
                    </h2>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider font-medium block mb-1.5">
                            {t('customField.fieldName')} <span className="text-red-400">*</span>
                        </label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            maxLength={100}
                            placeholder={t('customField.fieldNamePlaceholder')}
                            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        />
                    </div>

                    {/* Field Type (disabled when editing) */}
                    {!existing && (
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wider font-medium block mb-2">
                                {t('customField.type')} <span className="text-red-400">*</span>
                            </label>
                            <div className="space-y-2">
                                {FIELD_TYPES.map(type => (
                                    <label
                                        key={type}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                            fieldType === type
                                                ? "border-blue-400 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="fieldType"
                                            value={type}
                                            checked={fieldType === type}
                                            onChange={() => setFieldType(type)}
                                            className="accent-blue-500"
                                        />
                                        <div className="flex items-center gap-2">
                                            {TYPE_ICON[type]}
                                            <span className="text-sm font-medium text-gray-800">
                                                {TYPE_LABELS[type].label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400 ml-auto">
                                            {TYPE_LABELS[type].desc}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Select Options */}
                    {fieldType === "SELECT" && (
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wider font-medium block mb-1.5">
                                {t('customField.options')} <span className="text-red-400">*</span>
                            </label>
                            <div className="space-y-2">
                                {options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            value={opt}
                                            onChange={e => {
                                                const next = [...options]
                                                next[i] = e.target.value
                                                setOptions(next)
                                            }}
                                            placeholder={`${t('customField.option')} ${i + 1}`}
                                            className="flex-1 h-9 px-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400"
                                        />
                                        {options.length > 2 && (
                                            <button
                                                onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={() => setOptions([...options, ""])}
                                    className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                                >
                                    + {t('customField.addOption')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Required */}
                    <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={required}
                            onChange={e => setRequired(e.target.checked)}
                            className="w-4 h-4 rounded accent-blue-500"
                        />
                        <span className="text-sm text-gray-700">{t('common.required')}</span>
                    </label>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="px-4 py-2 text-sm rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-60"
                    >
                        {isPending ? t('common.loading') : existing ? t('common.save') : t('customField.addField')}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Field Row ──────────────────────────────────────────────────

function FieldRow({
    field,
    projectId,
    canEdit,
}: {
    field: CustomFieldDefinition
    projectId: string
    canEdit: boolean
}) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const qKey = ["custom-fields", projectId]
    const [editing, setEditing] = useState(false)

    const TYPE_LABEL: Record<CustomFieldType, string> = {
        TEXT:    t('customField.type_TEXT'),
        NUMBER:  t('customField.type_NUMBER'),
        DATE:    t('customField.type_DATE'),
        BOOLEAN: t('customField.type_BOOLEAN'),
        SELECT:  t('customField.type_SELECT'),
    }

    const deleteMutation = useMutation({
        mutationFn: () => TaskService.deleteCustomField(projectId, field.id),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: qKey })
            if (result.action === "HIDDEN") {
                toast.success(t('customField.fieldHidden'))
            } else {
                toast.success(t('customField.fieldDeleted'))
            }
        },
        onError: () => toast.error(t('customField.deleteError')),
    })

    const showMutation = useMutation({
        mutationFn: () => TaskService.updateCustomField(projectId, field.id, { hidden: false }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qKey })
            toast.success(t('customField.fieldShown'))
        },
    })

    return (
        <>
            <div className={cn(
                "flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl group transition-all hover:border-gray-300",
                field.hidden && "opacity-50"
            )}>
                {canEdit && (
                    <GripVertical size={16} className="text-gray-300 cursor-grab shrink-0" />
                )}
                <div className="shrink-0">{TYPE_ICON[field.fieldType]}</div>
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                    {field.name}
                    {field.required && <span className="text-red-400 ml-1 text-xs">*</span>}
                </span>
                <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0", TYPE_BADGE[field.fieldType])}>
                    {TYPE_LABEL[field.fieldType]}
                </span>
                {field.hidden && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium shrink-0">
                        {t('customField.hidden')}
                    </span>
                )}
                {canEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
                        {field.hidden ? (
                            <button
                                onClick={() => showMutation.mutate()}
                                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                <Eye size={13} /> {t('customField.showAgain')}
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setEditing(true)}
                                    className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    onClick={() => {
                                        if (!confirm(`${t('customField.confirmDelete')} "${field.name}"?`)) return
                                        deleteMutation.mutate()
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {editing && (
                <FieldModal
                    projectId={projectId}
                    existing={field}
                    onClose={() => setEditing(false)}
                />
            )}
        </>
    )
}

// ── Main Component ─────────────────────────────────────────────

interface Props {
    projectId: string
    myRole: string
}

export default function CustomFieldsManager({ projectId, myRole }: Props) {
    const { t } = useTranslation()
    const canEdit = myRole === "PM"
    const [showModal, setShowModal] = useState(false)

    const { data: fields = [], isLoading } = useQuery({
        queryKey: ["custom-fields", projectId],
        queryFn:  () => TaskService.getCustomFields(projectId),
        enabled:  !!projectId,
    })

    const activeFields = fields.filter(f => !f.hidden)
    const hiddenFields = fields.filter(f => f.hidden)
    const count        = activeFields.length
    const atLimit      = count >= 20

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">{t('customField.title')}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{t('customField.desc')}</p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => setShowModal(true)}
                        disabled={atLimit}
                        title={atLimit ? t('customField.maxFields') : undefined}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={16} /> {t('customField.addField')}
                    </button>
                )}
            </div>
            <p className="text-xs text-gray-400 mb-5">{t('customField.usage', { count, max: 20 })}</p>

            {/* Field List */}
            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : fields.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                    {t('customField.empty')}
                </div>
            ) : (
                <div className="space-y-2">
                    {activeFields.map(field => (
                        <FieldRow key={field.id} field={field} projectId={projectId} canEdit={canEdit} />
                    ))}
                    {hiddenFields.length > 0 && (
                        <>
                            <p className="text-xs text-gray-400 uppercase tracking-wider pt-3 pb-1">
                                {t('customField.hiddenFields')}
                            </p>
                            {hiddenFields.map(field => (
                                <FieldRow key={field.id} field={field} projectId={projectId} canEdit={canEdit} />
                            ))}
                        </>
                    )}
                </div>
            )}

            {showModal && (
                <FieldModal
                    projectId={projectId}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    )
}
