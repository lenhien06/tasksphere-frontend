import { useQuery } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"
import type { TaskFilterParams } from "@/app/types/task.schema"

export function useBacklogTasks(projectId: string, params: TaskFilterParams) {
    return useQuery({
        queryKey: ["backlog", projectId, params],
        queryFn: () => TaskService.getBacklog(projectId, params),
        enabled: !!projectId,
    })
}
