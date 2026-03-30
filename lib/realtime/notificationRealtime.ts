"use client";

import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  NotificationRealtimeEvent,
  UnreadCountRealtimeEvent,
} from "@/app/types/notification.schema";
import { getStompConnectHeaders } from "@/lib/realtime/stompAuth";

export type RealtimeConnectionState = "disconnected" | "connecting" | "connected" | "error";

type Handlers = {
  onNotification: (payload: NotificationRealtimeEvent) => void;
  onUnreadCount: (payload: UnreadCountRealtimeEvent) => void;
  onStateChange: (state: RealtimeConnectionState) => void;
  onError?: (error: unknown) => void;
};

const NOTIFICATION_DESTINATION = "/user/queue/notifications";
const UNREAD_COUNT_DESTINATION = "/user/queue/notifications/unread-count";

let client: Client | null = null;
let activeToken: string | null = null;
let activeHandlers: Handlers | null = null;
let notificationSubscription: StompSubscription | null = null;
let unreadCountSubscription: StompSubscription | null = null;

function isUnauthorizedRealtimeError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("unauthorized") || normalized.includes("invalid token");
}

function getWebSocketEndpoint(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  const normalized = apiBase.replace(/\/+$/, "");
  const origin = normalized.replace(/\/api$/, "");
  return `${origin}/ws`;
}

function clearSubscriptions() {
  notificationSubscription?.unsubscribe();
  unreadCountSubscription?.unsubscribe();
  notificationSubscription = null;
  unreadCountSubscription = null;
}

function safeParseMessage<T>(message: IMessage): T | null {
  try {
    return JSON.parse(message.body) as T;
  } catch (error) {
    activeHandlers?.onError?.(error);
    return null;
  }
}

export function connectNotificationRealtime(token: string, handlers: Handlers) {
  activeHandlers = handlers;

  if (client && activeToken === token) {
    if (client.connected) {
      handlers.onStateChange("connected");
      return;
    }
    if (client.active) {
      handlers.onStateChange("connecting");
      return;
    }
  }

  disconnectNotificationRealtime(false);
  activeToken = token;
  handlers.onStateChange("connecting");

  client = new Client({
    connectHeaders: getStompConnectHeaders(token),
    reconnectDelay: 5000,
    heartbeatIncoming: 20000,
    heartbeatOutgoing: 20000,
    webSocketFactory: () => new SockJS(getWebSocketEndpoint()),
    debug: process.env.NODE_ENV === "development" ? (value) => console.debug("[notif-ws]", value) : () => {},
    onConnect: () => {
      clearSubscriptions();
      handlers.onStateChange("connected");
      notificationSubscription = client?.subscribe(NOTIFICATION_DESTINATION, (message) => {
        const payload = safeParseMessage<NotificationRealtimeEvent>(message);
        if (payload) handlers.onNotification(payload);
      }) ?? null;
      unreadCountSubscription = client?.subscribe(UNREAD_COUNT_DESTINATION, (message) => {
        const payload = safeParseMessage<UnreadCountRealtimeEvent>(message);
        if (payload) handlers.onUnreadCount(payload);
      }) ?? null;
    },
    onStompError: (frame) => {
      const message = frame.headers.message || frame.body || "Realtime STOMP error";

      if (isUnauthorizedRealtimeError(message)) {
        disconnectNotificationRealtime(false);
        handlers.onStateChange("disconnected");
      } else {
        handlers.onStateChange("error");
      }

      handlers.onError?.(new Error(message));
    },
    onWebSocketError: (event) => {
      handlers.onStateChange("error");
      handlers.onError?.(event);
    },
    onWebSocketClose: () => {
      clearSubscriptions();
      handlers.onStateChange(activeToken ? "connecting" : "disconnected");
    },
    onDisconnect: () => {
      clearSubscriptions();
      handlers.onStateChange("disconnected");
    },
  });

  client.activate();
}

export function disconnectNotificationRealtime(updateState = true) {
  const handlers = activeHandlers;
  activeToken = null;
  clearSubscriptions();

  if (client) {
    const currentClient = client;
    client = null;
    void currentClient.deactivate();
  }

  if (updateState) {
    handlers?.onStateChange("disconnected");
  }
}
