import { apiJava } from "@/lib/axios";
import { ApiResponse } from "@/app/types/common..schema";
import { UserProfileResponse } from "@/app/services/profile.service";
import {
  Workspace,
  WorkspaceMember,
  CreateWorkspaceRequest,
  InviteMemberRequest,
  VerifyWorkspaceInviteResponse,
  WorkspaceInviteResponse,
  WorkspaceInviteListItem,
  WorkspaceHealthMetrics,
  WorkspaceMyInviteItem,
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

  /** Dashboard sức khỏe workspace. */
  getHealthMetrics: async (wsId: string) => {
    const response = await apiJava.get<ApiResponse<WorkspaceHealthMetrics>>(
      `/v1/workspaces/${wsId}/health-metrics`
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

  /** Profile của một thành viên trong workspace. */
  getMemberProfile: async (wsId: string, userId: string) => {
    const response = await apiJava.get<ApiResponse<UserProfileResponse>>(
      `/v1/workspaces/${wsId}/members/${userId}/profile`
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

  getInvites: async (
    wsId: string,
    params: { status?: string; page?: number; size?: number } = {}
  ): Promise<{ invites: WorkspaceInviteListItem[]; totalPages: number; totalElements: number }> => {
    const response = await apiJava.get<ApiResponse<{ content: WorkspaceInviteListItem[]; totalPages: number; totalElements: number }>>(
      `/v1/workspaces/${wsId}/invites`,
      { params }
    );
    return {
      invites: response.data?.data?.content ?? [],
      totalPages: response.data?.data?.totalPages ?? 0,
      totalElements: response.data?.data?.totalElements ?? 0,
    };
  },

  revokeInvite: async (wsId: string, inviteId: string) => {
    const response = await apiJava.delete<ApiResponse<null>>(
      `/v1/workspaces/${wsId}/invites/${inviteId}`
    );
    return { message: response.data.message };
  },

  resendInvite: async (wsId: string, inviteId: string) => {
    const response = await apiJava.post<ApiResponse<null>>(
      `/v1/workspaces/${wsId}/invites/${inviteId}/resend`
    );
    return { message: response.data.message };
  },

  getMyWorkspaceInvites: async (signal?: AbortSignal): Promise<WorkspaceMyInviteItem[]> => {
    const response = await apiJava.get<ApiResponse<WorkspaceMyInviteItem[]>>(
      "/v1/users/me/workspace-invites",
      { signal }
    );
    return response.data?.data ?? [];
  },

  verifyInviteToken: async (token: string) => {
    const response = await apiJava.get<ApiResponse<VerifyWorkspaceInviteResponse>>(
      `/v1/workspace-invites/${token}`
    );
    return response.data.data;
  },

  acceptInvite: async (token: string) => {
    const response = await apiJava.post<ApiResponse<Workspace>>(
      `/v1/workspace-invites/${token}/accept`
    );
    return {
      workspace: response.data.data,
      message: response.data.message,
    };
  },

  declineInvite: async (token: string) => {
    const response = await apiJava.post<ApiResponse<null>>(
      `/v1/workspace-invites/${token}/decline`
    );
    return { message: response.data.message };
  },
};
