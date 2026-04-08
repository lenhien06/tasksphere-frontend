import { z } from "zod";

// ── Enums ────────────────────────────────────────────────────────────────────

export const WorkspaceRoleEnum = z.enum(["OWNER", "ADMIN", "MEMBER"]);
export const WorkspacePlanEnum = z.enum(["free", "pro", "enterprise"]);
export const WorkspaceTypeEnum = z.enum(["PERSONAL", "ORGANIZATION"]);

export type WorkspaceRole = z.infer<typeof WorkspaceRoleEnum>;
export type WorkspacePlan = z.infer<typeof WorkspacePlanEnum>;
export type WorkspaceType = z.infer<typeof WorkspaceTypeEnum>;

// ── Workspace ────────────────────────────────────────────────────────────────

export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  plan: WorkspacePlanEnum,
  type: WorkspaceTypeEnum.default("ORGANIZATION"),
  memberCount: z.number().default(0),
  projectCount: z.number().default(0),
  role: WorkspaceRoleEnum.nullable().optional(),
  ownerId: z.string().uuid(),
  ownerName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;

// ── WorkspaceMember ───────────────────────────────────────────────────────────

export const WorkspaceMemberSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().nullable().optional(),
  role: WorkspaceRoleEnum,
  skillTags: z.array(z.string()).nullable().optional(),
  activeTaskCount: z.number().default(0),
  avgStoryPoints: z.number().nullable().optional(),
  joinedAt: z.string(),
});

export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

// ── Request DTOs ──────────────────────────────────────────────────────────────

export const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, "Tên workspace không được để trống")
    .max(255, "Tên workspace không được quá 255 ký tự"),
  slug: z
    .string()
    .min(2, "Slug phải từ 2-50 ký tự")
    .max(50, "Slug phải từ 2-50 ký tự")
    .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang")
    .optional()
    .or(z.literal("")),
  description: z.string().optional(),
});

export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceSchema>;

export const InviteMemberSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  role: WorkspaceRoleEnum.exclude(["OWNER"]),
  skillTags: z.array(z.string()).optional(),
});

export type InviteMemberRequest = z.infer<typeof InviteMemberSchema>;

export const WorkspaceInviteResponseSchema = z.object({
  email: z.string().email(),
  role: WorkspaceRoleEnum.exclude(["OWNER"]),
  existingUser: z.boolean(),
  addedToWorkspace: z.boolean(),
  status: z.string(),
});

export type WorkspaceInviteResponse = z.infer<typeof WorkspaceInviteResponseSchema>;

export const WorkspaceInviteListItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: WorkspaceRoleEnum.exclude(["OWNER"]),
  status: z.string(),
  inviterName: z.string(),
  invitedAt: z.string(),
  expiresAt: z.string(),
  daysLeft: z.number().nullable().optional(),
});

export type WorkspaceInviteListItem = z.infer<typeof WorkspaceInviteListItemSchema>;

// ── Workspace Health Dashboard ───────────────────────────────────────────────

export interface WorkspaceHealthTaskDistribution {
  todo: number;
  inProgress: number;
  done: number;
}

export interface WorkspaceHealthSprintHealth {
  sprintName: string | null;
  daysRemaining: number | null;
  totalStoryPoints: number;
  overdueTasks: number;
}

export interface WorkspaceHealthProjectHighlight {
  projectId: string;
  projectName: string;
  projectKey: string;
  riskLevel: "CRITICAL" | "WARNING" | "HEALTHY";
}

export interface WorkspaceHealthBurndownPoint {
  label: string;
  idealRemaining: number;
  actualRemaining: number;
}

export interface WorkspaceHealthRiskHotspot {
  taskId: string;
  taskCode: string;
  title: string;
  dueDate: string | null;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | null;
  overdue: boolean;
  projectId: string;
  projectName: string;
  assigneeId: string | null;
  assigneeName: string;
  assigneeAvatarUrl: string | null;
}

export interface WorkspaceHealthResourceAlert {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  allocatedHours: number;
  capacityHours: number;
  overloaded: boolean;
}

export interface WorkspaceHealthProjectItem {
  projectId: string;
  projectName: string;
  projectKey: string;
  status: string;
  riskLevel: "CRITICAL" | "WARNING" | "HEALTHY";
  activeSprintName: string | null;
  daysRemaining: number | null;
  totalTasks: number;
  doneTasks: number;
  overdueTasks: number;
  totalStoryPoints: number;
}

export interface WorkspaceHealthMemberPreview {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
}

export interface WorkspaceHealthMetrics {
  workspaceId: string;
  workspaceName: string;
  globalProgress: number;
  overdueTaskCount: number;
  riskyProjectCount: number;
  totalTaskCount: number;
  doneTaskCount: number;
  taskDistribution: WorkspaceHealthTaskDistribution;
  sprintHealth: WorkspaceHealthSprintHealth | null;
  focusProject: WorkspaceHealthProjectHighlight | null;
  burndown: WorkspaceHealthBurndownPoint[];
  hotspots: WorkspaceHealthRiskHotspot[];
  overloadedMembers: WorkspaceHealthResourceAlert[];
  projects: WorkspaceHealthProjectItem[];
  memberPreview: WorkspaceHealthMemberPreview[];
  generatedAt: string;
  cachedUntil: string;
}
