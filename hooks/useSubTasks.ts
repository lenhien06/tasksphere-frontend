"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { TaskDetailService } from "@/app/services/TaskDetailService"
import { TaskService } from "@/app/services/TaskService"
import type { SubTaskResponse, TaskStatus, PromoteSubTaskRequestBody, CreateTaskRequest } from "@/app/types/task.schema"
import { invalidateTaskCollections } from "@/lib/task-query-sync"

export function useSubTasks(taskId: string) {
    return useQuery({
        queryKey: ["subtasks", taskId],
        queryFn: () => TaskDetailService.getSubtasks(taskId),
        staleTime: 30_000,
        enabled: !!taskId,
    })
}

export function useAddSubTask(projectId: string, parentTaskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: CreateTaskRequest) => TaskDetailService.addSubtask(parentTaskId, payload),
        onSuccess: (newSub) => {
            qc.setQueryData(["subtasks", parentTaskId], (old: SubTaskResponse[] | undefined) =>
                old ? [...old, newSub] : [newSub]
            )
            qc.invalidateQueries({ queryKey: ["task", projectId, parentTaskId] })
            invalidateTaskCollections(qc, projectId)
            toast.success(`Sub-task ${newSub.taskCode} was created.`)
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Unable to create sub-task")
        },
    })
}

export function useUpdateSubTaskStatus(projectId: string, parentTaskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus; columnId?: string }) =>
            TaskService.updateStatus(projectId, taskId, { status }),
        onMutate: async ({ taskId, status }) => {
            await qc.cancelQueries({ queryKey: ["subtasks", parentTaskId] })
            const prev = qc.getQueryData<SubTaskResponse[]>(["subtasks", parentTaskId])
            qc.setQueryData(["subtasks", parentTaskId], (old: SubTaskResponse[] | undefined) =>
                old?.map(s => s.id === taskId ? { ...s, taskStatus: status } : s)
            )
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(["subtasks", parentTaskId], ctx.prev)
            toast.error("Unable to update status")
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["subtasks", parentTaskId] })
            qc.invalidateQueries({ queryKey: ["task", projectId, parentTaskId] })
            invalidateTaskCollections(qc, projectId)
        },
    })
}

export function usePromoteSubTask(projectId: string, parentTaskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (vars: { subtaskId: string; payload?: PromoteSubTaskRequestBody }) =>
            TaskDetailService.promoteSubtask(vars.subtaskId, vars.payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["subtasks", parentTaskId] })
            qc.invalidateQueries({ queryKey: ["task", projectId, parentTaskId] })
            invalidateTaskCollections(qc, projectId)
            toast.success("Sub-task was promoted to an independent task.")
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Unable to promote sub-task")
        },
    })
}

export function useDeleteSubTask(projectId: string, parentTaskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (subtaskId: string) => TaskDetailService.deleteSubtask(projectId, subtaskId),
        onSuccess: (_, subtaskId) => {
            qc.setQueryData(["subtasks", parentTaskId], (old: SubTaskResponse[] | undefined) =>
                old?.filter(s => s.id !== subtaskId)
            )
            qc.invalidateQueries({ queryKey: ["task", projectId, parentTaskId] })
            toast.success("Sub-task was deleted.")
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Unable to delete sub-task")
        },
    })
}
