"use client"

import React from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ProjectService } from "@/app/services/ProjectService"
import SprintManagement from "@/components/projects/SprintManagement"
import { Loader2 } from "lucide-react"

export default function SprintsPage() {
  const params = useParams()
  const projectId = params.id as string

  const { data: projectData, isLoading } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn:  () => ProjectService.getById(projectId),
    enabled:  !!projectId,
  })

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    )
  }

  const myRole = projectData?.data?.myRole || "VIEWER"

  return (
    <div className="flex flex-col h-full bg-white sm:bg-transparent">
      <SprintManagement projectId={projectId} myRole={myRole} />
    </div>
  )
}
