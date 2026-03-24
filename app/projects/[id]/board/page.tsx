"use client"

import React, { useState, useEffect } from "react"
import KanbanBoard from "@/components/projects/KanbanBoard"
import type { TaskCardData } from "@/components/kanban/KanbanBoard"
import TaskDetailPanel, { Member } from "@/components/projects/TaskDetailPanel"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import { ProjectService } from "@/app/services/ProjectService"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { useQuery } from "@tanstack/react-query"
import { toKanbanUserRole, toTaskPanelRole } from "@/lib/projectRole"

export default function ProjectBoardPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string

  // Task panel state — read initial value from URL (?taskId=xxx)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    searchParams.get("taskId")
  )

  const { data: currentUser } = useCurrentUser()

  const { data: projectData } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn: () => ProjectService.getById(projectId),
    enabled: !!projectId,
  })

  const { data: membersData } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => ProjectMemberService.getMembers(projectId),
    enabled: !!projectId,
  })

  const kanbanRole = toKanbanUserRole(projectData?.data?.myRole, projectData?.data?.isOwner)
  const panelRole = toTaskPanelRole(projectData?.data?.myRole, projectData?.data?.isOwner)

  const projectMembers: Member[] = React.useMemo(() => {
    const list = (membersData as any)?.data || membersData || []
    if (!Array.isArray(list)) return []
    return list.map((m: any) => ({
      id: m.user?.id || m.id,
      name: m.user?.fullName || m.fullName || "Unknown",
      email: m.user?.email || m.email || "",
      avatarUrl: m.user?.avatarUrl || m.avatarUrl,
    }))
  }, [membersData])

  const mappedCurrentUser = currentUser
    ? {
        id: currentUser.id?.toString() || "unknown",
        name: currentUser.fullName || "Unknown User",
        email: currentUser.email,
        avatarUrl: currentUser.avatar?.imageUrl || undefined,
      }
    : { id: "guest", name: "Guest", email: "guest@example.com" }

  // Open panel and sync URL
  const openTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    const next = new URLSearchParams(searchParams.toString())
    next.set("taskId", taskId)
    router.replace(`?${next.toString()}`, { scroll: false })
  }

  // Close panel and clear URL param
  const closePanel = () => {
    setSelectedTaskId(null)
    const next = new URLSearchParams(searchParams.toString())
    next.delete("taskId")
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : ".", { scroll: false })
  }

  const handleTaskClick = (task: TaskCardData) => {
    openTask(task.id)
  }

  const handleViewChange = (view: string) => {
    if (view === "calendar") {
      router.push(`/projects/${projectId}/calendar`)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <KanbanBoard
        onTaskClick={handleTaskClick}
        onViewChange={handleViewChange}
        currentView="board"
        currentUserRole={kanbanRole}
      />

      <TaskDetailPanel
        taskId={selectedTaskId}
        projectId={projectId}
        projectMembers={projectMembers}
        currentUser={mappedCurrentUser}
        currentUserRole={panelRole}
        onClose={closePanel}
        onTaskUpdated={() => {}}
      />
    </div>
  )
}
