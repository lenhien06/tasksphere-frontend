"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { TaskService } from "@/app/services/TaskService"
import type { CreateColumnRequest, ColumnResponse } from "@/app/types/task.schema"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const PRESET_COLORS = [
    "#8C8C8C", "#1677FF", "#52C41A", "#FA8C16", "#FF4D4F",
    "#722ED1", "#13C2C2", "#EB2F96", "#FADB14", "#2F54EB",
]

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

function ColorPicker({
    value,
    onChange,
}: {
    value: string
    onChange: (hex: string) => void
}) {
    const [hexInput, setHexInput] = useState(value)

    return (
        <div className="space-y-3">
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
                <div className="w-8 h-8 rounded-lg border border-gray-200 shrink-0 shadow-sm" style={{ backgroundColor: HEX_REGEX.test(hexInput) ? hexInput : value }} />
                <input
                    value={hexInput}
                    onChange={e => {
                        setHexInput(e.target.value)
                        if (HEX_REGEX.test(e.target.value)) onChange(e.target.value)
                    }}
                    className="flex-1 h-9 border border-gray-200 rounded-lg px-3 text-sm font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    placeholder="#1677FF"
                />
            </div>
        </div>
    )
}

interface AddColumnModalProps {
    open: boolean
    projectId: string
    onClose: () => void
    onSuccess?: (column: ColumnResponse) => void
}

export function AddColumnModal({ open, projectId, onClose, onSuccess }: AddColumnModalProps) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const [name, setName]             = useState("")
    const [colorHex, setColorHex]     = useState("#1677FF")

    const createMutation = useMutation({
        mutationFn: (data: CreateColumnRequest) => TaskService.createColumn(projectId, data),
        onSuccess: (newCol) => {
            queryClient.invalidateQueries({ queryKey: ["columns", projectId] })
            toast.success(t('columns.addedSuccess', { name: newCol.name, defaultValue: `Đã thêm cột ${newCol.name}` }))
            onSuccess?.(newCol)
            onClose()
            setName("")
        },
        onError: (error: any) => {
            if (error?.response?.status === 409) {
                toast.error(t('columns.nameExists', { defaultValue: "Tên cột đã tồn tại" }))
            } else {
                toast.error(t('columns.addError', { defaultValue: "Không thể thêm cột" }))
            }
        },
    })

    return (
        <Dialog open={open} onOpenChange={val => !val && onClose()}>
            <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                <DialogHeader className="px-6 pt-6 pb-0">
                    <DialogTitle className="text-xl font-bold text-gray-900">{t('columns.addNew', { defaultValue: "Thêm cột mới" })}</DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Preview Section */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('common.preview', { defaultValue: "Xem trước" })}</label>
                        <div
                            className="h-10 rounded-xl flex items-center px-4 text-white text-sm font-bold shadow-sm transition-all duration-300"
                            style={{ backgroundColor: colorHex }}
                        >
                            {name || t('columns.namePlaceholder', { defaultValue: "Tên cột" })}
                        </div>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                            <span>{t('columns.name', { defaultValue: "Tên cột" })}</span>
                            <span className={cn("font-normal lowercase", name.length > 45 ? "text-red-500" : "text-gray-400")}>{name.length}/50</span>
                        </label>
                        <input
                            autoFocus
                            value={name}
                            maxLength={50}
                            onChange={e => setName(e.target.value)}
                            placeholder={t('columns.nameInputPlaceholder', { defaultValue: "Ví dụ: Đang kiểm thử, QA..." })}
                            className="w-full h-11 border border-gray-200 rounded-xl px-4 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        />
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{t('columns.color', { defaultValue: "Màu sắc" })}</label>
                        <ColorPicker value={colorHex} onChange={setColorHex} />
                    </div>
                </div>

                <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-11 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        {t('common.cancel', { defaultValue: "Hủy bỏ" })}
                    </button>
                    <button
                        onClick={() => createMutation.mutate({ name: name.trim(), colorHex })}
                        disabled={!name.trim() || createMutation.isPending}
                        className="flex-1 h-11 text-sm font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-900/10 transition-all active:scale-[0.98]"
                    >
                        {createMutation.isPending ? t('common.processing', { defaultValue: "Đang xử lý..." }) : t('common.create', { defaultValue: "Tạo cột" })}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
