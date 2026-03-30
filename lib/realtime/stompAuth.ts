"use client";

import { useAuthStore } from "@/stores/useAuthStore";

export function getRealtimeAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}

export function getStompConnectHeaders(token?: string | null): Record<string, string> {
  const resolvedToken = token ?? getRealtimeAccessToken();
  return resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {};
}
