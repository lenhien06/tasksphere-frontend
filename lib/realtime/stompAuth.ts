"use client";

import { useAuthStore } from "@/stores/useAuthStore";

export function getRealtimeAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}

export function getStompConnectHeaders(): Record<string, string> {
  const token = getRealtimeAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
