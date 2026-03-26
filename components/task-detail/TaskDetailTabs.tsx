"use client"

import React, { useState, Suspense, lazy } from "react"
import { useSearchParams } from "next/navigation"
import { MessageSquare, CheckSquare, Paperclip, Clock, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TaskDetailResponse } from "@/app/types/task.schema"

const CommentsTab   = lazy(() => import("@/components/task-detail/tabs/CommentsTab"))
const ChecklistTab  = lazy(() => import("@/components/task-detail/tabs/ChecklistTab"))
const AttachmentsTab = lazy(() => import("@/components/task-detail/tabs/AttachmentsTab"))
const WorklogTab    = lazy(() => import("@/components/task-detail/tabs/WorklogTab"))
const ActivityTab   = lazy(() => import("@/components/task-detail/tabs/ActivityTab"))

type TabKey = "comments" | "checklist" | "attachments" | "worklog" | "activity"

interface TaskDetailTabsProps {
    task: TaskDetailResponse
    projectId: string
    currentUserRole?: "PM" | "MEMBER" | "VIEWER"
}

function TabSkeleton() {
    return (
        <div className="space-y-3 animate-pulse mt-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
        </div>
    )
}

export default function TaskDetailTabs({ task, projectId, currentUserRole }: TaskDetailTabsProps) {
    const searchParams = useSearchParams()
    const initialTab = (searchParams.get("tab") as TabKey | null) ?? "comments"
    const [active, setActive] = useState<TabKey>(initialTab)
    const [mounted, setMounted] = useState<Record<TabKey, boolean>>({
        comments: false,
        checklist: false,
        attachments: false,
        worklog: false,
        activity: false,
        [initialTab]: true,
    } as Record<TabKey, boolean>)

    const switchTab = (tab: TabKey) => {
        setActive(tab)
        setMounted(prev => ({ ...prev, [tab]: true }))
        // Update URL bar without triggering Next.js RSC navigation
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search)
            params.set("tab", tab)
            window.history.replaceState(null, "", `?${params.toString()}`)
        }
    }

    const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number | string }[] = [
        {
            key: "comments",
            label: "Bình luận",
            icon: <MessageSquare size={14} />,
            badge: task.commentsCount || undefined,
        },
        {
            key: "checklist",
            label: "Checklist",
            icon: <CheckSquare size={14} />,
            badge: task.checklist?.length
                ? `${task.checklist.filter(c => c.isDone).length}/${task.checklist.length}`
                : undefined,
        },
        {
            key: "attachments",
            label: "Tệp đính kèm",
            icon: <Paperclip size={14} />,
            badge: task.attachmentsCount || undefined,
        },
        {
            key: "worklog",
            label: "Worklog",
            icon: <Clock size={14} />,
        },
        {
            key: "activity",
            label: "Hoạt động",
            icon: <SlidersHorizontal size={14} />,
        },
    ]

    return (
        <div className="space-y-0">
            {/* Tab bar */}
            <div className="flex border-b overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => switchTab(tab.key)}
                        aria-selected={active === tab.key}
                        role="tab"
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
                            active === tab.key
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.badge !== undefined && (
                            <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full",
                                active === tab.key
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                            )}>
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab content - lazy mount, keep mounted after first visit */}
            <div className="pt-4">
                <Suspense fallback={<TabSkeleton />}>
                    <div className={active === "comments" ? "block" : "hidden"}>
                        {mounted["comments"] && (
                            <CommentsTab projectId={projectId} taskId={task.id} />
                        )}
                    </div>
                        <div className={active === "checklist" ? "block" : "hidden"}>
                            {mounted["checklist"] && (
                                <ChecklistTab projectId={task.projectId ?? projectId} taskId={task.id} />
                            )}
                        </div>
                    <div className={active === "attachments" ? "block" : "hidden"}>
                        {mounted["attachments"] && (
                            <AttachmentsTab projectId={projectId} taskId={task.id} />
                        )}
                    </div>
                    <div className={active === "worklog" ? "block" : "hidden"}>
                        {mounted["worklog"] && (
                            <WorklogTab projectId={projectId} taskId={task.id} currentUserRole={currentUserRole} />
                        )}
                    </div>
                    {/* Activity tab: always remount when active so it fetches fresh data */}
                    {active === "activity" && (
                        <ActivityTab projectId={projectId} taskId={task.id} />
                    )}
                </Suspense>
            </div>
        </div>
    )
}
