import { z } from "zod";

/** API enum — project roles (spec A1–A6) */
export type ProjectRole = "PROJECT_MANAGER" | "MEMBER" | "VIEWER";

/** Email invite body */
export type InviteEmailRole = "PROJECT_MANAGER" | "MEMBER" | "VIEWER";

/** API enum — invite lifecycle (spec A8, B4) */
export type InviteStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "REVOKED";

/** Zod: gửi lời mời email */
export const InviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["PROJECT_MANAGER", "MEMBER", "VIEWER"]).default("MEMBER"),
  skillTags: z.array(z.string()).optional(),
});

export type InviteMemberRequest = z.infer<typeof InviteMemberSchema>;

/** GET .../members — ProjectMemberResponse */
export interface ProjectMember {
  id: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
  projectRole: ProjectRole;
  joinedAt: string;
  skillTags?: string[];
  activeTaskCount?: number;
  avgStoryPoints?: number | null;
  workCapacityHours?: number;
}

/** GET .../invites — ProjectInviteListItem (spec A8) */
export interface ProjectInviteListItem {
  id: string;
  email: string;
  role: ProjectRole;
  status: InviteStatus | string;
  inviterName: string;
  invitedAt: string;
  expiresAt: string;
  daysLeft: number | null;
}

/** @deprecated alias — dùng ProjectInviteListItem */
export type PendingInvite = ProjectInviteListItem;

/** POST .../invites — 200 (spec A7) */
export interface InviteMemberResponse {
  email: string;
  role: ProjectRole;
  status: string;
  isNewUser: boolean;
}

/** GET /invites/{token} — public (spec B1) */
export interface VerifyInviteResponse {
  projectId: string;
  projectName: string;
  inviterName: string;
  inviteeEmail: string;
  role: ProjectRole;
  expiresAt: string;
}

/** POST .../members — thêm user đã có tài khoản (spec A2) */
export interface AddMemberRequest {
  userId: string;
  role: ProjectRole;
}

/** GET .../members/search — @mention (spec A4) */
export interface MemberSearchResponse {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  projectRole: ProjectRole;
}

/** GET /users/me/invites (spec B4) */
export interface ProjectInviteResponse {
  id: string;
  email: string;
  role: ProjectRole;
  status: InviteStatus | string;
  inviterName: string;
  invitedAt: string;
  expiresAt: string;
  daysLeft: number | null;
  projectId?: string;
  projectName?: string;
  token?: string;
}

/** Map search hit → ProjectMember cho UI mention */
export function memberSearchToProjectMember(m: MemberSearchResponse): ProjectMember {
  return {
    id: m.id,
    user: {
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      avatarUrl: m.avatarUrl ?? undefined,
    },
    projectRole: m.projectRole,
    joinedAt: "",
  };
}
