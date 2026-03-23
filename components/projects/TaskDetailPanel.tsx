"use client"

import React from "react"
import { useQuery } from "@tanstack/react-query"
import { ProjectService } from "@/app/services/ProjectService"
import { toTaskPanelRole } from "@/lib/projectRole"
import TaskDetailPageContent from "@/components/task-detail/TaskDetailPageContent"

// ── Exported types (kept for backward compatibility with imported files) ──

export interface Member {
    id: string
    name: string
    email: string
    avatarUrl?: string
}

export interface TaskDetailPanelProps {
    taskId: string | null
    projectId: string
    projectMembers?: Member[]
    currentUser?: Member
    currentUserRole?: "PM" | "MEMBER" | "VIEWER"
    onClose: () => void
    onTaskUpdated?: () => void
}

// ── Panel wrapper ─────────────────────────────────────────────

export default function TaskDetailPanel({
    taskId,
    projectId,
    currentUserRole: roleProp,
    onClose,
}: TaskDetailPanelProps) {
    // Get role from project if caller didn't pass it
    const { data: projectData } = useQuery({
        queryKey: ["project-detail", projectId],
        queryFn: () => ProjectService.getById(projectId),
        enabled: !!projectId && !roleProp,
        staleTime: 60_000,
    })

    const myRole: "PM" | "MEMBER" | "VIEWER" =
        roleProp ??
        toTaskPanelRole(projectData?.data?.myRole, projectData?.data?.isOwner)

    if (!taskId) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-[56px] h-[calc(100vh-56px)] w-full md:w-[720px] bg-white border-l border-slate-200 shadow-[0_0_50px_rgba(0,0,0,0.15)] z-50 flex flex-col overflow-hidden animate-slide-in-right">
                <TaskDetailPageContent
                    projectId={projectId}
                    taskId={taskId}
                    currentUserRole={myRole}
                    onClose={onClose}
                />
            </div>
        </>
    )
}
