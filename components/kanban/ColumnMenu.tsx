"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { 
    MoreHorizontal, Pencil, Palette, EyeOff, Trash2, Check, X 
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { TaskService } from "@/app/services/TaskService"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const PRESET_COLORS = [
    "#8C8C8C", "#1677FF", "#52C41A", "#FA8C16", "#FF4D4F",
    "#722ED1", "#13C2C2", "#EB2F96", "#FADB14", "#2F54EB",
]

interface ColumnMenuProps {
    column: {
        id: string
        name: string
        colorHex: string
        isDefault?: boolean
    }
    projectId: string
    taskCount: number
}

export function ColumnMenu({ column, projectId, taskCount }: ColumnMenuProps) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const [isOpen, setIsOpen] = useState(false)
    const [editMode, setEditMode] = useState<'name' | 'color' | null>(null)
    const [nameInput, setNameInput] = useState(column.name)
    const [confirmConfig, setConfirmConfig] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => void;
        variant?: 'danger' | 'default';
    }>({
        open: false,
        title: "",
        description: "",
        action: () => { },
    })

    const qKey = ["columns", projectId]

    const updateMutation = useMutation({
        mutationFn: (data: { name?: string; colorHex?: string; isHidden?: boolean }) => 
            TaskService.updateColumn(column.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qKey })
            setEditMode(null)
            setIsOpen(false)
        },
        onError: () => toast.error(t('columns.updateError', { defaultValue: "Unable to update column" })),
    })

    const deleteMutation = useMutation({
        mutationFn: () => TaskService.deleteColumn(column.id),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: qKey })
            toast.success(t('columns.deletedSuccess', { 
                count: result.movedTaskCount, 
                column: result.movedToColumn,
                defaultValue: `Column deleted. ${result.movedTaskCount} task(s) moved to ${result.movedToColumn}`
            }))
            setIsOpen(false)
        },
        onError: (error: any) => {
            if (error?.response?.status === 409) {
                toast.error(t('columns.deleteConflict', { defaultValue: "Please move all tasks before deleting this column" }))
            } else if (error?.response?.status === 400) {
                toast.error(t('columns.deleteMinError', { defaultValue: "There must be at least one DONE column" }))
            } else {
                toast.error(t('columns.deleteError', { defaultValue: "Unable to delete column" }))
            }
        },
    })

    const handleRename = (e: React.MouseEvent) => {
        e.stopPropagation()
        const trimmed = nameInput.trim()
        if (trimmed && trimmed !== column.name) {
            updateMutation.mutate({ name: trimmed })
        } else {
            setEditMode(null)
        }
    }

    const handleHide = () => {
        const title = t('columns.hide', { defaultValue: "Hide Column" })
        const description = taskCount > 0 
            ? t('columns.hideConfirmWithTasks', { count: taskCount, defaultValue: `${taskCount} task(s) will be moved to the first column. Are you sure you want to hide this column?` })
            : t('columns.hideConfirm', { defaultValue: "Are you sure you want to hide this column?" })
        
        setConfirmConfig({
            open: true,
            title,
            description,
            action: () => updateMutation.mutate({ isHidden: true }),
            variant: 'default'
        })
    }

    const handleDelete = () => {
        setConfirmConfig({
            open: true,
            title: t('columns.delete', { defaultValue: "Delete Column" }),
            description: t('columns.confirmDeleteSimple', { name: column.name, defaultValue: `Delete column "${column.name}"?` }),
            action: () => deleteMutation.mutate(),
            variant: 'danger'
        })
    }

    return (
        <>
            <DropdownMenu open={isOpen} onOpenChange={(open) => {
                if (!open && editMode !== null) return
                setIsOpen(open)
            }}>
                <DropdownMenuTrigger asChild>
                    <button className={cn(
                        "p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all group-hover:opacity-100",
                        !isOpen && "opacity-0"
                    )}>
                        <MoreHorizontal size={14} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl border-gray-100" onInteractOutside={(e) => {
                    if (editMode !== null) e.preventDefault()
                }}>
                    {editMode === 'name' ? (
                        <div className="p-2 space-y-2" onClick={e => e.stopPropagation()}>
                            <input
                                autoFocus
                                value={nameInput}
                                onChange={e => setNameInput(e.target.value)}
                                maxLength={50}
                                className="w-full h-8 px-2 text-sm border border-blue-400 rounded-lg outline-none ring-2 ring-blue-50"
                            />
                            <div className="flex gap-1.5">
                                <button 
                                    onClick={handleRename}
                                    disabled={updateMutation.isPending}
                                    className="flex-1 h-7 bg-gray-900 text-white text-[11px] font-bold rounded-md hover:bg-gray-800 disabled:opacity-50"
                                >
                                    {updateMutation.isPending ? t('common.saving', { defaultValue: "Saving..." }) : t('common.save', { defaultValue: "Save" })}
                                </button>
                                <button 
                                    onClick={() => { setEditMode(null); setNameInput(column.name) }}
                                    className="flex-1 h-7 border border-gray-200 text-gray-600 text-[11px] font-bold rounded-md hover:bg-gray-50"
                                >
                                    {t('common.cancel', { defaultValue: "Cancel" })}
                                </button>
                            </div>
                        </div>
                    ) : editMode === 'color' ? (
                        <div className="p-2" onClick={e => e.stopPropagation()}>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => updateMutation.mutate({ colorHex: c })}
                                        className={cn(
                                            "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                                            column.colorHex === c ? "border-gray-900 ring-1 ring-gray-900 ring-offset-1" : "border-transparent"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                            <button 
                                onClick={() => setEditMode(null)}
                                className="w-full h-7 border border-gray-200 text-gray-600 text-[11px] font-bold rounded-md hover:bg-gray-50"
                            >
                                {t('common.back', { defaultValue: "Back" })}
                            </button>
                        </div>
                    ) : (
                        <>
                            <DropdownMenuItem 
                                onSelect={(e) => {
                                    e.preventDefault()
                                    setEditMode('name')
                                }} 
                                className="rounded-lg gap-2.5 py-2 cursor-pointer"
                            >
                                <Pencil size={14} className="text-gray-400" />
                                <span className="text-sm font-medium">{t('columns.rename', { defaultValue: "Rename" })}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onSelect={(e) => {
                                    e.preventDefault()
                                    setEditMode('color')
                                }} 
                                className="rounded-lg gap-2.5 py-2 cursor-pointer"
                            >
                                <Palette size={14} className="text-gray-400" />
                                <span className="text-sm font-medium">{t('columns.changeColor', { defaultValue: "Change Color" })}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleHide} className="rounded-lg gap-2.5 py-2 cursor-pointer">
                                <EyeOff size={14} className="text-gray-400" />
                                <span className="text-sm font-medium">{t('columns.hide', { defaultValue: "Hide" })}</span>
                            </DropdownMenuItem>
                            
                            {!column.isDefault && (
                                <>
                                    <DropdownMenuSeparator className="bg-gray-50 my-1" />
                                    <DropdownMenuItem 
                                        onClick={handleDelete}
                                        disabled={taskCount > 0}
                                        className={cn(
                                            "rounded-lg gap-2.5 py-2 cursor-pointer",
                                            taskCount > 0 ? "opacity-40 grayscale pointer-events-none" : "text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
                                        )}
                                    >
                                        <Trash2 size={14} className={taskCount > 0 ? "text-gray-300" : "text-red-500"} />
                                        <span className="text-sm font-bold">
                                            {t('columns.delete', { defaultValue: "Delete Column" })}
                                        </span>
                                    </DropdownMenuItem>
                                    {taskCount > 0 && (
                                        <div className="px-2 pb-1 text-[10px] text-gray-400 italic">
                                            * {t('columns.deleteHint', { defaultValue: "Move all tasks to delete" })}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog 
                open={confirmConfig.open} 
                onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, open }))}
            >
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmConfig.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmConfig.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl border-gray-200">
                            {t('common.cancel', { defaultValue: "Cancel" })}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmConfig.action}
                            className={cn(
                                "rounded-xl font-bold transition-all active:scale-95",
                                confirmConfig.variant === 'danger' 
                                    ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200" 
                                    : "bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-200"
                            )}
                        >
                            {t('common.confirm', { defaultValue: "Confirm" })}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
