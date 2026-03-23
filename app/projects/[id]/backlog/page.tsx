"use client"

import React from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ProjectService } from "@/app/services/ProjectService"
import { toLegacyMyRoleLower } from "@/lib/projectRole"
import BacklogPage from "@/components/projects/BacklogPage"

export default function BacklogRoutePage() {
  const params = useParams()
  const projectId = params.id as string

  const { data: projectData } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn:  () => ProjectService.getById(projectId),
    enabled:  !!projectId,
  })

  const myRole = toLegacyMyRoleLower(projectData?.data?.myRole, projectData?.data?.isOwner)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <BacklogPage projectId={projectId} myRole={myRole} />
    </div>
  )
}
