import { apiJava } from "@/lib/axios";
import { Project, ProjectRequest, ProjectUpdateRequest } from "@/app/types/project..schema";
import { PageResponse, ApiResponse } from "@/app/types/common..schema";

export const ProjectService = {
  // Get project list (Pagination & Filtering)
  search: async (params?: {
    q?: string;
    status?: string;
    visibility?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) => {
    const response = await apiJava.get<ApiResponse<PageResponse<Project>>>(
      "/v1/projects",
      { params }
    );
    return response.data;
  },

  // Create a new project
  create: async (data: ProjectRequest) => {
    const response = await apiJava.post<ApiResponse<Project>>(
      "/v1/projects",
      data
    );
    return response.data;
  },

  // Get details by UUID
  getById: async (id: string) => {
    const response = await apiJava.get<ApiResponse<Project>>(
      `/v1/projects/${id}`
    );
    return response.data;
  },

  // Get details by Project Key (Used for URL slug)
  getByKey: async (key: string) => {
    const response = await apiJava.get<ApiResponse<Project>>(
      `/v1/projects/key/${key}`
    );
    return response.data;
  },

  // Update a project
  update: async (id: string, data: ProjectUpdateRequest) => {
    const response = await apiJava.put<ApiResponse<Project>>(
      `/v1/projects/${id}`,
      data
    );
    return response.data;
  },

  // Archive a project (Soft Delete)
  archiveWithConfirmation: async (id: string, confirmName: string) => {
    const response = await apiJava.delete<ApiResponse<null>>(
      `/v1/projects/${id}`
      ,
      {
        data: { confirmName }
      }
    );
    return response.data;
  },

  // Permanently delete a project with name confirmation
  deleteWithConfirmation: async (id: string, confirmName: string) => {
    const response = await apiJava.delete<ApiResponse<null>>(
      `/v1/projects/${id}/permanent`,
      {
        data: { confirmName }
      }
    );
    return response.data;
  },

  // Restore an archived project
  restore: async (id: string) => {
    const response = await apiJava.patch<ApiResponse<Project>>(
      `/v1/projects/${id}/restore`
    );
    return response.data;
  },
};
