"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { TaskDetailService } from "@/app/services/TaskDetailService"
import type { AttachmentResponse } from "@/app/types/task.schema"

const ALLOWED_EXTENSIONS = [
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".png", ".jpg", ".jpeg", ".gif", ".zip", ".txt", ".csv", ".md",
]

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
    return useMutation({
        mutationFn: (file: File) => TaskDetailService.uploadAttachment(projectId, taskId, file),
        onSuccess: (newAttachment) => {
            qc.setQueryData(["attachments", taskId], (old: AttachmentResponse[] | undefined) =>
                old
                    ? [newAttachment, ...old.filter(a => a.id !== newAttachment.id)]
                    : [newAttachment]
            )
            qc.setQueryData(["task", projectId, taskId], (old: any) =>
                old?.task
                    ? {
                          ...old,
                          task: {
                              ...old.task,
                              attachmentCount: Number(old.task.attachmentCount ?? 0) + 1,
                          },
                      }
                    : old
            )
            toast.success("File uploaded successfully")
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["attachments", taskId] })
            qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
        },
        onError: (err: any) => {
            const status = err?.response?.status
            if (status === 413) toast.error("File too large (max 25MB)")
            else if (status === 415) toast.error("File format not supported")
            else if (status === 422) toast.error("Malware detected, file rejected")
            else toast.error(err?.response?.data?.message ?? "Unable to upload file")
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
                    ? {
                          ...old,
                          task: {
                              ...old.task,
                              attachmentCount: Math.max(0, Number(old.task.attachmentCount ?? 0) - 1),
                          },
                      }
                    : old
            )
            toast.success("Attachment deleted")
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["attachments", taskId] })
            qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Unable to delete file")
        },
    })
}

export function usePreviewUrl(attachmentId: string | null) {
    return useQuery({
        queryKey: ["attachment-preview", attachmentId],
        queryFn: () => TaskDetailService.getPreviewUrl(attachmentId!),
        enabled: !!attachmentId,
        staleTime: 10 * 60_000, // 10 min
    })
}
