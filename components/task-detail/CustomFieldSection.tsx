"use client"

import React, { useState, useEffect } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Type, Hash, Calendar, CheckSquare, List,
  Layers, Link as LinkIcon, Settings, Pencil, X, Loader2
} from "lucide-react"
import type { 
  CustomFieldDefinition, 
  CustomFieldValue, 
  CustomFieldType 
} from "@/app/types/task.schema"

interface Props {
  projectId: string
  taskId: string
  definitions: CustomFieldDefinition[]
  values: CustomFieldValue[]
  canEdit: boolean
  canManage: boolean
  className?: string
}

const TYPE_ICONS: Record<CustomFieldType, any> = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  BOOLEAN: CheckSquare,
  SELECT: List,
  MULTI_SELECT: Layers,
  URL: LinkIcon
}

export default function CustomFieldSection({
  projectId,
  taskId,
  definitions,
  values,
  canEdit,
  canManage,
  className,
}: Props) {
  const queryClient = useQueryClient()
  const [isEditMode, setIsEditMode] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string | null>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize drafts from values
  useEffect(() => {
    const next: Record<string, string | null> = {}
    values.forEach(v => {
      next[v.fieldDefinitionId] = v.value
    })
    setDrafts(next)
  }, [values])

  const saveMutation = useMutation({
    mutationFn: ({ fieldId, value }: { fieldId: string; value: string | null }) =>
      TaskService.saveCustomFieldValues(taskId, {
        values: [{ fieldId, value }]
      }),
    onMutate: ({ fieldId }) => {
      setSaving(fieldId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", projectId, taskId] })
      toast.success("Đã lưu giá trị")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Không thể lưu giá trị")
    },
    onSettled: () => {
      setSaving(null)
    }
  })

  const handleSave = (fieldId: string, value: string | null) => {
    const def = definitions.find(d => d.id === fieldId)
    if (!def) return

    // Validate required
    if (def.required && !def.hidden && (value === null || value === "")) {
      setErrors(prev => ({ ...prev, [fieldId]: "Trường này là bắt buộc" }))
      return
    }

    setErrors(prev => {
      const next = { ...prev }
      delete next[fieldId]
      return next
    })

    saveMutation.mutate({ fieldId, value })
  }

  // Rule 1: Ẩn tất cả field hidden — kể cả PM/Admin (họ quản lý ở Settings)
  const visibleDefinitions = definitions.filter(d => !d.hidden)

  // Rule 2: View mode → chỉ hiện field có giá trị; Edit mode → hiện tất cả visible field
  const fieldsToRender = visibleDefinitions.filter(def => {
    if (isEditMode) return true
    const val = values.find(v => v.fieldDefinitionId === def.id)
    return val != null && val.value !== null && val.value !== ""
  })

  if (visibleDefinitions.length === 0) return null

  // Nếu view mode và không có field nào có giá trị → ẩn toàn bộ section
  if (!isEditMode && fieldsToRender.length === 0) return null

  return (
    <div className={cn("rounded-xl border border-slate-200 p-4 bg-white shadow-sm space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Custom Fields</h3>
        <div className="flex items-center gap-2">
          {canManage && (
            <Link
              href={`/projects/${projectId}/settings/custom-fields`}
              className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
            >
              <Settings size={12} /> Manage →
            </Link>
          )}
          {canEdit && (
            <button
              onClick={() => setIsEditMode(v => !v)}
              className="text-xs font-bold flex items-center gap-1 text-slate-500 hover:text-slate-800"
            >
              {isEditMode ? <><X size={12} /> Xong</> : <><Pencil size={12} /> Sửa</>}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldsToRender.map(def => {
          const Icon = TYPE_ICONS[def.fieldType] || Type
          const currentValue = drafts[def.id] ?? ""
          const isSaving = saving === def.id
          const error = errors[def.id]

          return (
            <div key={def.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Icon size={12} className="text-slate-400" />
                  {def.name}
                  {def.required && <span className="text-red-500">*</span>}
                  {def.hidden && <span className="text-[9px] bg-slate-200 px-1 rounded ml-1 lowercase font-normal">hidden</span>}
                </label>
                {isSaving && <Loader2 size={12} className="animate-spin text-blue-500" />}
              </div>

              <div className="relative group">
                {/* Input components based on type */}
                {def.fieldType === "TEXT" && (
                  <input
                    type="text"
                    disabled={!isEditMode || isSaving}
                    value={currentValue}
                    onChange={e => setDrafts(p => ({ ...p, [def.id]: e.target.value }))}
                    onBlur={e => handleSave(def.id, e.target.value)}
                    maxLength={1000}
                    placeholder="Nhập giá trị..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                )}

                {def.fieldType === "NUMBER" && (
                  <input
                    type="number"
                    disabled={!isEditMode || isSaving}
                    value={currentValue}
                    onChange={e => setDrafts(p => ({ ...p, [def.id]: e.target.value }))}
                    onBlur={e => handleSave(def.id, e.target.value)}
                    placeholder="Nhập số..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                )}

                {def.fieldType === "DATE" && (
                  <input
                    type="date"
                    disabled={!isEditMode || isSaving}
                    value={currentValue ? currentValue.split('T')[0] : ""}
                    onChange={e => {
                      const val = e.target.value
                      setDrafts(p => ({ ...p, [def.id]: val }))
                      handleSave(def.id, val)
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                )}

                {def.fieldType === "BOOLEAN" && (
                  <button
                    disabled={!isEditMode || isSaving}
                    onClick={() => {
                      const next = currentValue === "true" ? "false" : "true"
                      setDrafts(p => ({ ...p, [def.id]: next }))
                      handleSave(def.id, next)
                    }}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-colors duration-200 outline-none focus:ring-2 focus:ring-blue-100",
                      currentValue === "true" ? "bg-green-500" : "bg-slate-200",
                      (!canEdit || isSaving) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm",
                      currentValue === "true" ? "translate-x-5.5 left-0" : "left-0.5"
                    )} />
                  </button>
                )}

                {def.fieldType === "SELECT" && (
                  <select
                    disabled={!isEditMode || isSaving}
                    value={currentValue}
                    onChange={e => {
                      const val = e.target.value
                      setDrafts(p => ({ ...p, [def.id]: val }))
                      handleSave(def.id, val)
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed appearance-none"
                  >
                    <option value="">Chọn một...</option>
                    {def.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {def.fieldType === "MULTI_SELECT" && (
                  <div className="flex flex-wrap gap-2">
                    {def.options?.map(opt => {
                      const currentArr = currentValue ? currentValue.split(',') : []
                      const isSelected = currentArr.includes(opt)
                      return (
                        <button
                          key={opt}
                          disabled={!isEditMode || isSaving}
                          onClick={() => {
                            const nextArr = isSelected 
                              ? currentArr.filter(a => a !== opt) 
                              : [...currentArr, opt]
                            const next = nextArr.length > 0 ? nextArr.join(',') : ""
                            setDrafts(p => ({ ...p, [def.id]: next }))
                            handleSave(def.id, next)
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-bold border transition-all",
                            isSelected 
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          )}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                )}

                {def.fieldType === "URL" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      disabled={!isEditMode || isSaving}
                      value={currentValue}
                      onChange={e => setDrafts(p => ({ ...p, [def.id]: e.target.value }))}
                      onBlur={e => handleSave(def.id, e.target.value)}
                      placeholder="https://..."
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                    {currentValue && (
                      <a 
                        href={currentValue.startsWith('http') ? currentValue : `https://${currentValue}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                      >
                        <LinkIcon size={14} />
                      </a>
                    )}
                  </div>
                )}
              </div>
              {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
