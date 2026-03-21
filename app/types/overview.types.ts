// ── Overview API types (FR-27 · FR-29) ────────────────────────

export interface ProjectOverview {
  projectId: string;
  projectName: string;
  sprintId: string | null;
  sprintName: string | null;
  totalTasks: number;
  completionRate: number;
  overdueTasks: number;
  totalStoryPoints: number;
  doneStoryPoints: number;
  statusDistribution: StatusDistributionItem[];
  overallProgress: number;
  generatedAt?: string;
  cachedUntil?: string;
  // Delta fields — null khi không đủ data
  completionRateDelta: number | null;
  backlogCount: number;
  backlogCountDelta: number | null;
  sprintDaysRemaining: number | null;
  memberCount: number;
  newMembersLast7Days: number;
}

export interface StatusDistributionItem {
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  count: number;
  percentage: number;
}

export interface ActiveSprintDetail {
  id: string;
  name: string;
  status: 'planned' | 'active' | 'completed';
  startDate: string;
  endDate: string;
  goal: string | null;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
}

export interface BurndownPoint {
  day: number;
  date: string;
  ideal: number;
  actual: number | null;
}

export interface BurndownData {
  sprintId: string;
  sprintName: string;
  totalPoints: number;
  data: BurndownPoint[];
}

export interface VelocityItem {
  sprintId: string;
  sprintName: string;
  velocity: number;
  completedTasks: number;
}

export interface VelocityData {
  sprints: VelocityItem[];
  averageVelocity: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface DueSoonTask {
  id: string;
  taskId: string;
  title: string;
  type: 'task' | 'bug' | 'story' | 'epic' | 'sub_task';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  dueDate: string | null;
  storyPoints: number | null;
  isOverdue: boolean;
  assignee: { id: string; fullName: string; avatarUrl: string | null } | null;
}
