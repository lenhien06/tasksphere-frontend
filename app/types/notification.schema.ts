import { PageResponse } from "@/app/types/common..schema";

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_STATUS_CHANGED"
  | "TASK_COMMENTED"
  | "TASK_MENTIONED"
  | "TASK_DUE_SOON"
  | "TASK_OVERDUE"
  | "SPRINT_STARTED"
  | "SPRINT_COMPLETED"
  | "PROJECT_INVITED"
  | "PROJECT_ROLE_CHANGED"
  | "MEMBER_JOINED"
  | "PROJECT_MEMBER_REMOVED"
  | "PROJECT_RESTORED"
  | "SYSTEM_ANNOUNCEMENT"
  | string;

export interface NotificationActor {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  projectId: string | null;
  taskCode: string | null;
  actor: NotificationActor | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPageResponse extends PageResponse<NotificationItem> {
  unreadCount?: number;
}

export interface NotificationListParams {
  isRead?: boolean;
  type?: NotificationType;
  page?: number;
  size?: number;
}

export interface NotificationRealtimeEvent extends NotificationItem {}

export interface UnreadCountRealtimeEvent {
  unreadCount: number;
  updatedAt: string;
}
