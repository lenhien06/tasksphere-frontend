"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { TaskDetailService } from "@/app/services/TaskDetailService"
import { TaskService } from "@/app/services/TaskService"
import type { SubTaskResponse, TaskStatus } from "@/app/types/task.schema"

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
        mutationFn: (title: string) => TaskDetailService.addSubtask(parentTaskId, title),
        onSuccess: (newSub) => {
            qc.setQueryData(["subtasks", parentTaskId], (old: SubTaskResponse[] | undefined) =>
                old ? [...old, newSub] : [newSub]
            )
            qc.invalidateQueries({ queryKey: ["task", projectId, parentTaskId] })
            toast.success(`Sub-task ${newSub.taskCode} created`)
        },
        onError: (err: any) => {
            const status = err?.response?.status
            if (status === 422) toast.error(err?.response?.data?.message ?? "Maximum 3 sub-task levels reached")
            else toast.error(err?.response?.data?.message ?? "Unable to create sub-task")
        },
    })
}

export function useUpdateSubTaskStatus(projectId: string, parentTaskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ taskId, status, columnId }: { taskId: string; status: TaskStatus; columnId: string }) =>
            TaskService.updateStatus(projectId, taskId, { status, statusColumnId: columnId }),
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
        },
    })
}

export function usePromoteSubTask(projectId: string, parentTaskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (subtaskId: string) => TaskDetailService.promoteSubtask(subtaskId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["subtasks", parentTaskId] })
            qc.invalidateQueries({ queryKey: ["task", projectId, parentTaskId] })
            toast.success("Sub-task promoted to independent task")
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Unable to promote sub-task")
        },
    })
}
