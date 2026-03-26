"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { TaskDetailService } from "@/app/services/TaskDetailService"
import type { AttachmentResponse } from "@/app/types/task.schema"

const ALLOWED_EXTENSIONS = [
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".png", ".jpg", ".jpeg", ".gif", ".zip", ".txt", ".csv", ".md",
]

// Optimistic attachment shown immediately in UI while backend finalizes upload
export type PendingAttachment = AttachmentResponse & { scanning: true; localUrl?: string }

export function isPending(a: AttachmentResponse): a is PendingAttachment {
    return (a as any).scanning === true
}

export function validateFile(file: File): string | null {
    const MAX_MB = 25
    if (file.size > MAX_MB * 1024 * 1024) return `File too large (max ${MAX_MB}MB)`
    const ext = "." + file.name.split(".").pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) return "File format not supported"
    return null
}

export function useAttachments(projectId: string, taskId: string) {
    return useQuery({
        queryKey: ["attachments", taskId],
        queryFn: () => TaskDetailService.getAttachments(projectId, taskId),
        staleTime: 30_000,
        enabled: !!taskId && !!projectId,
    })
}

export function useUploadAttachment(projectId: string, taskId: string) {
    const qc = useQueryClient()

    const removePending = (tempId: string) => {
        qc.setQueryData(["attachments", taskId], (old: AttachmentResponse[] | undefined) =>
            old?.filter(a => a.id !== tempId) ?? []
        )
    }

    const refreshAttachments = () => {
        qc.invalidateQueries({ queryKey: ["attachments", taskId] })
        qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
        qc.invalidateQueries({ queryKey: ["activity", projectId, taskId] })
    }

    // Silent polling — no toast while backend finalizes, file already visible as pending
    const pollJob = async (jobId: string, tempId: string, attempt = 0): Promise<void> => {
        if (attempt > 40) {
            removePending(tempId)
            toast.error("Upload timed out — please try again")
            return
        }
        try {
            const job = await TaskDetailService.pollAttachmentJob(jobId)
            if (job.status === "COMPLETED" || job.status === "DONE" as any) {
                removePending(tempId)
                refreshAttachments()
                // No toast needed — file was already visible, just quietly finalize
            } else if (job.status === "FAILED") {
                removePending(tempId)
                toast.error(`"${job.fileName ?? "File"}" bị từ chối khi xử lý`)
            } else {
                setTimeout(() => pollJob(jobId, tempId, attempt + 1), 1500)
            }
        } catch {
            setTimeout(() => pollJob(jobId, tempId, attempt + 1), 2000)
        }
    }

    return useMutation({
        mutationFn: (file: File) => TaskDetailService.uploadAttachment(projectId, taskId, file),

        // Optimistic: add placeholder immediately before request completes
        onMutate: async (file: File) => {
            const tempId = `pending-${Date.now()}-${Math.random()}`
            const localUrl = URL.createObjectURL(file)

            const optimistic: PendingAttachment = {
                id: tempId,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type || "application/octet-stream",
                downloadUrl: localUrl,
                previewUrl: file.type.startsWith("image/") ? localUrl : null,
                previewable: file.type.startsWith("image/"),
                uploadedBy: { id: "", fullName: "Bạn", avatarUrl: null },
                uploadedAt: new Date().toISOString(),
                scanning: true,
                localUrl,
            } as PendingAttachment

            qc.setQueryData(["attachments", taskId], (old: AttachmentResponse[] | undefined) =>
                [optimistic, ...(old ?? [])]
            )
            return { tempId, localUrl }
        },

        onSuccess: (result: any, _file, context) => {
            const tempId = context?.tempId ?? ""

            if (result?.jobId) {
                // 202 async — backend still processing, file already visible as pending
                pollJob(result.jobId, tempId)
            } else if (result?.id) {
                // 201 sync path — replace optimistic with real data
                removePending(tempId)
                qc.setQueryData(["attachments", taskId], (old: AttachmentResponse[] | undefined) =>
                    old ? [result, ...old.filter((a) => a.id !== result.id)] : [result]
                )
                qc.setQueryData(["task", projectId, taskId], (old: any) =>
                    old?.task ? { ...old, task: { ...old.task, attachmentCount: Number(old.task.attachmentCount ?? 0) + 1 } } : old
                )
                qc.invalidateQueries({ queryKey: ["activity", projectId, taskId] })
            }
        },

        onError: (err: any, _file, context) => {
            // Remove optimistic placeholder on error
            if (context?.tempId) removePending(context.tempId)
            if (context?.localUrl) URL.revokeObjectURL(context.localUrl)

            const status = err?.response?.status
            if (status === 413) toast.error("File quá lớn (tối đa 25MB)")
            else if (status === 415) toast.error("Định dạng file không hỗ trợ")
            else if (status === 422) toast.error("File bị từ chối trong quá trình xử lý")
            else toast.error(err?.response?.data?.message ?? "Không thể upload file")
        },
    })
}

export function useDeleteAttachment(projectId: string, taskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (attachmentId: string) => TaskDetailService.deleteAttachment(attachmentId),
        onSuccess: (_, attachmentId) => {
            qc.setQueryData(["attachments", taskId], (old: AttachmentResponse[] | undefined) =>
                old?.filter(a => a.id !== attachmentId)
            )
            qc.setQueryData(["task", projectId, taskId], (old: any) =>
                old?.task
                    ? { ...old, task: { ...old.task, attachmentCount: Math.max(0, Number(old.task.attachmentCount ?? 0) - 1) } }
                    : old
            )
            qc.invalidateQueries({ queryKey: ["activity", projectId, taskId] })
            toast.success("Đã xóa file")
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["attachments", taskId] })
            qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
            qc.invalidateQueries({ queryKey: ["activity", projectId, taskId] })
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Không thể xóa file")
        },
    })
}

export function usePreviewUrl(attachmentId: string | null) {
    return useQuery({
        queryKey: ["attachment-preview", attachmentId],
        queryFn: () => TaskDetailService.getPreviewUrl(attachmentId!),
        enabled: !!attachmentId,
        staleTime: 10 * 60_000,
    })
}
