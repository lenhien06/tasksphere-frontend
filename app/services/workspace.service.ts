import { apiJava } from "@/lib/axios";
import { ApiResponse } from "@/app/types/common..schema";
import {
  Workspace,
  WorkspaceMember,
  CreateWorkspaceRequest,
  InviteMemberRequest,
  WorkspaceInviteResponse,
} from "@/app/types/workspace.schema";

export const WorkspaceService = {
  // ── Workspace CRUD ──────────────────────────────────────────────────────────

  /** Tạo workspace mới. */
  create: async (data: CreateWorkspaceRequest) => {
    const response = await apiJava.post<ApiResponse<Workspace>>(
      "/v1/workspaces",
      data
    );
    return response.data;
  },

  /** Danh sách workspace của user hiện tại. */
  getMyWorkspaces: async () => {
    const response = await apiJava.get<ApiResponse<Workspace[]>>(
      "/v1/workspaces"
    );
    return response.data;
  },

  /** Chi tiết workspace theo slug. */
  getBySlug: async (slug: string) => {
    const response = await apiJava.get<ApiResponse<Workspace>>(
      `/v1/workspaces/${slug}`
    );
    return response.data;
  },

  /** Cập nhật workspace. */
  update: async (
    wsId: string,
    data: { name: string; description?: string; avatarUrl?: string }
  ) => {
    const response = await apiJava.put<ApiResponse<Workspace>>(
      `/v1/workspaces/${wsId}`,
      data
    );
    return response.data;
  },

  /** Xoá workspace (OWNER only). */
  delete: async (wsId: string) => {
    const response = await apiJava.delete<ApiResponse<null>>(
      `/v1/workspaces/${wsId}`
    );
    return response.data;
  },

  // ── Members ─────────────────────────────────────────────────────────────────

  /** Mời thành viên vào workspace. */
  inviteMember: async (wsId: string, data: InviteMemberRequest) => {
    const response = await apiJava.post<ApiResponse<WorkspaceInviteResponse>>(
      `/v1/workspaces/${wsId}/members`,
      data
    );
    return response.data;
  },

  /** Danh sách thành viên. */
  getMembers: async (wsId: string) => {
    const response = await apiJava.get<ApiResponse<WorkspaceMember[]>>(
      `/v1/workspaces/${wsId}/members`
    );
    return response.data;
  },

  /** Cập nhật skill tags của thành viên. */
  updateMemberSkills: async (
    wsId: string,
    userId: string,
    skillTags: string[]
  ) => {
    const response = await apiJava.patch<ApiResponse<WorkspaceMember>>(
      `/v1/workspaces/${wsId}/members/${userId}/skills`,
      { skillTags }
    );
    return response.data;
  },

  /** Xoá thành viên khỏi workspace. */
  removeMember: async (wsId: string, userId: string) => {
    const response = await apiJava.delete<ApiResponse<null>>(
      `/v1/workspaces/${wsId}/members/${userId}`
    );
    return response.data;
  },
};
