import { useQuery } from "@tanstack/react-query";
import { SprintService } from "@/app/services/SprintService";

/**
 * Fetch sprints for a specific project.
 * - Only returns ACTIVE and PLANNED sprints (COMPLETED filtered out)
 * - ACTIVE sprints sorted to the top
 * - queryKey includes projectId so different projects never share cache
 */
export const useProjectSprints = (projectId: string) => {
    return useQuery({
        queryKey: ["sprints", projectId],
        queryFn: () => SprintService.getByProject(projectId),
        enabled: !!projectId,
        staleTime: 30_000,
        select: (data) =>
            [...data]
                .filter(s => s.status === "ACTIVE" || s.status === "PLANNED")
                .sort((a, b) => {
                    if (a.status === "ACTIVE") return -1;
                    if (b.status === "ACTIVE") return 1;
                    return 0;
                }),
    });
};
