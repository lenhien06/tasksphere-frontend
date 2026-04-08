export type DashboardTaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "READY_FOR_TEST"
  | "TESTING"
  | "IN_REVIEW"
  | "DONE"
  | "CANCELLED";

export type DashboardTaskPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type DashboardProjectStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type DashboardProjectVisibility = "PRIVATE" | "INTERNAL" | "PUBLIC";

export interface DashboardKpiSummary {
  overdueTasks: number;
  dueTodayTasks: number;
  assignedOpenTasks: number;
  completedToday: number;
  completedThisWeek: number;
  unreadNotifications: number;
}

export interface DashboardTaskItem {
  id: string;
  taskCode: string;
  title: string;
  projectId: string;
  projectName: string;
  status: DashboardTaskStatus;
  priority: DashboardTaskPriority;
  startDate: string | null;
  dueDate: string | null;
  overdue: boolean;
}

export interface DashboardRecentActivityItem {
  id: string;
  projectId: string;
  projectName: string | null;
  actorId: string | null;
  actorName: string;
  actorAvatarUrl: string | null;
  entityType: string;
  entityId: string;
  action: string;
  oldValues: string | null;
  newValues: string | null;
  createdAt: string;
}

export interface DashboardProjectSummaryItem {
  id: string;
  name: string;
  projectKey: string;
  progress: number;
  taskCount: number;
  memberCount: number;
  overdueCount: number;
  status: DashboardProjectStatus;
  visibility: DashboardProjectVisibility;
  myRole: string | null;
}

export interface DashboardResponse {
  kpis: DashboardKpiSummary;
  myTasks: DashboardTaskItem[];
  upcomingDeadlines: DashboardTaskItem[];
  recentActivity: DashboardRecentActivityItem[];
  activeProjects: DashboardProjectSummaryItem[];
  hasProjects: boolean;
  hasTasks: boolean;
  upcomingDays: number;
  generatedAt: string;
}
