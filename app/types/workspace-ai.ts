// ── Analyze Description ───────────────────────────────────────────────────────

export interface QuestionOption {
  label: string;
  value: string;
}

export interface MemberOption {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  skillTags?: string[];
}

export interface AiQuestion {
  field: string;       // "techStack" | "deadline" | "teamMembers"
  question: string;
  options?: QuestionOption[];
  type?: string;       // "member-select" | undefined (single-choice)
  members?: MemberOption[];
  allowCustom: boolean;
  customPlaceholder?: string;
}

export interface UnderstoodFields {
  projectName: string;
  projectType: string;
  features: string[];
}

export interface AnalyzeDescriptionResponse {
  understood: UnderstoodFields;
  missingFields: string[];
  questions: AiQuestion[];
}

// ── Generate Project Plan ─────────────────────────────────────────────────────

export interface TaskPlanDto {
  title: string;
  type: "task" | "story" | "bug";
  priority: "critical" | "high" | "medium" | "low";
  storyPoints: number;
  skillTagsRequired?: string[];
  suggestedAssigneeId?: string | null;
}

export interface SprintPlanDto {
  name: string;
  goal: string;
  weekStart: number;
  weekEnd: number;
  tasks: TaskPlanDto[];
}

export interface ProjectPlanDto {
  name: string;
  projectKey: string;
  description: string;
  estimatedWeeks: number;
}

export interface GenerateProjectPlanResponse {
  project: ProjectPlanDto;
  sprints: SprintPlanDto[];
  totalTasks: number;
  totalStoryPoints: number;
}

// ── Confirm Project Plan ──────────────────────────────────────────────────────

export interface ConfirmProjectPlanRequest {
  plan: {
    project: ProjectPlanDto;
    sprints: SprintPlanDto[];
    memberIds: string[];
  };
}

export interface ConfirmProjectPlanResponse {
  projectId: string;
  projectKey: string;
  sprintCount: number;
  taskCount: number;
  assignedCount: number;
  projectUrl: string;
}

// ── Collected Data (frontend state) ──────────────────────────────────────────

export interface CollectedData {
  description: string;
  techStack?: string;
  deadlineWeeks?: number;
  memberIds?: string[];
}
