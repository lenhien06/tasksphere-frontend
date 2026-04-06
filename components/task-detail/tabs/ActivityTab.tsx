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

// ── Chip styles ───────────────────────────────────────────────────────────────

const chipOld: React.CSSProperties = {
  backgroundColor: "#FCEBEB",
  color: "#A32D2D",
  padding: "1px 8px",
  borderRadius: 99,
  fontSize: 11,
  fontWeight: 600,
  display: "inline-block",
  whiteSpace: "nowrap",
}

const chipNew: React.CSSProperties = {
  backgroundColor: "#EAF3DE",
  color: "#27500A",
  padding: "1px 8px",
  borderRadius: 99,
  fontSize: 11,
  fontWeight: 600,
  display: "inline-block",
  whiteSpace: "nowrap",
}

const chipNeutral: React.CSSProperties = {
  backgroundColor: "#F1EFE8",
  color: "#5F5E5A",
  border: "0.5px solid #D3D1C7",
  padding: "1px 8px",
  borderRadius: 99,
  fontSize: 11,
  fontWeight: 500,
  display: "inline-block",
  whiteSpace: "nowrap",
}

const arrowStyle: React.CSSProperties = {
  color: "#888780",
  margin: "0 4px",
  fontSize: 11,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeParseJson(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function safeStr(v: unknown, fallback = "—"): string {
  if (v == null || v === "") return fallback
  return String(v)
}

function toDisplayDateTimeUtc7(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso)) + " UTC+7"
}

function actorInitials(name: string): string {
  if (!name || typeof name !== 'string') return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) {
    const firstPart = parts[0];
    return (firstPart && typeof firstPart === 'string' ? firstPart.slice(0, 2) : "?").toUpperCase()
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function changedFields(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): string[] {
  const o = oldValue ?? {}
  const n = newValue ?? {}
  return Array.from(new Set([...Object.keys(o), ...Object.keys(n)])).filter(
    (k) => JSON.stringify(o[k]) !== JSON.stringify(n[k])
  )
}

// ── renderMessage — short verb line ──────────────────────────────────────────

function renderMessage(item: TaskActivityItem): React.ReactNode {
  switch (item.action) {
    case "TASK_CREATED":    return <>đã tạo task này</>
    case "COMMENT_ADDED":   return <>đã thêm bình luận</>
    case "COMMENT_DELETED": return <>đã xóa bình luận</>
    case "POSITION_CHANGED":return <>đã di chuyển task trên board</>
    case "STATUS_CHANGED":  return <>đã đổi trạng thái</>
    case "ASSIGNEE_CHANGED":return <>đã đổi người thực hiện</>
    case "PRIORITY_CHANGED":return <>đã đổi độ ưu tiên</>
    case "SPRINT_CHANGED":  return <>đã đổi sprint</>
    case "ATTACHMENT_UPLOADED": return <>đã đính kèm file</>
    case "ATTACHMENT_DELETED":  return <>đã xóa file</>
    case "SUBTASK_CREATED": return <>đã thêm sub-task</>
    case "SUBTASK_DELETED": return <>đã xóa sub-task</>
    case "SUBTASK_PROMOTED": return <>đã chuyển sub-task thành task độc lập</>
    case "UPDATED": {
      const fields = changedFields(safeParseJson(item.oldValue), safeParseJson(item.newValue))
      return <>đã cập nhật <b>{fields.length > 0 ? fields.join(", ") : "thông tin"}</b></>
    }
    default:
      return <>đã thực hiện <b>{item.action}</b></>
  }
}

// ── renderChips — old → new chips row ────────────────────────────────────────

function renderChips(item: TaskActivityItem): React.ReactNode | null {
  const old = safeParseJson(item.oldValue)
  const nw  = safeParseJson(item.newValue)

  switch (item.action) {
    case "STATUS_CHANGED": {
      const o = safeStr(old?.status)
      const n = safeStr(nw?.status)
      if (o === "—" && n === "—") return null
      return (
        <span>
          <span style={chipOld}>{o}</span>
          <span style={arrowStyle}>→</span>
          <span style={chipNew}>{n}</span>
        </span>
      )
    }

    case "ASSIGNEE_CHANGED": {
      const o = safeStr(old?.assigneeName, "Chưa gán")
      const n = safeStr(nw?.assigneeName)
      if (n === "—") return null
      return (
        <span>
          <span style={chipOld}>{o}</span>
          <span style={arrowStyle}>→</span>
          <span style={chipNew}>{n}</span>
        </span>
      )
    }

    case "PRIORITY_CHANGED": {
      const o = safeStr(old?.priority)
      const n = safeStr(nw?.priority)
      if (o === "—" && n === "—") return null
      return (
        <span>
          <span style={chipOld}>{o}</span>
          <span style={arrowStyle}>→</span>
          <span style={chipNew}>{n}</span>
        </span>
      )
    }

    case "POSITION_CHANGED": {
      const o = safeStr(old?.columnName)
      const n = safeStr(nw?.columnName)
      if (o === "—" && n === "—") return null
      return (
        <span>
          <span style={chipOld}>{o}</span>
          <span style={arrowStyle}>→</span>
          <span style={chipNew}>{n}</span>
        </span>
      )
    }

    case "COMMENT_ADDED": {
      const content = safeStr(nw?.content)
      if (content === "—") return null
      const preview = content.length > 60 ? content.slice(0, 60) + "…" : content
      return <span style={chipNeutral}>{preview}</span>
    }

    case "SPRINT_CHANGED": {
      const o = safeStr(old?.sprintName ?? old?.sprint, "Backlog")
      const n = safeStr(nw?.sprintName  ?? nw?.sprint,  "Backlog")
      return (
        <span>
          <span style={chipOld}>{o}</span>
          <span style={arrowStyle}>→</span>
          <span style={chipNew}>{n}</span>
        </span>
      )
    }

    case "ATTACHMENT_UPLOADED": {
      const name = safeStr(nw?.filename ?? nw?.fileName ?? nw?.title)
      if (name === "—") return null
      return <span style={chipNeutral}>{name}</span>
    }

    case "ATTACHMENT_DELETED": {
      const name = safeStr(old?.filename ?? old?.fileName ?? old?.title)
      if (name === "—") return null
      return <span style={chipOld}>{name}</span>
    }

    case "SUBTASK_CREATED": {
      const title = safeStr(nw?.title)
      if (title === "—") return null
      return <span style={chipNeutral}>{title}</span>
    }

    case "SUBTASK_DELETED": {
      const title = safeStr(old?.title)
      if (title === "—") return null
      return <span style={chipOld}>{title}</span>
    }

    // No chips for these
    case "TASK_CREATED":
    case "COMMENT_DELETED":
    default:
      return null
  }
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

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
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [data]
  )
  const total = data?.pages?.[0]?.totalElements ?? 0

  React.useEffect(() => {
    if (isError) {
      toast.error((error as any)?.response?.data?.message ?? "Không thể tải hoạt động")
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
        <p className="text-sm text-slate-600 mb-3">Không thể tải nhật ký hoạt động</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCcw size={14} className="mr-2" />
          Thử lại
        </Button>
      </div>
    )
  }

  if (!total && items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
        <History className="mx-auto mb-2 text-slate-400" size={22} />
        <p className="text-sm text-slate-500">Chưa có hoạt động nào</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <TooltipProvider>
        {items.map((item, idx) => {
          const chips = renderChips(item)
          return (
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
                {/* Verb line */}
                <p className="text-sm text-slate-800 break-words">
                  <b>{item.actor?.fullName || "Unknown"}</b>{" "}
                  {renderMessage(item)}
                </p>

                {/* Chips row */}
                {chips && (
                  <div className="mt-1 flex items-center flex-wrap gap-1">
                    {chips}
                  </div>
                )}

                {/* Timestamp */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn("text-xs text-slate-500 cursor-default", chips ? "mt-1 block" : "")}>
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
          )
        })}
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
            {isFetchingNextPage ? "Đang tải..." : "Tải thêm"}
          </Button>
        </div>
      )}
    </div>
  )
}
