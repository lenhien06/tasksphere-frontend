// AI Module types — Feature 1 (Task Generation) + Feature 2 (Assignment Suggestions)

export type AiTaskType     = 'task' | 'story' | 'bug' | 'epic';
export type AiTaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type StoryPoints    = 1 | 2 | 3 | 5 | 8 | 13;

// ── Feature 1 ────────────────────────────────────────────────────────────────

export interface GenerateTasksRequest {
  projectName:      string;
  requirementsText: string;
  techStack?:       string;
  maxTasks?:        number;
}

export interface GeneratedTaskDto {
  title:               string;
  description:         string;
  type:                AiTaskType;
  priority:            AiTaskPriority;
  story_points:        StoryPoints | null;
  skill_tags_required: string[];
  acceptance_criteria: string;
}

export interface ConfirmTasksRequest {
  sprintId?: string;
  tasks:     GeneratedTaskDto[];
}

export interface ConfirmTasksResponse {
  createdTaskIds: string[];
  count:          number;
  memberCount:    number;
  projectId:      string;
}

// ── Feature 2 ────────────────────────────────────────────────────────────────

export interface MemberSuggestion {
  suggestionId:     string;
  userId:           string;
  fullName:         string;
  avatarUrl:        string | null;
  skillTags:        string[];
  activeTaskCount:  number;
  skill_score:      number;
  workload_score:   number;
  difficulty_score: number;
  total_score:      number;
  reasonText:       string;
}

export interface TaskAssignmentSuggestion {
  taskId:            string;
  taskTitle:         string;
  taskType:          AiTaskType;
  taskPriority:      AiTaskPriority;
  storyPoints:       number | null;
  skillTagsRequired: string[];
  topSuggestions:    MemberSuggestion[];
}

export interface SuggestAssignmentsResponse {
  totalTasks:       number;
  totalSuggestions: number;
  suggestions:      TaskAssignmentSuggestion[];
}

export interface AssignmentItem {
  taskId:        string;
  assigneeId:    string;
  suggestionId?: string;
}

export interface ConfirmAssignmentsRequest {
  assignments: AssignmentItem[];
}

export interface AssignmentConfirmResult {
  totalAssigned: number;
  aiConfirmed:   number;
  pmOverridden:  number;
  failedTaskIds: string[];
}

export interface ApiResponse<T> {
  data: T;
  meta: Record<string, unknown>;
}
