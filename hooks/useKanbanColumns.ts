import { useQuery } from "@tanstack/react-query";
import { TaskService } from "@/app/services/TaskService";
import { ColumnResponse } from "@/app/types/task.schema";

// Fallback columns used when the API fails or returns empty
export const DEFAULT_COLUMNS: ColumnResponse[] = [
    { id: "col-default-todo",   name: "To Do",       colorHex: "#8C8C8C", position: 0, isDefault: true, taskCount: 0 },
    { id: "col-default-doing",  name: "In Progress", colorHex: "#1677FF", position: 1, isDefault: true, taskCount: 0 },
    { id: "col-default-review", name: "In Review",   colorHex: "#722ED1", position: 2, isDefault: true, taskCount: 0 },
    { id: "col-default-done",   name: "Done",        colorHex: "#52C41A", position: 3, isDefault: true, taskCount: 0 },
];

/**
 * Layer 1: Fetch Kanban columns from BE.
 * BE guarantees at least 3 default columns (seeds on-demand if missing).
 * Always call this BEFORE rendering KanbanBoard.
 */
export const useKanbanColumns = (projectId: string) => {
    return useQuery({
        queryKey: ["columns", projectId],
        queryFn: () => TaskService.getColumns(projectId),
        staleTime: 60_000,
        enabled: !!projectId,
        select: (data) => {
            if (!data || data.length === 0) {
                console.error("[useKanbanColumns] API returned empty columns — using defaults");
                return DEFAULT_COLUMNS;
            }
            return [...data].sort((a, b) => a.position - b.position);
        },
    });
};
