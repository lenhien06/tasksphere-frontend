"use client"

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Download, Trash2, Upload, X, FileText, ImageIcon, FileCode, FileArchive, FileSpreadsheet, FilePieChart, File, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/common/UserAvatar"
import {
    useAttachments,
    useUploadAttachment,
    useDeleteAttachment,
    validateFile,
    isPending,
} from "@/hooks/useAttachments"
import {
    formatFileSize,
    formatDate,
    getFileIcon,
    isImageMime,
    isPdfMime,
    isTextMime,
} from "@/components/task-detail/config"
import type { AttachmentResponse } from "@/app/types/task.schema"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/useAuthStore"
import { TaskDetailService } from "@/app/services/TaskDetailService"

interface AttachmentsTabProps {
    projectId: string
    taskId: string
}

// ── File icon helpers ──────────────────────────────────────

function getFileIconComponent(mimeType: string, fileName: string, size = 16) {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (isImageMime(mimeType)) return <ImageIcon size={size} className="text-blue-500" />
    if (isPdfMime(mimeType)) return <FileText size={size} className="text-rose-500" />
    if (ext === 'zip' || ext === 'rar' || ext === '7z') return <FileArchive size={size} className="text-amber-500" />
    if (ext === 'doc' || ext === 'docx') return <FileText size={size} className="text-blue-600" />
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return <FileSpreadsheet size={size} className="text-emerald-600" />
    if (ext === 'ppt' || ext === 'pptx') return <FilePieChart size={size} className="text-orange-500" />
    if (ext === 'js' || ext === 'ts' || ext === 'tsx' || ext === 'html' || ext === 'css' || ext === 'json') return <FileCode size={size} className="text-violet-500" />
    return <File size={size} className="text-slate-400" />
}

// ── Full-screen overlay preview (Zalo Web style) ──────────

interface FilePreviewOverlayProps {
    attachments: AttachmentResponse[]
    initialIndex: number
    onClose: () => void
}

function FilePreviewOverlay({ attachments, initialIndex, onClose }: FilePreviewOverlayProps) {
    const [index, setIndex] = useState(initialIndex)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [textContent, setTextContent] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [visible, setVisible] = useState(false)

    const attachment = attachments[index]
    const total = attachments.length
    const isImage = attachment ? isImageMime(attachment.mimeType) : false
    const isPdf = attachment ? isPdfMime(attachment.mimeType) : false
    const isText = attachment ? isTextMime(attachment.mimeType, attachment.fileName) : false
    const canPreview = isImage || isPdf || isText

    // Fade in on mount
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10)
        return () => clearTimeout(t)
    }, [])

    // Load preview URL when attachment changes
    useEffect(() => {
        if (!attachment) return
        setPreviewUrl(null)
        setTextContent(null)
        setZoom(1)
        setRotation(0)
        setLoading(true)
        TaskDetailService.getPreviewUrl(attachment.id)
            .then(res => {
                setPreviewUrl(res.previewUrl)
                if (isTextMime(attachment.mimeType, attachment.fileName)) {
                    return fetch(res.previewUrl).then(r => r.text()).then(t => setTextContent(t))
                }
            })
            .catch(() => toast.error("Unable to load preview"))
            .finally(() => setLoading(false))
    }, [attachment?.id])

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose()
            if (e.key === "ArrowLeft") goTo(index - 1)
            if (e.key === "ArrowRight") goTo(index + 1)
            if (e.key === "+" || e.key === "=") setZoom(z => Math.min(z + 0.25, 4))
            if (e.key === "-") setZoom(z => Math.max(z - 0.25, 0.25))
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [index, total])

    // Mouse wheel zoom for images
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (!isImage) return
        e.preventDefault()
        const delta = e.deltaY < 0 ? 0.15 : -0.15
        setZoom(z => Math.min(Math.max(z + delta, 0.25), 4))
    }, [isImage])

    const goTo = (i: number) => {
        if (i < 0 || i >= total) return
        setIndex(i)
    }

    const handleClose = () => {
        setVisible(false)
        setTimeout(onClose, 200)
    }

    return (
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex flex-col transition-all duration-200",
                visible ? "opacity-100" : "opacity-0"
            )}
            style={{ background: "rgba(0,0,0,0.92)" }}
        >
            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {/* Left: file info */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(255,255,255,0.1)" }}>
                        {attachment && getFileIconComponent(attachment.mimeType, attachment.fileName, 18)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate max-w-[320px] md:max-w-[500px]">
                            {attachment?.fileName}
                        </p>
                        <p className="text-xs text-white/50 mt-0.5">
                            {attachment && formatFileSize(attachment.fileSize)}
                            {attachment && " · "}
                            {attachment && formatDate(attachment.uploadedAt)}
                        </p>
                    </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1.5 shrink-0 ml-4">
                    {/* Counter */}
                    {total > 1 && (
                        <span className="text-xs font-medium text-white/50 px-2 py-1 rounded-full mr-1"
                            style={{ background: "rgba(255,255,255,0.08)" }}>
                            {index + 1} / {total}
                        </span>
                    )}

                    {/* Image controls */}
                    {isImage && (
                        <>
                            <button
                                onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                title="Zoom out (-)">
                                <ZoomOut size={16} />
                            </button>
                            <span className="text-xs font-medium text-white/60 w-10 text-center select-none">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={() => setZoom(z => Math.min(z + 0.25, 4))}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                title="Zoom in (+)">
                                <ZoomIn size={16} />
                            </button>
                            <button
                                onClick={() => setRotation(r => r + 90)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                title="Rotate">
                                <RotateCw size={16} />
                            </button>
                            <button
                                onClick={() => { setZoom(1); setRotation(0) }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                title="Reset">
                                <Maximize2 size={15} />
                            </button>
                            <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.15)" }} />
                        </>
                    )}

                    {/* Download */}
                    {attachment && (
                        <a href={attachment.downloadUrl} download target="_blank" rel="noopener noreferrer">
                            <button className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Download">
                                <Download size={16} />
                            </button>
                        </a>
                    )}

                    {/* Close */}
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors ml-1"
                        title="Close (Esc)">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── Main content area ── */}
            <div
                className="flex-1 relative flex items-center justify-center overflow-hidden"
                onWheel={handleWheel}
                onClick={e => { if (e.target === e.currentTarget) handleClose() }}
            >
                {/* Prev arrow */}
                {total > 1 && (
                    <button
                        onClick={() => goTo(index - 1)}
                        disabled={index === 0}
                        className={cn(
                            "absolute left-4 z-10 w-11 h-11 rounded-full flex items-center justify-center transition-all",
                            "text-white border border-white/20 backdrop-blur-sm",
                            index === 0
                                ? "opacity-20 cursor-not-allowed bg-white/5"
                                : "opacity-80 hover:opacity-100 hover:scale-110 bg-white/10 hover:bg-white/20"
                        )}
                        title="Previous (←)">
                        <ChevronLeft size={22} />
                    </button>
                )}

                {/* Next arrow */}
                {total > 1 && (
                    <button
                        onClick={() => goTo(index + 1)}
                        disabled={index === total - 1}
                        className={cn(
                            "absolute right-4 z-10 w-11 h-11 rounded-full flex items-center justify-center transition-all",
                            "text-white border border-white/20 backdrop-blur-sm",
                            index === total - 1
                                ? "opacity-20 cursor-not-allowed bg-white/5"
                                : "opacity-80 hover:opacity-100 hover:scale-110 bg-white/10 hover:bg-white/20"
                        )}
                        title="Next (→)">
                        <ChevronRight size={22} />
                    </button>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
                        <p className="text-xs font-medium text-white/50 uppercase tracking-widest">Đang tải...</p>
                    </div>
                )}

                {/* Content */}
                {!loading && previewUrl && attachment && (
                    <>
                        {/* Image */}
                        {isImage && (
                            <div className="flex items-center justify-center w-full h-full overflow-hidden select-none">
                                <img
                                    src={previewUrl}
                                    alt={attachment.fileName}
                                    draggable={false}
                                    style={{
                                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                        transition: "transform 0.2s ease",
                                        maxWidth: "calc(100vw - 120px)",
                                        maxHeight: "calc(100vh - 120px)",
                                        objectFit: "contain",
                                        cursor: zoom > 1 ? "move" : "default",
                                    }}
                                />
                            </div>
                        )}

                        {/* PDF */}
                        {isPdf && (
                            <iframe
                                src={previewUrl + "#toolbar=1&navpanes=1&scrollbar=1"}
                                className="w-full h-full border-0"
                                title={attachment.fileName}
                                style={{ background: "#fff" }}
                            />
                        )}

                        {/* Text / Code */}
                        {isText && (
                            <div className="w-full h-full overflow-auto p-8">
                                <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-w-4xl mx-auto">
                                    {textContent ?? "Không đọc được nội dung"}
                                </pre>
                            </div>
                        )}

                        {/* Unsupported */}
                        {!canPreview && (
                            <div className="flex flex-col items-center gap-5">
                                <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                                    style={{ background: "rgba(255,255,255,0.08)" }}>
                                    {getFileIconComponent(attachment.mimeType, attachment.fileName, 36)}
                                </div>
                                <div className="text-center">
                                    <p className="text-base font-semibold text-white">{attachment.fileName}</p>
                                    <p className="text-sm text-white/40 mt-1">Định dạng này không hỗ trợ xem trước</p>
                                </div>
                                <a href={attachment.downloadUrl} download target="_blank" rel="noopener noreferrer">
                                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-colors"
                                        style={{ background: "rgba(59,130,246,0.8)" }}>
                                        <Download size={15} />
                                        Tải xuống
                                    </button>
                                </a>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Bottom thumbnail strip (if > 1 file) ── */}
            {total > 1 && (
                <div className="shrink-0 px-4 py-3 flex items-center justify-center gap-2 overflow-x-auto"
                    style={{ background: "rgba(255,255,255,0.04)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    {attachments.map((att, i) => {
                        const isActive = i === index
                        const isImg = isImageMime(att.mimeType)
                        return (
                            <button
                                key={att.id}
                                onClick={() => goTo(i)}
                                className={cn(
                                    "w-12 h-12 rounded-lg overflow-hidden shrink-0 transition-all border-2",
                                    isActive
                                        ? "border-blue-400 scale-110 shadow-lg shadow-blue-500/30"
                                        : "border-transparent opacity-50 hover:opacity-90 hover:scale-105"
                                )}
                                style={{ background: "rgba(255,255,255,0.08)" }}
                                title={att.fileName}
                            >
                                {isImg && att.previewUrl ? (
                                    <img src={att.previewUrl} alt={att.fileName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        {getFileIconComponent(att.mimeType, att.fileName, 18)}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ── File button ────────────────────────────────────────────

interface FileButtonProps {
    attachment: AttachmentResponse
    currentUserId: string
    projectId: string
    taskId: string
    onPreview: (a: AttachmentResponse) => void
}

function FileButton({ attachment, currentUserId, projectId, taskId, onPreview }: FileButtonProps) {
    const deleteAttachment = useDeleteAttachment(projectId, taskId)
    const scanning = isPending(attachment)
    const isOwn = attachment.uploadedBy.id === currentUserId
    const [thumbError, setThumbError] = useState(false)

    const isImage = isImageMime(attachment.mimeType)
    const showThumb = isImage && !thumbError
    const thumbSrc = attachment.previewUrl ?? attachment.downloadUrl
    const canClick = attachment.previewable && !scanning

    return (
        <div className={cn(
            "group flex items-center gap-2 p-1.5 pr-3 border rounded-full transition-all",
            scanning
                ? "bg-slate-50 border-slate-200 opacity-80"
                : "bg-white hover:bg-slate-50 border-slate-100 hover:shadow-sm hover:border-slate-200"
        )}>
            <div
                className={cn(
                    "h-8 w-8 rounded-full bg-slate-100 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative",
                    canClick && "cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 transition-all"
                )}
                onClick={canClick ? () => onPreview(attachment) : undefined}
                title={canClick ? "Click to preview" : undefined}
            >
                {scanning ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : showThumb ? (
                    <img
                        src={thumbSrc}
                        alt={attachment.fileName}
                        className="h-full w-full object-cover"
                        onError={() => setThumbError(true)}
                    />
                ) : (
                    <div className="text-slate-400">
                        {getFileIconComponent(attachment.mimeType, attachment.fileName)}
                    </div>
                )}
            </div>

            <div
                className={cn("flex-1 min-w-0 flex items-center gap-2", canClick && "cursor-pointer")}
                onClick={canClick ? () => onPreview(attachment) : undefined}
            >
                <span className={cn(
                    "text-xs font-bold truncate max-w-[200px]",
                    canClick ? "text-blue-700 group-hover:underline" : "text-slate-700"
                )}>
                    {attachment.fileName}
                </span>
                {scanning ? (
                    <span className="text-[10px] font-medium text-blue-500 shrink-0">Đang xử lý...</span>
                ) : (
                    <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {formatFileSize(attachment.fileSize)}
                    </span>
                )}
            </div>

            {!scanning && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <a href={attachment.downloadUrl} download target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:text-emerald-600 hover:bg-emerald-50" title="Download">
                            <Download size={13} />
                        </Button>
                    </a>
                    {isOwn && (
                        <Button
                            variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => deleteAttachment.mutate(attachment.id)}
                            disabled={deleteAttachment.isPending}
                            title="Delete"
                        >
                            <Trash2 size={13} />
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Upload zone ───────────────────────────────────────────

interface UploadZoneProps {
    projectId: string
    taskId: string
}

function UploadZone({ projectId, taskId }: UploadZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const uploadAttachment = useUploadAttachment(projectId, taskId)

    const processFiles = useCallback((files: FileList) => {
        Array.from(files).forEach(file => {
            const err = validateFile(file)
            if (err) { toast.error(`${file.name}: ${err}`); return }
            uploadAttachment.mutate(file)
        })
    }, [uploadAttachment])

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files)
    }

    return (
        <div
            className={cn(
                "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50",
                isDragOver ? "border-blue-500 bg-blue-50 scale-[1.01]" : "border-slate-200 hover:border-blue-400 hover:bg-white"
            )}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            aria-label="File upload area"
            tabIndex={0}
            onKeyDown={e => e.key === "Enter" && inputRef.current?.click()}
        >
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-sm text-blue-600">
                <Upload size={18} />
            </div>
            <p className="text-[13px] font-bold text-slate-700">
                {isDragOver ? "Drop to upload" : "Upload Attachments"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
                Drag & drop or <span className="text-blue-600 underline">browse</span>
            </p>

            {uploadAttachment.isPending && (
                <div className="mt-3 flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Uploading...</span>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.zip,.txt,.csv,.md"
                onChange={e => e.target.files && processFiles(e.target.files)}
            />
        </div>
    )
}

// ── Main tab ─────────────────────────────────────────────

export default function AttachmentsTab({ projectId, taskId }: AttachmentsTabProps) {
    const { data: attachments = [], isLoading } = useAttachments(projectId, taskId)
    const [previewIndex, setPreviewIndex] = useState<number | null>(null)
    const { user } = useAuthStore()
    const currentUserId = user?.id?.toString() ?? ""

    const stableAttachments = useMemo(
        () => attachments.map((attachment, index) => ({
            attachment,
            key: `${attachment.id}-${attachment.uploadedAt}-${index}`,
        })),
        [attachments]
    )

    const handlePreview = useCallback((attachment: AttachmentResponse) => {
        const idx = attachments.findIndex(a => a.id === attachment.id)
        if (idx !== -1) setPreviewIndex(idx)
    }, [attachments])

    if (isLoading) {
        return (
            <div className="flex flex-wrap gap-2 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 w-48 bg-slate-100 rounded-full border border-slate-100" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {previewIndex !== null && (
                <FilePreviewOverlay
                    attachments={attachments}
                    initialIndex={previewIndex}
                    onClose={() => setPreviewIndex(null)}
                />
            )}

            <div className="space-y-3">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Files ({attachments.length})
                </h3>

                <div className="flex flex-wrap gap-2">
                    {stableAttachments.length === 0 ? (
                        <div className="w-full text-center py-6 border border-dashed rounded-2xl bg-slate-50/50">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No files uploaded</p>
                        </div>
                    ) : (
                        stableAttachments.map(({ attachment, key }) => (
                            <FileButton
                                key={key}
                                attachment={attachment}
                                currentUserId={currentUserId}
                                projectId={projectId}
                                taskId={taskId}
                                onPreview={handlePreview}
                            />
                        ))
                    )}
                </div>
            </div>

            <UploadZone projectId={projectId} taskId={taskId} />
        </div>
    )
}
