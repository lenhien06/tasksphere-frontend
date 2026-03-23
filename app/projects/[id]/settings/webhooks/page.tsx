"use client"

import React from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ProjectService } from "@/app/services/ProjectService"
import WebhookManager from "@/components/settings/WebhookManager"
import { toLegacyMyRoleLower } from "@/lib/projectRole"

export default function WebhooksSettingsPage() {
  const params = useParams()
  const projectId = params.id as string

  const { data: projectData } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn:  () => ProjectService.getById(projectId),
    enabled:  !!projectId,
  })

  const myRole = toLegacyMyRoleLower(projectData?.data?.myRole, projectData?.data?.isOwner)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">🔗 Webhooks</h1>
      <WebhookManager projectId={projectId} myRole={myRole} />
    </div>
  )
}
