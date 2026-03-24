"use client"

import React, { useMemo } from "react"
import { AlertCircle, History, RefreshCcw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/common/UserAvatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTaskActivity, type TaskActivityItem } from "@/components/task-detail/hooks/useTaskActivity"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ActivityTabProps {
  projectId: string
  taskId: string
}

function stringify(v: unknown): string {
  if (v == null) return "—"
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v)
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>
    return (
      (obj.status as string) ||
      (obj.name as string) ||
      (obj.title as string) ||
      (obj.assigneeName as string) ||
      (obj.filename as string) ||
      JSON.stringify(v)
    )
  }
  return String(v)
}

function safeParseJson(value: string | null): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function toDisplayDateTimeUtc7(iso: string): string {
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return `${formatter.format(new Date(iso))} UTC+7`
}

function actorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function changedFields(oldValue: Record<string, unknown> | null, newValue: Record<string, unknown> | null): string[] {
  const oldObj = oldValue ?? {}
  const newObj = newValue ?? {}
  const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
  return keys.filter((k) => JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]))
}

function renderMessage(item: TaskActivityItem) {
  const oldObj = safeParseJson(item.oldValue) ?? {}
  const newObj = safeParseJson(item.newValue) ?? {}

  switch (item.action) {
    case "TASK_CREATED":
      return <>da tao task nay</>
    case "STATUS_CHANGED":
      return (
        <>
          da doi trang thai tu <b>{stringify(oldObj.status)}</b> {"->"} <b>{stringify(newObj.status)}</b>
        </>
      )
    case "ASSIGNEE_CHANGED": {
      const oldName = stringify(oldObj.assigneeName)
      const newName = stringify(newObj.assigneeName)
      if (oldName === "—") return <>da gan cho <b>{newName}</b></>
      return <>da doi assignee tu <b>{oldName}</b> {"->"} <b>{newName}</b></>
    }
    case "PRIORITY_CHANGED":
      return (
        <>
          da doi do uu tien tu <b>{stringify(oldObj.priority)}</b> {"->"} <b>{stringify(newObj.priority)}</b>
        </>
      )
    case "UPDATED": {
      const fields = changedFields(safeParseJson(item.oldValue), safeParseJson(item.newValue))
      return <>da cap nhat <b>{fields.length > 0 ? fields.join(", ") : item.entityLabel || "thong tin"}</b></>
    }
    case "COMMENT_ADDED":
      return <>da them binh luan</>
    case "COMMENT_DELETED":
      return <>da xoa binh luan</>
    case "ATTACHMENT_UPLOADED":
      return <>da dinh kem <b>{stringify(newObj.filename || newObj.fileName)}</b></>
    case "ATTACHMENT_DELETED":
      return <>da xoa tep <b>{stringify(oldObj.filename || oldObj.fileName)}</b></>
    case "SUBTASK_CREATED":
      return <>da them sub-task <b>{stringify(newObj.title)}</b></>
    case "SUBTASK_DELETED":
      return <>da xoa sub-task <b>{stringify(oldObj.title)}</b></>
    case "SPRINT_CHANGED": {
      const sprint = stringify(newObj.sprint)
      if (sprint.toLowerCase() === "backlog") return <>da bo khoi sprint</>
      return <>da chuyen sang sprint <b>{sprint}</b></>
    }
    case "POSITION_CHANGED":
      return <>da di chuyen task tren board</>
    default:
      return <>da thuc hien hanh dong <b>{item.action}</b></>
  }
}

function ActivityItemSkeleton() {
  return (
    <div className="flex gap-3 py-3 animate-pulse">
      <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0" />
      <div className="flex-1">
        <div className="h-3 w-52 rounded bg-slate-200 mb-2" />
        <div className="h-3 w-32 rounded bg-slate-100" />
      </div>
    </div>
  )
}

export default function ActivityTab({ projectId, taskId }: ActivityTabProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTaskActivity(projectId, taskId, 20)

  const items = useMemo(
    () =>
      (data?.pages ?? [])
        .flatMap((p) => p.content ?? [])
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [data]
  )
  const total = data?.pages?.[0]?.totalElements ?? 0

  React.useEffect(() => {
    if (isError) {
      toast.error((error as any)?.response?.data?.message ?? "Khong the tai hoat dong")
    }
  }, [isError, error])

  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <ActivityItemSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-slate-200 p-5 text-center">
        <AlertCircle className="mx-auto mb-2 text-rose-500" size={22} />
        <p className="text-sm text-slate-600 mb-3">Khong the tai nhat ky hoat dong</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCcw size={14} className="mr-2" />
          Thu lai
        </Button>
      </div>
    )
  }

  if (!total && items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
        <History className="mx-auto mb-2 text-slate-400" size={22} />
        <p className="text-sm text-slate-500">Chua co hoat dong nao</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <TooltipProvider>
        {items.map((item, idx) => (
          <div key={item.id} className="relative flex gap-3 py-3">
            {idx < items.length - 1 && (
              <span className="absolute left-4 top-11 h-[calc(100%-28px)] w-px bg-slate-200" />
            )}
            <div className="shrink-0">
              <UserAvatar
                src={item.actor?.avatarUrl ?? undefined}
                name={item.actor?.fullName || actorInitials(item.actor?.fullName || "?")}
                size={32}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-800 break-words">
                <b>{item.actor?.fullName || "Unknown"}</b> {renderMessage(item)}
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn("text-xs text-slate-500 cursor-default")}>
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{toDisplayDateTimeUtc7(item.createdAt)}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ))}
      </TooltipProvider>

      {hasNextPage && (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="h-8 text-xs"
          >
            {isFetchingNextPage ? "Dang tai..." : "Tai them"}
          </Button>
        </div>
      )}
    </div>
  )
}
