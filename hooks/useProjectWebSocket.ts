"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

interface ProjectWebSocketEvent {
    type: string
    projectId: string
    payload: any
    timestamp: string
}

interface TaskWebSocketEvent {
    type: string
    taskId?: string
    title?: string
    completedBy?: string
    newStatus?: string
    columnId?: string
    changes?: Record<string, unknown>
    task?: any
    [key: string]: any
}

const updateTaskLists = (old: any, taskId: string, patch: Record<string, unknown>) => {
    if (!old?.content || !Array.isArray(old.content)) return old
    return {
        ...old,
        content: old.content.map((task: any) =>
            task.id === taskId ? { ...task, ...patch } : task
        ),
    }
}

const removeTaskFromList = (old: any, taskId: string) => {
    if (!old?.content || !Array.isArray(old.content)) return old
    return {
        ...old,
        content: old.content.filter((task: any) => task.id !== taskId),
    }
}

export function useProjectWebSocket(projectId: string, onEvent?: (event: ProjectWebSocketEvent) => void) {
    const qc = useQueryClient()
    const clientRef = useRef<any>(null)

    useEffect(() => {
        if (!projectId || typeof window === "undefined") return

        let client: any = null
        let projectSub: any = null
        let taskSub: any = null

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
                        projectSub = client.subscribe(`/topic/project/${projectId}`, (msg: any) => {
                            try {
                                const event: ProjectWebSocketEvent = JSON.parse(msg.body)
                                handleEvent(event)
                                onEvent?.(event)
                            } catch (err) {
                                console.error("Error parsing project websocket message", err)
                            }
                        })

                        taskSub = client.subscribe(`/topic/projects/${projectId}/tasks`, (msg: any) => {
                            try {
                                const event: TaskWebSocketEvent = JSON.parse(msg.body)
                                handleTaskEvent(event)
                            } catch (err) {
                                console.error("Error parsing task websocket message", err)
                            }
                        })
                    },
                    onStompError: (frame) => {
                        console.error("STOMP error", frame)
                    },
                })

                client.activate()
                clientRef.current = client
            } catch (err) {
                console.error("Error connecting to project websocket", err)
            }
        }

        const handleEvent = (raw: ProjectWebSocketEvent & { data?: unknown }) => {
            const payload = raw.payload !== undefined ? raw.payload : raw.data
            const event = { ...raw, payload } as ProjectWebSocketEvent & { payload: any }

            switch (event.type) {
                case "sprint.started":
                    qc.invalidateQueries({ queryKey: ["sprints", projectId] })
                    toast.info(`Sprint "${event.payload?.name}" has started!`, {
                        description: event.payload?.goal || "Goal not set",
                    })
                    break
                case "sprint.completed":
                    qc.invalidateQueries({ queryKey: ["sprints", projectId] })
                    qc.invalidateQueries({ queryKey: ["backlog", projectId] })
                    toast.success(`Sprint "${event.payload?.name}" completed!`, {
                        description: `Velocity: ${event.payload?.velocity} pts`,
                    })
                    break
                case "task.moved":
                    // payload: { taskId, fromSprintId, toSprintId }
                    qc.invalidateQueries({ queryKey: ["backlog", projectId] })
                    qc.invalidateQueries({ queryKey: ["sprints", projectId] })
                    qc.invalidateQueries({ queryKey: ["tasks", projectId] })
                    break
                case "project.updated":
                    qc.invalidateQueries({ queryKey: ["project-detail", projectId] })
                    break
                case "attachment.uploaded":
                    // Refresh the attachment list for the affected task
                    if (event.payload?.taskId) {
                        qc.invalidateQueries({ queryKey: ["attachments", event.payload.taskId] })
                        qc.invalidateQueries({ queryKey: ["task", projectId, event.payload.taskId] })
                    }
                    break
                case "attachment.scan_failed":
                    toast.error(
                        `File "${event.payload?.fileName ?? "unknown"}" bị từ chối — không an toàn (virus scan failed)`
                    )
                    break
                case "subtask.promoted":
                    qc.invalidateQueries({ queryKey: ["tasks", projectId] })
                    qc.invalidateQueries({ queryKey: ["backlog", projectId] })
                    if (event.payload?.oldParentTaskId) {
                        qc.invalidateQueries({ queryKey: ["subtasks", event.payload.oldParentTaskId] })
                        qc.invalidateQueries({ queryKey: ["task", projectId, event.payload.oldParentTaskId] })
                    }
                    if (event.payload?.promotedTaskId) {
                        qc.invalidateQueries({ queryKey: ["task", projectId, event.payload.promotedTaskId] })
                    }
                    break
            }
        }

        const handleTaskEvent = (event: TaskWebSocketEvent) => {
            switch (event.type) {
                case "task_status_changed": {
                    if (!event.taskId) break
                    qc.setQueriesData({ queryKey: ["tasks", projectId] }, (old: any) =>
                        updateTaskLists(old, event.taskId!, {
                            taskStatus: event.newStatus,
                            columnId: event.columnId,
                        })
                    )
                    break
                }
                case "task_created":
                    qc.invalidateQueries({ queryKey: ["tasks", projectId] })
                    break
                case "task_updated":
                    if (!event.taskId) break
                    qc.setQueriesData({ queryKey: ["tasks", projectId] }, (old: any) =>
                        updateTaskLists(old, event.taskId!, event.changes ?? {})
                    )
                    break
                case "task_deleted":
                    if (!event.taskId) break
                    qc.setQueriesData({ queryKey: ["tasks", projectId] }, (old: any) =>
                        removeTaskFromList(old, event.taskId!)
                    )
                    break
                case "task_done":
                    if (event.completedBy && event.title) {
                        toast.success(`${event.completedBy} đã hoàn thành "${event.title}"`)
                    }
                    break
                case "task_assigned":
                    if (!event.taskId) break
                    qc.setQueriesData({ queryKey: ["tasks", projectId] }, (old: any) =>
                        updateTaskLists(old, event.taskId!, {
                            assignee: event.newAssignee,
                        })
                    )
                    break
            }
        }

        connect()

        return () => {
            projectSub?.unsubscribe?.()
            taskSub?.unsubscribe?.()
            clientRef.current?.deactivate()
            clientRef.current = null
        }
    }, [projectId, qc])
}
