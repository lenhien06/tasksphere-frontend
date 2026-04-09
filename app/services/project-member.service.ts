import { apiJava } from '@/lib/axios';
import {
    ProjectMember,
    InviteMemberRequest,
    InviteMemberResponse,
    ProjectRole,
    VerifyInviteResponse,
    ProjectInviteListItem,
    AddMemberRequest,
    MemberSearchResponse,
    ProjectInviteResponse,
} from '@/app/types/member.schema';
import { ApiResponse, PageResponse } from '@/app/types/common..schema';

export { type ProjectRole };

/**
 * Member & Invite - aligned with `/api/v1` (apiJava baseURL = NEXT_PUBLIC_API_URL, for example .../api)
 */
export class ProjectMemberService {
    private static readonly PREFIX = '/v1/projects';

    private static metaMessage(res: { data?: { meta?: { message?: string } } }): string {
        const m = res.data?.meta?.message;
        return typeof m === 'string' ? m : '';
    }

    /** A1 GET .../members */
    static async getMembers(projectId: string): Promise<ProjectMember[]> {
        const response = await apiJava.get<ApiResponse<ProjectMember[]>>(`${this.PREFIX}/${projectId}/members`);
        return response.data?.data ?? [];
    }

    /** A2 POST .../members */
    static async addMember(projectId: string, body: AddMemberRequest): Promise<ProjectMember> {
        const response = await apiJava.post<ApiResponse<ProjectMember>>(`${this.PREFIX}/${projectId}/members`, body);
        const row = response.data?.data;
        if (!row) throw new Error('Invalid add member response');
        return row;
    }

    /** A3 DELETE .../members/{userId} */
    static async removeMember(projectId: string, userId: string): Promise<{ message: string }> {
        const response = await apiJava.delete<ApiResponse<null>>(`${this.PREFIX}/${projectId}/members/${userId}`);
        return { message: this.metaMessage(response) || 'Member removed from project.' };
    }

    /** A4 GET .../members/search?q= */
    static async searchMembers(projectId: string, q: string): Promise<MemberSearchResponse[]> {
        const response = await apiJava.get<ApiResponse<MemberSearchResponse[]>>(
            `${this.PREFIX}/${projectId}/members/search`,
            { params: { q: q ?? '' } }
        );
        return response.data?.data ?? [];
    }

    /** A5 PATCH .../members/{userId}/role */
    static async updateRole(projectId: string, userId: string, role: ProjectRole): Promise<{ message: string }> {
        const response = await apiJava.patch<ApiResponse<null>>(
            `${this.PREFIX}/${projectId}/members/${userId}/role`,
            { role }
        );
        return { message: this.metaMessage(response) || 'Role updated.' };
    }

    /** A6 DELETE .../members/leave */
    static async leaveProject(projectId: string): Promise<{ message: string }> {
        const response = await apiJava.delete<ApiResponse<null>>(`${this.PREFIX}/${projectId}/members/leave`);
        return { message: this.metaMessage(response) || 'You left the project.' };
    }

    /** A7 POST .../invites */
    static async inviteMember(
        projectId: string,
        data: InviteMemberRequest
    ): Promise<{ data: InviteMemberResponse; meta?: unknown }> {
        const response = await apiJava.post<ApiResponse<InviteMemberResponse>>(`${this.PREFIX}/${projectId}/invites`, data);
        const row = response.data?.data;
        if (!row) throw new Error('Invalid invite response');
        return { data: row, meta: response.data.meta };
    }

    /** A8 GET .../invites — default status PENDING */
    static async getPendingInvites(
        projectId: string,
        params: {
            status?: string;
            page?: number;
            size?: number;
            sort?: string;
        } = {}
    ): Promise<{ invites: ProjectInviteListItem[]; totalPages: number; totalElements: number }> {
        const queryParams: Record<string, unknown> = {
            page: params.page ?? 0,
            size: params.size ?? 20,
            sort: params.sort || 'createdAt,desc',
            status: (params.status ?? 'PENDING').toUpperCase(),
        };
        const response = await apiJava.get<ApiResponse<PageResponse<ProjectInviteListItem>>>(
            `${this.PREFIX}/${projectId}/invites`,
            { params: queryParams }
        );
        return {
            invites: response.data?.data?.content ?? [],
            totalPages: response.data?.data?.totalPages ?? 0,
            totalElements: response.data?.data?.totalElements ?? 0,
        };
    }

    /** A9 DELETE .../invites/{inviteId} */
    static async revokeInvite(projectId: string, inviteId: string): Promise<{ message: string }> {
        const response = await apiJava.delete<ApiResponse<null>>(`${this.PREFIX}/${projectId}/invites/${inviteId}`);
        return { message: this.metaMessage(response) || 'Invite revoked.' };
    }

    /** A10 POST .../invites/{inviteId}/resend */
    static async resendInvite(projectId: string, inviteId: string): Promise<{ message: string }> {
        const response = await apiJava.post<ApiResponse<null>>(
            `${this.PREFIX}/${projectId}/invites/${inviteId}/resend`
        );
        return { message: this.metaMessage(response) || 'Invite resent.' };
    }

    /** B4 GET /v1/users/me/invites */
    static async getMyInvites(signal?: AbortSignal): Promise<ProjectInviteResponse[]> {
        const response = await apiJava.get<ApiResponse<ProjectInviteResponse[]>>('/v1/users/me/invites', { signal });
        return response.data?.data ?? [];
    }

    /** B1 GET /v1/invites/{token} - Public (JWT not required) */
    static async verifyInviteToken(token: string): Promise<VerifyInviteResponse> {
        const response = await apiJava.get<ApiResponse<VerifyInviteResponse>>(`/v1/invites/${encodeURIComponent(token)}`);
        const payload = response.data?.data;
        if (!payload) throw new Error('Invalid invite preview response');
        return payload;
    }

    /** B2 POST /v1/invites/{token}/accept */
    static async acceptInvite(token: string): Promise<{ projectId: string; message: string }> {
        const response = await apiJava.post<ApiResponse<{ projectId: string }>>(`/v1/invites/${encodeURIComponent(token)}/accept`);
        const pid = response.data?.data?.projectId;
        if (!pid) throw new Error('Invalid accept invite response');
        return {
            projectId: pid,
            message: this.metaMessage(response) || 'Đã chấp nhận lời mời.',
        };
    }

    /** B3 POST /v1/invites/{token}/decline */
    static async declineInvite(token: string): Promise<{ message: string }> {
        const response = await apiJava.post<ApiResponse<null>>(`/v1/invites/${encodeURIComponent(token)}/decline`);
        return { message: this.metaMessage(response) || 'Đã từ chối lời mời.' };
    }
}
