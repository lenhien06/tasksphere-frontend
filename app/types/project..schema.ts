import { z } from "zod";

// 1. Enum definitions (lowercase to match Backend)
export const ProjectStatusEnum = z.enum(["active", "archived", "deleted", "completed"]);
export const ProjectVisibilityEnum = z.enum(["public", "private", "internal"]);

// 2. Schema for Backend response data (ProjectResponse)
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  projectKey: z.string(),
  description: z.string().nullable(),
  status: ProjectStatusEnum,
  visibility: ProjectVisibilityEnum,
  ownerId: z.string().uuid(),
  ownerName: z.string(),
  memberCount: z.number().default(0),
  isOwner: z.boolean().optional(),
  progress: z.number().min(0).max(100).default(0),
  goal: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  taskStats: z.object({
    total: z.number().default(0),
    done: z.number().default(0),
    overdue: z.number().default(0),
  }),
  myRole: z.enum(["project_manager", "member", "viewer", "system_admin"]),
  createdAt: z.string(), // ISO Instant
  updatedAt: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

// 3. Schema for create request data (ProjectRequest)
export const ProjectRequestSchema = z
  .object({
    name: z
      .string()
      .min(1, "Project name is required")
      .max(255, "Project name must not exceed 255 characters"),
    projectKey: z
      .string()
      .min(2, "Project key must be at least 2 characters")
      .max(10, "Project key must not exceed 10 characters")
      .regex(/^[A-Z0-9]{2,10}$/, "Project key only allows uppercase letters and numbers"),
    description: z.string().optional().nullable(),
    goal: z.string().optional().nullable(),
    visibility: ProjectVisibilityEnum.default("private"),
    status: ProjectStatusEnum.optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date must be after start date",
          path: ["endDate"],
        });
      }
    }
  });

export type ProjectRequest = z.infer<typeof ProjectRequestSchema>;

// 4. Schema for update request data (ProjectUpdateRequest)
export const ProjectUpdateRequestSchema = z
  .object({
    name: z
      .string()
      .min(1, "Project name is required")
      .max(255, "Project name must not exceed 255 characters"),
    description: z.string().optional().nullable(),
    visibility: ProjectVisibilityEnum,
    status: ProjectStatusEnum.optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date must be after start date",
          path: ["endDate"],
        });
      }
    }
  });

export type ProjectUpdateRequest = z.infer<typeof ProjectUpdateRequestSchema>;
