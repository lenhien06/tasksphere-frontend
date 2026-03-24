import { useQuery } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"

export function useProjectSprints(projectId: string) {
    return useQuery({
        queryKey: ["sprints", projectId],
        queryFn: () => TaskService.getSprints(projectId),
        enabled: !!projectId,
    })
}
