"use client"

import React, { useCallback, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
    X,
    FileUp,
    Download,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    FileSpreadsheet,
} from "lucide-react"
import { TaskService } from "@/app/services/TaskService"
import type { TaskImportError, TaskImportResult } from "@/app/types/task.schema"

interface TaskImportModalProps {
    projectId: string
    onClose: () => void
    onSuccess: () => void
}

export default function TaskImportModal({ projectId, onClose, onSuccess }: TaskImportModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [isDragOver, setIsDragOver] = useState(false)
    const [importResult, setImportResult] = useState<TaskImportResult | null>(null)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const importMutation = useMutation({
        mutationFn: (f: File) => TaskService.importTasks(projectId, f),
        onSuccess: (result) => {
            setImportResult(result)
            setIsSuccess(true)
            toast.success(`Import thành công ${result.createdCount} task`)
            onSuccess()
            setTimeout(onClose, 1500)
        },
        onError: (err: any) => {
            const errorData: TaskImportResult | null = err?.response?.data?.data ?? null
            if (errorData && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
                setImportResult(errorData)
            } else {
                const msg =
                    err?.response?.data?.meta?.message ??
                    err?.response?.data?.message ??
                    "Import thất bại. Vui lòng kiểm tra lại file."
                toast.error(msg)
            }
        },
    })

    const handleFileSelect = useCallback((selected: File | undefined) => {
        if (!selected) return
        if (!selected.name.toLowerCase().endsWith(".xlsx")) {
            toast.error("Chỉ nhận file .xlsx")
            return
        }
        if (selected.size > 5 * 1024 * 1024) {
            toast.error("File vượt quá 5MB")
            return
        }
        setFile(selected)
        setImportResult(null)
        setIsSuccess(false)
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()
            setIsDragOver(false)
            handleFileSelect(e.dataTransfer.files[0])
        },
        [handleFileSelect],
    )

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragOver(true)
    }

    const handleDragLeave = () => setIsDragOver(false)

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files?.[0])
        e.target.value = ""
    }

    const handleDownloadTemplate = async () => {
        setIsDownloading(true)
        try {
            await TaskService.downloadImportTemplate(projectId)
        } catch {
            toast.error("Không thể tải file template")
        } finally {
            setIsDownloading(false)
        }
    }

    const handleImport = () => {
        if (!file) return
        importMutation.mutate(file)
    }

    const handleRetry = () => {
        setFile(null)
        setImportResult(null)
        setIsSuccess(false)
        fileInputRef.current?.click()
    }

    const isLoading = importMutation.isPending
    const hasErrors =
        importResult !== null && Array.isArray(importResult.errors) && importResult.errors.length > 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div
                className="relative mx-4 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <FileUp size={20} className="text-blue-500" />
                        <h2 className="text-base font-bold text-gray-900">Import Tasks từ Excel</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {/* Success state */}
                    {isSuccess && importResult && (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            <CheckCircle2 size={48} className="text-emerald-500" />
                            <p className="text-lg font-bold text-gray-900">
                                Import thành công!
                            </p>
                            <p className="text-sm text-gray-500">
                                Đã tạo{" "}
                                <span className="font-bold text-emerald-600">
                                    {importResult.createdCount}
                                </span>{" "}
                                task từ {importResult.totalRows} dòng dữ liệu.
                            </p>
                        </div>
                    )}

                    {/* Normal / error state */}
                    {!isSuccess && (
                        <>
                            {/* Download template */}
                            <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
                                <p className="text-xs text-blue-700">
                                    Chưa có file mẫu? Tải về để xem hướng dẫn.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    disabled={isDownloading}
                                    className="ml-3 flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-60"
                                >
                                    {isDownloading ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <Download size={13} />
                                    )}
                                    Download template
                                </button>
                            </div>

                            {/* Dropzone */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => !isLoading && fileInputRef.current?.click()}
                                className={[
                                    "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-colors",
                                    isDragOver
                                        ? "border-blue-400 bg-blue-50"
                                        : file
                                          ? "border-emerald-300 bg-emerald-50"
                                          : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40",
                                    isLoading ? "cursor-not-allowed opacity-60" : "",
                                ].join(" ")}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx"
                                    onChange={handleFileInputChange}
                                    className="hidden"
                                />
                                {file ? (
                                    <>
                                        <FileSpreadsheet size={36} className="text-emerald-500" />
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-gray-800">
                                                {file.name}
                                            </p>
                                            <p className="mt-0.5 text-xs text-gray-500">
                                                {(file.size / 1024).toFixed(1)} KB — nhấn để đổi file
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                                            <FileUp size={24} className="text-blue-500" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-gray-700">
                                                Kéo thả file .xlsx vào đây
                                            </p>
                                            <p className="mt-0.5 text-xs text-gray-400">
                                                hoặc nhấn để chọn file
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <p className="mt-2 text-center text-xs text-gray-400">
                                Chỉ nhận file .xlsx, tối đa 5MB. Xem hướng dẫn trong file template.
                            </p>

                            {/* Error table */}
                            {hasErrors && importResult && (
                                <div className="mt-4">
                                    <div className="mb-2 flex items-center gap-2">
                                        <AlertTriangle size={16} className="text-red-500" />
                                        <p className="text-sm font-semibold text-red-700">
                                            Tìm thấy {importResult.errors.length} lỗi trong{" "}
                                            {importResult.totalRows} dòng dữ liệu
                                        </p>
                                    </div>
                                    <div className="max-h-52 overflow-y-auto rounded-xl border border-red-100">
                                        <table className="w-full text-xs">
                                            <thead className="sticky top-0 bg-red-50">
                                                <tr>
                                                    <th className="w-14 border-b border-red-100 px-3 py-2 text-left font-semibold text-red-700">
                                                        Dòng
                                                    </th>
                                                    <th className="w-28 border-b border-red-100 px-3 py-2 text-left font-semibold text-red-700">
                                                        Cột
                                                    </th>
                                                    <th className="border-b border-red-100 px-3 py-2 text-left font-semibold text-red-700">
                                                        Lỗi
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importResult.errors.map(
                                                    (err: TaskImportError, idx: number) => (
                                                        <tr
                                                            key={idx}
                                                            className="border-b border-red-50 last:border-0"
                                                        >
                                                            <td className="px-3 py-2 font-mono font-bold text-red-600">
                                                                {err.row}
                                                            </td>
                                                            <td className="px-3 py-2 font-medium text-gray-700">
                                                                {err.column}
                                                            </td>
                                                            <td className="px-3 py-2 text-gray-600">
                                                                {err.message}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRetry}
                                        className="mt-3 w-full rounded-xl border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-blue-300 hover:text-blue-600"
                                    >
                                        Thử lại với file khác
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!isSuccess && (
                    <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={!file || isLoading}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Đang import...
                                </>
                            ) : (
                                <>
                                    <FileUp size={16} />
                                    Import
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
