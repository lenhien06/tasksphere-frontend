"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import {
  connectNotificationRealtime,
  disconnectNotificationRealtime,
} from "@/lib/realtime/notificationRealtime";

export function useNotificationRealtime() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initialize = useNotificationStore((state) => state.initialize);
  const refresh = useNotificationStore((state) => state.refresh);
  const handleRealtimeNotification = useNotificationStore((state) => state.handleRealtimeNotification);
  const handleRealtimeUnreadCount = useNotificationStore((state) => state.handleRealtimeUnreadCount);
  const setConnectionState = useNotificationStore((state) => state.setConnectionState);
  const reset = useNotificationStore((state) => state.reset);
  const isLoaded = useNotificationStore((state) => state.isLoaded);
  const previousTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && accessToken && !isLoaded) {
      void initialize();
    }
  }, [accessToken, initialize, isAuthenticated, isLoaded]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      previousTokenRef.current = null;
      disconnectNotificationRealtime();
      reset();
      return;
    }

    if (previousTokenRef.current === accessToken) {
      return;
    }

    previousTokenRef.current = accessToken;
    connectNotificationRealtime(accessToken, {
      onNotification: handleRealtimeNotification,
      onUnreadCount: handleRealtimeUnreadCount,
      onStateChange: (state) => {
        const previousState = useNotificationStore.getState().connectionState;
        setConnectionState(state);
        if (state === "connected" && previousState !== "connected") {
          void refresh();
        }
      },
      onError: (error) => {
        console.error("Notification realtime error:", error);
      },
    });

    return () => {
      if (previousTokenRef.current === accessToken) {
        disconnectNotificationRealtime();
      }
    };
  }, [
    accessToken,
    handleRealtimeNotification,
    handleRealtimeUnreadCount,
    isAuthenticated,
    refresh,
    reset,
    setConnectionState,
  ]);
}
