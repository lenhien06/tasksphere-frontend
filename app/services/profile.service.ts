import { apiJava } from '@/lib/axios';

export interface UserProfileResponse {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  bio: string | null;
  skillTags: string[];
  workCapacityHours: number;
  participatedProjects: ParticipatedProject[];
}

export interface ParticipatedProject {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  role: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  jobTitle?: string;
  bio?: string;
  workCapacityHours?: number;
}

export interface MemberSkillResponse {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  skillTags: string[];
  activeTaskCount: number;
  avgStoryPoints: number | null;
  workCapacityHours: number;
}

export interface InviteePreviewResponse {
  email: string;
  existsInSystem: boolean;
  userId?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  skillTags: string[];
}

export const ProfileService = {
  async getProfile(): Promise<UserProfileResponse> {
    const { data } = await apiJava.get<{ data: UserProfileResponse }>('/v1/users/me/profile');
    return data.data;
  },

  async updateProfile(payload: UpdateProfileRequest): Promise<UserProfileResponse> {
    const { data } = await apiJava.put<{ data: UserProfileResponse }>('/v1/users/me/profile', payload);
    return data.data;
  },

  async updateSkillTags(skillTags: string[]): Promise<string[]> {
    const { data } = await apiJava.patch<{ data: { userId: string; skillTags: string[] } }>(
      '/v1/users/me/skill-tags',
      { skillTags },
    );
    return data.data.skillTags;
  },

  async getProjectMemberSkills(projectId: string): Promise<MemberSkillResponse[]> {
    const { data } = await apiJava.get<{ data: MemberSkillResponse[] }>(
      `/v1/projects/${projectId}/members/skills`,
    );
    return data.data;
  },

  async updateMemberSkills(projectId: string, userId: string, skillTags: string[]): Promise<MemberSkillResponse> {
    const { data } = await apiJava.patch<{ data: MemberSkillResponse }>(
      `/v1/projects/${projectId}/members/${userId}/skills`,
      { skillTags },
    );
    return data.data;
  },

  async getInviteePreview(email: string): Promise<InviteePreviewResponse> {
    const { data } = await apiJava.get<{ data: InviteePreviewResponse }>(
      "/v1/users/invite-preview",
      { params: { email } }
    );
    return data.data;
  },

  async exportUserCsv(userId: string): Promise<Blob> {
    const response = await apiJava.get(`/v1/users/${userId}/export-csv`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
