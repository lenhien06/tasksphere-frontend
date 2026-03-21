"use client"

import React, { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ProjectService } from "@/app/services/ProjectService"
import VersionManagement from "@/components/projects/VersionManagement"
import CustomFieldsManager from "@/components/settings/CustomFieldsManager"
import WebhookManager from "@/components/settings/WebhookManager"
import { cn } from "@/lib/utils"

type Tab = "info" | "workflow" | "versions" | "custom-fields" | "webhooks"

export default function ProjectSettingsPage() {
  const params    = useParams()
  const projectId = params.id as string
  const [tab, setTab] = useState<Tab>("versions")

  const { data: projectData } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn:  () => ProjectService.getById(projectId),
    enabled:  !!projectId,
  })

  const myRole = projectData?.data?.myRole || "VIEWER"

  const tabs: { id: Tab; label: string }[] = [
    { id: "info",          label: "📋 Info" },
    { id: "workflow",      label: "🔄 Workflow" },
    { id: "versions",      label: "🚀 Versions" },
    { id: "custom-fields", label: "🏷 Custom Fields" },
    { id: "webhooks",      label: "🔗 Webhooks" },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Project Settings</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="text-gray-500 text-sm py-8 text-center">
          Project Info (coming soon)
        </div>
      )}
      {tab === "workflow" && (
        <div className="text-gray-500 text-sm py-8 text-center">
          Workflow Configuration (coming soon)
        </div>
      )}
      {tab === "versions" && (
        <VersionManagement projectId={projectId} myRole={myRole} />
      )}
      {tab === "custom-fields" && (
        <CustomFieldsManager projectId={projectId} myRole={myRole} />
      )}
      {tab === "webhooks" && (
        <WebhookManager projectId={projectId} myRole={myRole} />
      )}
    </div>
  )
}
