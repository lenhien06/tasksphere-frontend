"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { TaskDetailService } from "@/app/services/TaskDetailService"

export type TaskActivityAction =
  | "TASK_CREATED"
  | "STATUS_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "PRIORITY_CHANGED"
  | "UPDATED"
  | "COMMENT_ADDED"
  | "COMMENT_DELETED"
  | "ATTACHMENT_UPLOADED"
  | "ATTACHMENT_DELETED"
  | "SUBTASK_CREATED"
  | "SUBTASK_DELETED"
  | "SPRINT_CHANGED"
  | "POSITION_CHANGED"

export interface TaskActivityItem {
  id: string
  action: TaskActivityAction | string
  entityType: string
  entityId: string
  actor: {
    id: string
    fullName: string
    avatarUrl: string | null
  } | null
  entityLabel: string
  oldValue: string | null
  newValue: string | null
  ipAddress: string
  createdAt: string
}

interface TaskActivityPage {
  content: TaskActivityItem[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
  empty: boolean
}

export function useTaskActivity(projectId: string, taskId: string, size = 20) {
  return useInfiniteQuery({
    queryKey: ["activity", projectId, taskId, size],
    queryFn: ({ pageParam = 0 }) =>
      TaskDetailService.getTaskActivity(projectId, taskId, {
        page: Number(pageParam),
        size,
        sort: "createdAt,desc",
      }),
    getNextPageParam: (lastPage) => {
      const currentPage = Number(lastPage.number ?? 0)
      const loaded = (currentPage + 1) * size
      const total = Number(lastPage.totalElements ?? 0)
      return loaded < total ? currentPage + 1 : undefined
    },
    enabled: Boolean(projectId && taskId),
    staleTime: 0,
    initialPageParam: 0,
  })
}

export type { TaskActivityPage }
