"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

interface TaskWebSocketEvent {
    type: string
    taskId: string
    projectId: string
    [key: string]: unknown
}

export function useTaskWebSocket(
    projectId: string,
    taskId: string,
    onEvent?: (event: TaskWebSocketEvent) => void
) {
    const qc = useQueryClient()
    const clientRef = useRef<any>(null)

    useEffect(() => {
        if (!taskId || typeof window === "undefined") return

        let client: any = null

        const connect = async () => {
            try {
                const [{ Client }, { default: SockJS }] = await Promise.all([
                    import("@stomp/stompjs"),
                    import("sockjs-client"),
                ])
                const wsUrl = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api").replace(/\/api\/?$/, "")}/ws`

                client = new Client({
                    webSocketFactory: () => new SockJS(wsUrl),
                    reconnectDelay: 5000,
                    onConnect: () => {
                        client.subscribe(`/topic/task/${taskId}`, (msg: any) => {
                            try {
                                const event: TaskWebSocketEvent = JSON.parse(msg.body)
                                handleEvent(event)
                                onEvent?.(event)
                            } catch {}
                        })
                    },
                    onStompError: () => {},
                })

                client.activate()
                clientRef.current = client
            } catch {}
        }

        const handleEvent = (event: TaskWebSocketEvent) => {
            switch (event.type) {
                case "task_updated":
                    qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
                    qc.invalidateQueries({ queryKey: ["activity", projectId, taskId] })
                    break
                case "comment_added":
                    qc.invalidateQueries({ queryKey: ["comments", taskId] })
                    qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
                    qc.invalidateQueries({ queryKey: ["activity", projectId, taskId] })
                    break
                case "attachment_added":
                    qc.invalidateQueries({ queryKey: ["attachments", taskId] })
                    qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
                    qc.invalidateQueries({ queryKey: ["activity", projectId, taskId] })
                    break
                case "subtask_created":
                    qc.invalidateQueries({ queryKey: ["subtasks", taskId] })
                    qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
                    qc.invalidateQueries({ queryKey: ["activity", projectId, taskId] })
                    break
                case "task_status_changed":
                    qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
                    qc.invalidateQueries({ queryKey: ["activity", projectId, taskId] })
                    break
            }
        }

        connect()

        return () => {
            clientRef.current?.deactivate()
            clientRef.current = null
        }
    }, [taskId, projectId])
}
