import { ApiResponse } from "@/app/types/common..schema";
import { DashboardResponse } from "@/app/types/dashboard.schema";
import { apiJava } from "@/lib/axios";

export const DashboardService = {
  getMe: async (upcomingDays = 5) => {
    const response = await apiJava.get<ApiResponse<DashboardResponse>>(
      "/v1/dashboard/me",
      {
        params: { upcomingDays },
      }
    );

    return response.data;
  },
};
