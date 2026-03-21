"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { TaskDetailService } from "@/app/services/TaskDetailService"
import type { ChecklistItemResponse } from "@/app/types/task.schema"

export function useChecklists(taskId: string) {
    return useQuery({
        queryKey: ["checklist", taskId],
        queryFn: () => TaskDetailService.getChecklist(taskId),
        staleTime: 30_000,
        enabled: !!taskId,
    })
}

export function useAddChecklistItem(taskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (title: string) => TaskDetailService.addChecklistItem(taskId, title),
        onSuccess: (newItem) => {
            qc.setQueryData(["checklist", taskId], (old: { total: number; completed: number; items: ChecklistItemResponse[] } | undefined) => {
                if (!old) return { total: 1, completed: 0, items: [newItem] }
                return { ...old, total: old.total + 1, items: [...old.items, newItem] }
            })
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Unable to add checklist item")
        },
    })
}

export function useUpdateChecklistItem(taskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ itemId, data }: { itemId: string; data: { title?: string; isDone?: boolean } }) =>
            TaskDetailService.updateChecklistItem(itemId, data),
        onMutate: async ({ itemId, data }) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await qc.cancelQueries({ queryKey: ["checklist", taskId] })

            // Snapshot the previous value
            const prev = qc.getQueryData(["checklist", taskId])

            // Optimistically update to the new value
            qc.setQueryData(["checklist", taskId], (old: any) => {
                if (!old) return old
                const updated = old.items.map((i: ChecklistItemResponse) =>
                    i.id === itemId ? { ...i, ...data } : i
                )
                const completed = updated.filter((i: ChecklistItemResponse) => i.isDone).length
                return { ...old, completed, items: updated }
            })

            // Return a context object with the snapshotted value
            return { prev }
        },
        onSuccess: (updatedItem) => {
            // Update the specific item in cache with the real data from server
            qc.setQueryData(["checklist", taskId], (old: any) => {
                if (!old) return old
                const updated = old.items.map((i: ChecklistItemResponse) =>
                    i.id === updatedItem.id ? updatedItem : i
                )
                const completed = updated.filter((i: ChecklistItemResponse) => i.isDone).length
                return { ...old, completed, items: updated }
            })
            // Also invalidate task detail to keep total counts/badges in sync, 
            // but we don't invalidate checklist itself immediately to avoid flash
            qc.invalidateQueries({ queryKey: ["task"] })
        },
        onError: (_err, _vars, ctx) => {
            // Roll back to the previous value if mutation fails
            if (ctx?.prev) qc.setQueryData(["checklist", taskId], ctx.prev)
            toast.error("Unable to update checklist")
        },
        // Remove onSettled invalidate to prevent overwrite by old server state
    })
}

export function useDeleteChecklistItem(taskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (itemId: string) => TaskDetailService.deleteChecklistItem(itemId),
        onSuccess: (_, itemId) => {
            qc.setQueryData(["checklist", taskId], (old: any) => {
                if (!old) return old
                const updated = old.items.filter((i: ChecklistItemResponse) => i.id !== itemId)
                const completed = updated.filter((i: ChecklistItemResponse) => i.isDone).length
                return { ...old, total: updated.length, completed, items: updated }
            })
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Unable to delete checklist item")
        },
    })
}

export function useReorderChecklist(taskId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (orderedIds: string[]) => TaskDetailService.reorderChecklist(taskId, orderedIds),
        onError: () => {
            qc.invalidateQueries({ queryKey: ["checklist", taskId] })
            toast.error("Unable to reorder checklist")
        },
    })
}
