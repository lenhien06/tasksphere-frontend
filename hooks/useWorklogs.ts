"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { TaskDetailService } from "@/app/services/TaskDetailService"
import type { WorklogResponse } from "@/app/types/task.schema"

export function useWorklogs(taskId: string) {
    return useQuery({
        queryKey: ["worklogs", taskId],
        queryFn: () => TaskDetailService.getWorklogs(taskId),
        staleTime: 30_000,
        enabled: !!taskId,
    })
}

export function useAddWorklog(projectId: string, taskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: { timeSpent: number; logDate: string; note?: string }) =>
            TaskDetailService.addWorklog(taskId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["worklogs", taskId] })
            qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
            toast.success("Work time logged")
        },
        onError: (err: any) => {
            const status = err?.response?.status
            if (status === 422) toast.error(err?.response?.data?.message ?? "Invalid data")
            else toast.error(err?.response?.data?.message ?? "Unable to log worklog")
        },
    })
}

export function useUpdateWorklog(taskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ worklogId, data }: {
            worklogId: string
            data: { timeSpent?: number; logDate?: string; note?: string }
        }) => TaskDetailService.updateWorklog(worklogId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["worklogs", taskId] })
            toast.success("Worklog updated")
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Unable to update worklog")
        },
    })
}

export function useDeleteWorklog(taskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (worklogId: string) => TaskDetailService.deleteWorklog(worklogId),
        onSuccess: (_, worklogId) => {
            qc.setQueryData(["worklogs", taskId], (old: any) => {
                if (!old) return old
                const logs = old.logs.filter((l: WorklogResponse) => l.id !== worklogId)
                const totalSeconds = logs.reduce((sum: number, l: WorklogResponse) => sum + l.timeSpent, 0)
                return { ...old, totalSeconds, logs }
            })
            toast.success("Worklog deleted")
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Unable to delete worklog")
        },
    })
}
