"use client"

import React from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ProjectService } from "@/app/services/ProjectService"
import CustomFieldsManager from "@/components/settings/CustomFieldsManager"
import { canActAsProjectManager } from "@/lib/projectRole"

export default function CustomFieldsSettingsPage() {
  const params = useParams()
  const projectId = params.id as string

  const { data: projectData } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn:  () => ProjectService.getById(projectId),
    enabled:  !!projectId,
  })

  const myRole = projectData?.data?.myRole ?? "VIEWER"
  const isOwner = projectData?.data?.isOwner === true

  const isAuthorized = canActAsProjectManager(myRole, isOwner)

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m12-3V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2v-3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 max-w-md">
          Bạn không có quyền truy cập trang cài đặt custom field. Chỉ Project Manager hoặc Admin mới có quyền này.
        </p>
      </div>
    )
  }

  return <CustomFieldsManager projectId={projectId} myRole={myRole} isOwner={isOwner} />
}
