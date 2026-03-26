import { ApiResponse } from "@/app/types/common..schema";
import {
  NotificationItem,
  NotificationListParams,
  NotificationPageResponse,
} from "@/app/types/notification.schema";
import { apiJava } from "@/lib/axios";

const BASE = "/v1/notifications";

export const NotificationService = {
  getMine: async (params: NotificationListParams = {}): Promise<NotificationPageResponse> => {
    const res = await apiJava.get<ApiResponse<NotificationPageResponse>>(BASE, { params });
    return res.data.data;
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await apiJava.patch<ApiResponse<null>>(`${BASE}/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<number> => {
    const res = await apiJava.patch<ApiResponse<number>>(`${BASE}/read-all`);
    return res.data.data ?? 0;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiJava.get<ApiResponse<number>>(`${BASE}/unread-count`);
    return Number(res.data.data ?? 0);
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await apiJava.delete<ApiResponse<null>>(`${BASE}/${notificationId}`);
  },
};
