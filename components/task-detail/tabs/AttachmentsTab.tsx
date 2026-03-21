"use client"

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Download, Eye, Trash2, Upload, X, FileText, ImageIcon, FileCode, FileArchive, FileSpreadsheet, FilePieChart, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UserAvatar } from "@/components/common/UserAvatar"
import {
    useAttachments,
    useUploadAttachment,
    useDeleteAttachment,
    validateFile,
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

// ── Helpers for icons ──────────────────────────────────────

function getFileIconComponent(mimeType: string, fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase()
    
    if (isImageMime(mimeType)) return <ImageIcon size={16} className="text-blue-500" />
    if (isPdfMime(mimeType)) return <FileText size={16} className="text-rose-500" />
    if (ext === 'zip' || ext === 'rar' || ext === '7z') return <FileArchive size={16} className="text-amber-500" />
    if (ext === 'doc' || ext === 'docx') return <FileText size={16} className="text-blue-600" />
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return <FileSpreadsheet size={16} className="text-emerald-600" />
    if (ext === 'ppt' || ext === 'pptx') return <FilePieChart size={16} className="text-orange-500" />
    if (ext === 'js' || ext === 'ts' || ext === 'tsx' || ext === 'html' || ext === 'css' || ext === 'json') return <FileCode size={16} className="text-violet-500" />
    
    return <File size={16} className="text-slate-400" />
}

// ── Preview modal ─────────────────────────────────────────

interface PreviewModalProps {
    attachment: AttachmentResponse | null
    onClose: () => void
}

function PreviewModal({ attachment, onClose }: PreviewModalProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [textContent, setTextContent] = useState<string | null>(null)

    useEffect(() => {
        if (!attachment) return
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

    const canPreview = attachment ? (
        isImageMime(attachment.mimeType) ||
        isPdfMime(attachment.mimeType) ||
        isTextMime(attachment.mimeType, attachment.fileName)
    ) : false

    return (
        <Dialog open={!!attachment} onOpenChange={() => onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                <DialogHeader className="px-6 py-4 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-sm font-bold truncate flex items-center gap-2">
                        <span className="p-1.5 bg-white rounded-lg border shadow-sm">
                            {attachment && getFileIconComponent(attachment.mimeType, attachment.fileName)}
                        </span>
                        {attachment?.fileName}
                    </DialogTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-200" onClick={onClose}>
                        <X size={16} />
                    </Button>
                </DialogHeader>
                <div className="flex-1 overflow-auto bg-slate-100/30 p-6 min-h-[300px] flex items-center justify-center">
                    {loading && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Preview...</p>
                        </div>
                    )}
                    {!loading && previewUrl && attachment && (
                        <div className="w-full h-full flex items-center justify-center">
                            {isImageMime(attachment.mimeType) && (
                                <img
                                    src={previewUrl}
                                    alt={attachment.fileName}
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg border-4 border-white"
                                />
                            )}
                            {isPdfMime(attachment.mimeType) && (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-[70vh] border-0 rounded-xl shadow-lg bg-white"
                                    title={attachment.fileName}
                                />
                            )}
                            {isTextMime(attachment.mimeType, attachment.fileName) && (
                                <pre className="w-full whitespace-pre-wrap text-sm font-mono bg-[#1e293b] text-slate-300 p-6 rounded-xl max-h-[70vh] overflow-y-auto shadow-inner custom-scrollbar">
                                    {textContent ?? "Unable to read content"}
                                </pre>
                            )}
                            {!canPreview && (
                                <div className="flex flex-col items-center justify-center h-40 gap-4">
                                    <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                                        <File size={40} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Preview not supported</p>
                                    <Button asChild variant="primary" className="rounded-full px-6 shadow-lg shadow-blue-500/20">
                                        <a href={attachment.downloadUrl} download>
                                            <Download size={14} className="mr-2" /> Download File
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── File button (Facebook/Log style) ──────────────────────

interface FileButtonProps {
    attachment: AttachmentResponse
    currentUserId: string
    projectId: string
    taskId: string
    onPreview: (a: AttachmentResponse) => void
}

function FileButton({ attachment, currentUserId, projectId, taskId, onPreview }: FileButtonProps) {
    const deleteAttachment = useDeleteAttachment(projectId, taskId)
    const isOwn = attachment.uploadedBy.id === currentUserId
    const [thumbError, setThumbError] = useState(false)
    
    const isImage = isImageMime(attachment.mimeType)
    const showThumb = isImage && !thumbError
    const thumbSrc = attachment.previewUrl ?? attachment.downloadUrl

    return (
        <div className="group flex items-center gap-2 p-1.5 pr-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-full transition-all hover:shadow-sm hover:border-slate-200">
            {/* File Thumbnail or Icon */}
            <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {showThumb ? (
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
            
            {/* Info */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                    {attachment.fileName}
                </span>
                <span className="text-[10px] font-medium text-slate-400 shrink-0">
                    {formatFileSize(attachment.fileSize)}
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {attachment.previewable && (
                    <Button
                        variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => onPreview(attachment)}
                        title="Preview"
                    >
                        <Eye size={13} />
                    </Button>
                )}
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
    const [previewing, setPreviewing] = useState<AttachmentResponse | null>(null)
    const { user } = useAuthStore()
    const currentUserId = user?.id?.toString() ?? ""
    
    const stableAttachments = useMemo(
        () => attachments.map((attachment, index) => ({
            attachment,
            key: `${attachment.id}-${attachment.uploadedAt}-${index}`,
        })),
        [attachments]
    )

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
            <PreviewModal attachment={previewing} onClose={() => setPreviewing(null)} />

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
                                onPreview={setPreviewing}
                            />
                        ))
                    )}
                </div>
            </div>

            <UploadZone projectId={projectId} taskId={taskId} />
        </div>
    )
}
