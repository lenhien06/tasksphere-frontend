export interface ProjectOverviewPageProps {
  project: {
    id: string;
    name: string;
    projectKey: string;
    status: "active" | "completed" | "archived";
    visibility: "private" | "internal" | "public";
    pm: { fullName: string; avatarUrl: string | null };
    startDate: string;
    totalStoryPoints: number;
    goal: string | null;
  };
  overview: {
    completionRate: number;
    completionRateDelta: number | null;
    backlogCount: number;
    backlogCountDelta: number | null;
    sprintDaysRemaining: number | null;
    sprintName: string | null;
    memberCount: number;
    newMembersLast7Days: number;
    overdueTasks: number;
    doneStoryPoints: number;
    totalStoryPoints: number;
    statusDistribution: {
      status: "todo" | "in_progress" | "in_review" | "done" | "cancelled";
      count: number;
      percentage: number;
    }[];
  };
  activeSprint: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    totalTasks: number;
    doneTasks: number;
    inProgressTasks: number;
    totalStoryPoints: number;
    completedStoryPoints: number;
    completionRate: number;
  } | null;
  burndown: {
    day: number;
    ideal: number;
    actual: number;
    date: string;
  }[];
  velocity: {
    sprintId: string;
    sprintName: string;
    velocity: number;
    status: "active" | "completed";
  }[];
  averageVelocity: number;
  velocityTrend: "increasing" | "decreasing" | "stable";
  dueSoon: {
    id: string;
    taskId: string;
    title: string;
    type: "task" | "bug" | "story" | "epic" | "sub_task";
    priority: "critical" | "high" | "medium" | "low";
    status: "todo" | "in_progress" | "in_review" | "done" | "cancelled";
    dueDate: string | null;
    storyPoints: number | null;
    isOverdue: boolean;
    assignee: {
      fullName: string;
      avatarUrl: string | null;
    } | null;
  }[];
  userRole: "PROJECT_MANAGER" | "MEMBER" | "VIEWER";
  currentUserId: string;
  onCreateTask: () => void;
  onNavigateToMembers: () => void;
  onNavigateToBoard: () => void;
  onNavigateToBacklog: () => void;
  /** Optional: opens the AI Skill Allocation modal */
  onOpenAISkillModal?: () => void;
}
