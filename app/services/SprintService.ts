import { apiJava } from "@/lib/axios";
import { ApiResponse } from "@/app/types/common..schema";

export interface SprintDto {
    id: string
    name: string
    status: "ACTIVE" | "PLANNED" | "COMPLETED"
    startDate?: string | null
    endDate?: string | null
}

export const SprintService = {
    // GET /v1/projects/{projectId}/sprints
    getByProject: async (projectId: string): Promise<SprintDto[]> => {
        const res = await apiJava.get<ApiResponse<SprintDto[]>>(
            `/v1/projects/${projectId}/sprints`
        );
        return res.data.data;
    },
};
