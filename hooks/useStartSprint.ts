import { useMutation, useQueryClient } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"

export function useStartSprint(projectId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (sprintId: string) => TaskService.startSprint(sprintId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
            queryClient.invalidateQueries({ queryKey: ["sprint-tasks", projectId] })
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
        },
    })
}
