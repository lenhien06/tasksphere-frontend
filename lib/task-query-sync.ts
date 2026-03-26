"use client"

import type { QueryClient } from "@tanstack/react-query"

const mergeTaskIntoList = (old: any, taskId: string, patch: Record<string, unknown>) => {
    if (!old) return old

    if (Array.isArray(old)) {
        return old.map((task) => (task?.id === taskId ? { ...task, ...patch } : task))
    }

    if (Array.isArray(old?.content)) {
        return {
            ...old,
            content: old.content.map((task: any) =>
                task?.id === taskId ? { ...task, ...patch } : task
            ),
        }
    }

    if (Array.isArray(old?.tasks)) {
        return {
            ...old,
            tasks: old.tasks.map((task: any) =>
                task?.id === taskId ? { ...task, ...patch } : task
            ),
        }
    }

    return old
}

export const patchTaskCollections = (
    queryClient: QueryClient,
    projectId: string,
    taskId: string,
    patch: Record<string, unknown>
) => {
    queryClient.setQueriesData({ queryKey: ["tasks", projectId] }, (old: any) =>
        mergeTaskIntoList(old, taskId, patch)
    )
    queryClient.setQueriesData({ queryKey: ["backlog", projectId] }, (old: any) =>
        mergeTaskIntoList(old, taskId, patch)
    )
    queryClient.setQueriesData({ queryKey: ["sprint-tasks", projectId] }, (old: any) =>
        mergeTaskIntoList(old, taskId, patch)
    )
    queryClient.setQueriesData({ queryKey: ["calendar", projectId] }, (old: any) =>
        mergeTaskIntoList(old, taskId, patch)
    )
}

export const invalidateTaskCollections = (queryClient: QueryClient, projectId: string) => {
    queryClient.invalidateQueries({ queryKey: ["tasks", projectId], exact: false })
    queryClient.invalidateQueries({ queryKey: ["backlog", projectId], exact: false })
    queryClient.invalidateQueries({ queryKey: ["sprint-tasks", projectId], exact: false })
    queryClient.invalidateQueries({ queryKey: ["calendar", projectId], exact: false })
}
