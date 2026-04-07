"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getStompConnectHeaders } from "@/lib/realtime/stompAuth";

interface WorkspaceWebSocketEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export function useWorkspaceWebSocket(workspaceId?: string | null, onEvent?: (event: WorkspaceWebSocketEvent) => void) {
  const queryClient = useQueryClient();
  const clientRef = useRef<any>(null);

  useEffect(() => {
    if (!workspaceId || typeof window === "undefined") return;

    let client: any = null;
    let subscription: any = null;

    const connect = async () => {
      try {
        const [{ Client }, { default: SockJS }] = await Promise.all([
          import("@stomp/stompjs"),
          import("sockjs-client"),
        ]);

        const wsUrl = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api").replace(/\/api\/?$/, "")}/ws`;

        client = new Client({
          connectHeaders: getStompConnectHeaders(),
          webSocketFactory: () => new SockJS(wsUrl),
          reconnectDelay: 5000,
          onConnect: () => {
            subscription = client.subscribe(`/topic/workspace/${workspaceId}`, (message: any) => {
              try {
                const event: WorkspaceWebSocketEvent = JSON.parse(message.body);
                queryClient.invalidateQueries({ queryKey: ["ws-members", workspaceId] });
                queryClient.invalidateQueries({ queryKey: ["ws-invites", workspaceId] });
                queryClient.invalidateQueries({ queryKey: ["workspace-projects", workspaceId] });
                queryClient.invalidateQueries({ queryKey: ["workspace"] });
                onEvent?.(event);
              } catch (error) {
                console.error("Error parsing workspace websocket message", error);
              }
            });
          },
          onStompError: (frame) => {
            console.error("Workspace STOMP error", frame);
          },
        });

        client.activate();
        clientRef.current = client;
      } catch (error) {
        console.error("Error connecting to workspace websocket", error);
      }
    };

    connect();

    return () => {
      subscription?.unsubscribe?.();
      clientRef.current?.deactivate();
      clientRef.current = null;
    };
  }, [workspaceId, queryClient, onEvent]);
}
