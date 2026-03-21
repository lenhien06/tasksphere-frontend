"use client"

import React, { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import CalendarView from "@/components/projects/CalendarView"
import TaskDetailPanel from "@/components/projects/TaskDetailPanel"

// Mock members (sync with KanbanBoard)
const PROJECT_MEMBERS = [
  { id: "u1", name: "Alice PM", email: "pm@example.com", avatarUrl: "https://i.pravatar.cc/150?u=u1" },
  { id: "u2", name: "Bob Dev", email: "dev@example.com", avatarUrl: "https://i.pravatar.cc/150?u=u2" },
  { id: "u3", name: "Carol Tech", email: "le@example.com", avatarUrl: "https://i.pravatar.cc/150?u=u3" },
  { id: "u4", name: "Dave Backend", email: "be@example.com", avatarUrl: "https://i.pravatar.cc/150?u=u4" },
]

const CURRENT_USER = {
  id: "u3",
  name: "Carol Tech",
  email: "le@example.com",
  avatarUrl: "https://i.pravatar.cc/150?u=u3"
}

export default function ProjectCalendarPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const handleViewChange = (view: "board" | "list" | "calendar") => {
    if (view === "board") {
      router.push(`/projects/${projectId}/board`)
    } else if (view === "list") {
      // router.push(`/projects/${projectId}/list`)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <CalendarView
        projectId={projectId}
        onTaskClick={(id) => setSelectedTaskId(id)}
        onViewChange={handleViewChange}
      />

      {/* Task Detail Panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        projectId={projectId}
        projectMembers={PROJECT_MEMBERS}
        currentUser={CURRENT_USER}
        currentUserRole="PM"
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={() => {}}
      />
    </div>
  )
}
