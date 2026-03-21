import { apiJava } from '@/lib/axios';
import {
    ProjectMember,
    InviteMemberRequest,
    InviteMemberResponse,
    ProjectRole,
    VerifyInviteResponse,
    PendingInvite
} from '@/app/types/member.schema';
import { ApiResponse, PageResponse } from '@/app/types/common..schema';

export { type ProjectRole };

/**
 * ProjectMemberService (SaaS B2B Spec)
 * Base URL: /api/v1 (configured in apiJava)
 */
export class ProjectMemberService {
    private static readonly PREFIX = '/v1/projects';

    // ==========================================
    // 2.1. GET MEMBER LIST
    // ==========================================
    static async getMembers(projectId: string): Promise<ProjectMember[]> {
        const response = await apiJava.get<{ data: ProjectMember[] }>(`${this.PREFIX}/${projectId}/members`);
        return response.data?.data || [];
    }

    // ==========================================
    // 2.3. CHANGE ROLE
    // ==========================================
    static async updateRole(projectId: string, userId: string, role: ProjectRole): Promise<{ message: string }> {
        const response = await apiJava.patch<{ meta: { message: string } }>(`${this.PREFIX}/${projectId}/members/${userId}/role`, { role });
        return { message: response.data.meta.message };
    }

    // ==========================================
    // 2.2. REMOVE MEMBER FROM PROJECT
    // ==========================================
    static async removeMember(projectId: string, userId: string): Promise<{ message: string }> {
        const response = await apiJava.delete<{ meta: { message: string } }>(`${this.PREFIX}/${projectId}/members/${userId}`);
        return { message: response.data.meta.message };
    }

    // ==========================================
    // 3.1. SEND INVITE (Smart branching)
    // ==========================================
    static async inviteMember(projectId: string, data: InviteMemberRequest): Promise<{ data: InviteMemberResponse, meta: any }> {
        const response = await apiJava.post<{ data: InviteMemberResponse, meta: any }>(`${this.PREFIX}/${projectId}/invites`, data);
        return response.data;
    }

    // ==========================================
    // 3.2. GET INVITE LIST
    // ==========================================
    static async getPendingInvites(
        projectId: string,
        params: {
            status?: string;
            page?: number;
            size?: number;
            sort?: string;
        } = {}
    ): Promise<{ invites: PendingInvite[]; totalPages: number; totalElements: number }> {
        const response = await apiJava.get<ApiResponse<PageResponse<PendingInvite>>>(
            `${this.PREFIX}/${projectId}/invites`,
            {
                params: {
                    status: (params.status || 'pending').toUpperCase(),
                    page: params.page ?? 0,
                    size: params.size ?? 20,
                    sort: params.sort || 'createdAt,desc',
                },
            }
        );
        return {
            invites: response.data?.data?.content || [],
            totalPages: response.data?.data?.totalPages ?? 0,
            totalElements: response.data?.data?.totalElements ?? 0,
        };
    }

    // ==========================================
    // 3.3. REVOKE INVITE
    // ==========================================
    static async revokeInvite(projectId: string, inviteId: string): Promise<{ message: string }> {
        const response = await apiJava.delete<{ meta: { message: string } }>(`${this.PREFIX}/${projectId}/invites/${inviteId}`);
        return { message: response.data.meta.message };
    }

    // ==========================================
    // 3.4. RESEND INVITE EMAIL
    // ==========================================
    static async resendInvite(projectId: string, inviteId: string): Promise<{ message: string }> {
        const response = await apiJava.post<{ meta: { message: string } }>(`${this.PREFIX}/${projectId}/invites/${inviteId}/resend`);
        return { message: response.data.meta.message };
    }

    // ==========================================
    // 4.1. GET MY INVITE LIST
    // ==========================================
    static async getMyInvites(): Promise<any[]> {
        const response = await apiJava.get<{ data: any[] }>('/v1/users/me/invites');
        return response.data?.data || [];
    }

    // ==========================================
    // 4.2. VERIFY TOKEN (MAGIC LINK)
    // ==========================================
    static async verifyInviteToken(token: string): Promise<VerifyInviteResponse> {
        const response = await apiJava.get<{ data: VerifyInviteResponse }>('/v1/invites/verify', {
            params: { token }
        });
        return response.data.data;
    }

    // ==========================================
    // 4.3. ACCEPT INVITE (AUTH)
    // ==========================================
    static async acceptInvite(token: string): Promise<{ projectId: string, message: string }> {
        const response = await apiJava.post<{ data: { projectId: string }, meta: { message: string } }>(`/v1/invites/${token}/accept`);
        return { 
            projectId: response.data.data.projectId, 
            message: response.data.meta.message 
        };
    }

    // ==========================================
    // 4.4. DECLINE INVITE (NO AUTH)
    // ==========================================
    static async declineInvite(token: string): Promise<{ message: string }> {
        const response = await apiJava.post<{ meta: { message: string } }>(`/v1/invites/${token}/decline`);
        return { message: response.data.meta.message };
    }
}
