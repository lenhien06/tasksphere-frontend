import { useMutation, useQueryClient } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"
import type { CompleteSprintRequest } from "@/app/types/task.schema"

export function useCompleteSprint(projectId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ sprintId, body }: { sprintId: string; body: CompleteSprintRequest }) =>
            TaskService.completeSprint(sprintId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
            queryClient.invalidateQueries({ queryKey: ["sprint-tasks", projectId] })
            queryClient.invalidateQueries({ queryKey: ["backlog", projectId] })
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
        },
    })
}
