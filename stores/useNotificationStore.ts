"use client";

import { create } from "zustand";
import { NotificationService } from "@/app/services/NotificationService";
import {
  NotificationItem,
  NotificationRealtimeEvent,
  NotificationPageResponse,
  UnreadCountRealtimeEvent,
} from "@/app/types/notification.schema";
import type { RealtimeConnectionState } from "@/lib/realtime/notificationRealtime";

type NotificationState = {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  connectionState: RealtimeConnectionState;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  setConnectionState: (state: RealtimeConnectionState) => void;
  handleRealtimeNotification: (notification: NotificationRealtimeEvent) => void;
  handleRealtimeUnreadCount: (payload: UnreadCountRealtimeEvent) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  reset: () => void;
};

function sortNotifications(notifications: NotificationItem[]) {
  return [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function mergeNotifications(
  current: NotificationItem[],
  incoming: NotificationItem[]
): NotificationItem[] {
  const map = new Map<string, NotificationItem>();

  for (const item of current) {
    map.set(item.id, item);
  }

  for (const item of incoming) {
    const existing = map.get(item.id);
    map.set(item.id, existing ? { ...existing, ...item } : item);
  }

  return sortNotifications(Array.from(map.values()));
}

function patchNotification(
  notifications: NotificationItem[],
  notificationId: string,
  patch: Partial<NotificationItem>
) {
  return notifications.map((item) =>
    item.id === notificationId ? { ...item, ...patch } : item
  );
}

async function fetchNotificationSnapshot(): Promise<NotificationPageResponse> {
  return NotificationService.getMine({ page: 0, size: 20 });
}

const initialState = {
  notifications: [] as NotificationItem[],
  unreadCount: 0,
  isLoading: false,
  isLoaded: false,
  error: null as string | null,
  connectionState: "disconnected" as RealtimeConnectionState,
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  ...initialState,

  initialize: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const page = await fetchNotificationSnapshot();
      set((state) => ({
        notifications: mergeNotifications(state.notifications, page.content ?? []),
        unreadCount: page.unreadCount ?? state.unreadCount,
        isLoading: false,
        isLoaded: true,
        error: null,
      }));
    } catch (error) {
      set({
        isLoading: false,
        isLoaded: true,
        error: error instanceof Error ? error.message : "Không thể tải thông báo",
      });
    }
  },

  refresh: async () => {
    try {
      const page = await fetchNotificationSnapshot();
      set((state) => ({
        notifications: mergeNotifications(state.notifications, page.content ?? []),
        unreadCount: page.unreadCount ?? state.unreadCount,
        isLoaded: true,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Không thể tải thông báo",
      });
    }
  },

  setConnectionState: (connectionState) => set({ connectionState }),

  handleRealtimeNotification: (notification) => {
    set((state) => {
      const exists = state.notifications.some((item) => item.id === notification.id);
      const current = state.notifications.find((item) => item.id === notification.id);
      const notifications = mergeNotifications(state.notifications, [notification]);
      const unreadCount =
        !exists && !notification.isRead
          ? state.unreadCount + 1
          : current && current.isRead && !notification.isRead
            ? state.unreadCount + 1
            : state.unreadCount;

      return {
        notifications,
        unreadCount,
      };
    });
  },

  handleRealtimeUnreadCount: ({ unreadCount }) => set({ unreadCount }),

  markAsRead: async (notificationId) => {
    const state = get();
    const target = state.notifications.find((item) => item.id === notificationId);
    if (!target || target.isRead) return;

    set({
      notifications: patchNotification(state.notifications, notificationId, {
        isRead: true,
        readAt: new Date().toISOString(),
      }),
      unreadCount: Math.max(0, state.unreadCount - 1),
    });

    try {
      await NotificationService.markAsRead(notificationId);
    } catch (error) {
      set({
        notifications: patchNotification(get().notifications, notificationId, {
          isRead: false,
          readAt: null,
        }),
        unreadCount: state.unreadCount,
        error: error instanceof Error ? error.message : "Không thể cập nhật thông báo",
      });
    }
  },

  markAllAsRead: async () => {
    const previous = get().notifications;
    set({
      notifications: previous.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    });

    try {
      await NotificationService.markAllAsRead();
    } catch (error) {
      set({
        notifications: previous,
        unreadCount: previous.filter((item) => !item.isRead).length,
        error: error instanceof Error ? error.message : "Không thể đánh dấu tất cả đã đọc",
      });
    }
  },

  deleteNotification: async (notificationId) => {
    const previous = get().notifications;
    const target = previous.find((item) => item.id === notificationId);
    set({
      notifications: previous.filter((item) => item.id !== notificationId),
      unreadCount: target && !target.isRead ? Math.max(0, get().unreadCount - 1) : get().unreadCount,
    });

    try {
      await NotificationService.deleteNotification(notificationId);
    } catch (error) {
      set({
        notifications: previous,
        unreadCount: previous.filter((item) => !item.isRead).length,
        error: error instanceof Error ? error.message : "Không thể xóa thông báo",
      });
    }
  },

  reset: () => set({ ...initialState }),
}));
