import { apiJava } from "@/lib/axios";
import type {
  AnalyzeDescriptionResponse,
  GenerateProjectPlanResponse,
  ConfirmProjectPlanRequest,
  ConfirmProjectPlanResponse,
} from "@/app/types/workspace-ai";

interface ApiWrapper<T> {
  data: T;
}

export const WorkspaceAiService = {
  /** Bước 1: Phân tích mô tả, trả về câu hỏi còn thiếu */
  analyzeDescription: async (
    wsId: string,
    description: string
  ): Promise<AnalyzeDescriptionResponse> => {
    const { data } = await apiJava.post<ApiWrapper<AnalyzeDescriptionResponse>>(
      `/v1/workspaces/${wsId}/ai/analyze-description`,
      { description }
    );
    return data.data;
  },

  /** Bước 2: Sinh project plan hoàn chỉnh */
  generateProjectPlan: async (
    wsId: string,
    payload: {
      description: string;
      techStack?: string;
      deadlineWeeks?: number;
      memberIds?: string[];
    }
  ): Promise<GenerateProjectPlanResponse> => {
    const { data } = await apiJava.post<ApiWrapper<GenerateProjectPlanResponse>>(
      `/v1/workspaces/${wsId}/ai/generate-project-plan`,
      payload
    );
    return data.data;
  },

  /** Bước 3: Confirm plan → tạo tất cả vào DB */
  confirmProjectPlan: async (
    wsId: string,
    payload: ConfirmProjectPlanRequest
  ): Promise<ConfirmProjectPlanResponse> => {
    const { data } = await apiJava.post<ApiWrapper<ConfirmProjectPlanResponse>>(
      `/v1/workspaces/${wsId}/ai/confirm-project-plan`,
      payload
    );
    return data.data;
  },
};
