"use client";

import { useNotificationRealtime } from "@/hooks/useNotificationRealtime";

export function NotificationRealtimeBootstrap() {
  useNotificationRealtime();
  return null;
}
