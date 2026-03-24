import { useQuery } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"

export function useSprintTasks(projectId: string, sprintId: string | null, enabled: boolean) {
    return useQuery({
        queryKey: ["sprint-tasks", projectId, sprintId],
        queryFn: () =>
            TaskService.getTasks(projectId, {
                sprintId: sprintId!,
                page: 0,
                size: 200,
                sort: "taskPosition,asc",
            }),
        enabled: !!projectId && !!sprintId && enabled,
    })
}
