import { apiJava } from "@/lib/axios"
import type {
    ChecklistItemResponse,
    CommentResponse,
    AttachmentResponse,
    WorklogResponse,
    WorklogSummary,
    SubTaskResponse,
    TaskDetailResponse,
    PromoteSubTaskRequestBody,
} from "@/app/types/task.schema"

export const TaskDetailService = {

    // ════════════ CHECKLIST ════════════

    getChecklist: (taskId: string) =>
        apiJava.get(`/v1/tasks/${taskId}/checklist`)
            .then(r => r.data.data as { total: number; completed: number; items: ChecklistItemResponse[] }),

    addChecklistItem: (taskId: string, title: string) =>
        apiJava.post(`/v1/tasks/${taskId}/checklist`, { title })
            .then(r => r.data.data as ChecklistItemResponse),

    updateChecklistItem: (itemId: string, data: { title?: string; isDone?: boolean }) =>
        apiJava.patch(`/v1/checklist/${itemId}`, data)
            .then(r => r.data.data as ChecklistItemResponse),

    deleteChecklistItem: (itemId: string) =>
        apiJava.delete(`/v1/checklist/${itemId}`),

    reorderChecklist: (taskId: string, orderedIds: string[]) =>
        apiJava.patch(`/v1/tasks/${taskId}/checklist/reorder`, { orderedIds }),

    // ════════════ COMMENT ════════════

    getComments: (projectId: string, taskId: string) =>
        apiJava.get(`/v1/projects/${projectId}/tasks/${taskId}/comments`, { params: { page: 0, size: 50 } })
            .then(r => r.data.data.content as CommentResponse[]),

    addComment: (projectId: string, taskId: string, content: string, parentId?: string) =>
        apiJava.post(`/v1/projects/${projectId}/tasks/${taskId}/comments`, { content, parentId: parentId ?? null })
            .then(r => r.data.data as CommentResponse),

    updateComment: (commentId: string, content: string) =>
        apiJava.put(`/v1/comments/${commentId}`, { content })
            .then(r => r.data.data as CommentResponse),

    deleteComment: (commentId: string) =>
        apiJava.delete(`/v1/comments/${commentId}`),

    // ════════════ ATTACHMENT ════════════

    getAttachments: (projectId: string, taskId: string) =>
        apiJava.get(`/v1/projects/${projectId}/tasks/${taskId}/attachments`)
            .then(r => r.data.data as AttachmentResponse[]),

    uploadAttachment: (projectId: string, taskId: string, file: File) => {
        const form = new FormData()
        form.append("file", file)
        // BE returns 202 Accepted with { jobId } for async virus scan
        return apiJava.post(`/v1/projects/${projectId}/tasks/${taskId}/attachments`, form, {
            headers: { "Content-Type": "multipart/form-data" },
        }).then(r => r.data.data as { jobId: string } | AttachmentResponse)
    },

    pollAttachmentJob: (jobId: string) =>
        apiJava.get(`/v1/attachments/jobs/${jobId}`)
            .then(r => r.data.data as { jobId: string; status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"; fileName?: string }),

    getPreviewUrl: (attachmentId: string) =>
        apiJava.get(`/v1/attachments/${attachmentId}/preview-url`)
            .then(r => r.data.data as { previewUrl: string; mimeType: string; expiresAt: string }),

    deleteAttachment: (attachmentId: string) =>
        apiJava.delete(`/v1/attachments/${attachmentId}`),

    uploadCommentAttachment: (projectId: string, taskId: string, commentId: string, file: File) => {
        const form = new FormData()
        form.append("file", file)
        return apiJava.post(
            `/v1/projects/${projectId}/tasks/${taskId}/comments/${commentId}/attachments`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } }
        ).then(r => r.data.data as AttachmentResponse)
    },

    // ════════════ WORKLOG ════════════

    getWorklogs: (taskId: string) =>
        apiJava.get(`/v1/tasks/${taskId}/worklogs`)
            .then(r => r.data.data as WorklogSummary),

    addWorklog: (taskId: string, data: { timeSpent: number; logDate: string; note?: string }) =>
        apiJava.post(`/v1/tasks/${taskId}/worklogs`, data)
            .then(r => r.data.data as WorklogResponse),

    updateWorklog: (worklogId: string, data: { timeSpent?: number; logDate?: string; note?: string }) =>
        apiJava.put(`/v1/worklogs/${worklogId}`, data)
            .then(r => r.data.data as WorklogResponse),

    deleteWorklog: (worklogId: string) =>
        apiJava.delete(`/v1/worklogs/${worklogId}`),

    // ════════════ SUB-TASK ════════════

    getSubtasks: (taskId: string) =>
        apiJava.get(`/v1/tasks/${taskId}/subtasks`)
            .then(r => r.data.data as SubTaskResponse[]),

    addSubtask: (parentTaskId: string, title: string) =>
        apiJava.post(`/v1/tasks/${parentTaskId}/subtasks`, { title })
            .then(r => r.data.data as SubTaskResponse),

    promoteSubtask: (subtaskId: string, body?: PromoteSubTaskRequestBody) =>
        apiJava.post(`/v1/tasks/${subtaskId}/promote`, body ?? {})
            .then(r => r.data.data as TaskDetailResponse),

    deleteSubtask: (projectId: string, subtaskId: string) =>
        apiJava.delete(`/v1/projects/${projectId}/tasks/${subtaskId}`)
            .then(() => undefined),

    // ════════════ ACTIVITY LOG ════════════
    getTaskActivity: (
        projectId: string,
        taskId: string,
        params?: { page?: number; size?: number; sort?: string }
    ) =>
        apiJava
            .get(`/v1/projects/${projectId}/activities/tasks/${taskId}/activity`, {
                params: {
                    page: params?.page ?? 0,
                    size: params?.size ?? 20,
                    sort: params?.sort ?? "createdAt,desc",
                },
            })
            .then(r => r.data.data as {
                content: Array<{
                    id: string
                    action: string
                    entityType: string
                    entityId: string
                    actor: {
                        id: string
                        fullName: string
                        avatarUrl: string | null
                    } | null
                    entityLabel: string
                    oldValue: string | null
                    newValue: string | null
                    ipAddress: string
                    createdAt: string
                }>
                totalElements: number
                totalPages: number
                size: number
                number: number
                first: boolean
                last: boolean
                empty: boolean
            }),
}
