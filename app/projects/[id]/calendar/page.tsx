"use client"

import React, { useState, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import CalendarView from "@/components/projects/CalendarView"
import TaskDetailPanel, { Member } from "@/components/projects/TaskDetailPanel"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useQuery } from "@tanstack/react-query"
import { ProjectService } from "@/app/services/ProjectService"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { toKanbanUserRole, toTaskPanelRole } from "@/lib/projectRole"

export default function ProjectCalendarPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  
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

  const projectMembers: Member[] = useMemo(() => {
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

  const handleViewChange = (view: "board" | "list" | "calendar") => {
    if (view === "board") {
      router.push(`/projects/${projectId}/board`)
    } else if (view === "list") {
      // router.push(`/projects/${projectId}/list`)
    }
  }

  const openTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    const next = new URLSearchParams(searchParams.toString())
    next.set("taskId", taskId)
    router.replace(`?${next.toString()}`, { scroll: false })
  }

  const closePanel = () => {
    setSelectedTaskId(null)
    const next = new URLSearchParams(searchParams.toString())
    next.delete("taskId")
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : ".", { scroll: false })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <CalendarView
        projectId={projectId}
        onTaskClick={openTask}
        onViewChange={handleViewChange}
        currentUserRole={kanbanRole}
      />

      {/* Task Detail Panel */}
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
