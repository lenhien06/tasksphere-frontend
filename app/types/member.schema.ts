import { z } from "zod";

// 1. Enums defined per spec (lowercase)
export const ProjectRoleEnum = z.enum(["project_manager", "member", "viewer"]);
export const InviteStatusEnum = z.enum(["pending", "accepted", "declined", "revoked", "expired"]);

export type ProjectRole = z.infer<typeof ProjectRoleEnum>;
export type InviteStatus = z.infer<typeof InviteStatusEnum>;

// 2. Invite Member Form Schema
export const InviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: ProjectRoleEnum.default("member")
});

export type InviteMemberRequest = z.infer<typeof InviteMemberSchema>;

// 3. Schema cho Member UI
export interface ProjectMember {
    id: string; // Member ID
    user: {
        id: string;
        fullName: string;
        email: string;
        avatarUrl?: string;
    };
    projectRole: ProjectRole;
    joinedAt: string;
}

// 4. Interface cho Pending Invite
export interface PendingInvite {
    id: string;
    email: string;
    role: string; // BE returns uppercase: "MEMBER", "PROJECT_MANAGER", "VIEWER"
    status: string; // BE returns uppercase: "PENDING", "ACCEPTED", "DECLINED", "REVOKED", "EXPIRED"
    inviterName: string;
    invitedAt: string;
    expiresAt: string;
    daysLeft: number | null; // null if status is not PENDING; 0 = expires today
}

// 5. Invite Response (supports isNewUser)
export interface InviteMemberResponse {
    email: string;
    role: ProjectRole;
    status: "accepted" | "pending";
    isNewUser: boolean;
}

// 6. Verify Token Response
export interface VerifyInviteResponse {
    projectId: string;
    projectName: string;
    inviterName: string;
    inviteeEmail: string;
    role: ProjectRole;
    expiresAt: string;
}
