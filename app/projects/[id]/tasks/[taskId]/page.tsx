"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * Redirect to board with ?taskId=xxx so the right-side panel opens.
 * This keeps old direct links working.
 */
export default function TaskDetailRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const taskId = params.taskId as string

  useEffect(() => {
    router.replace(`/projects/${projectId}/board?taskId=${taskId}`)
  }, [projectId, taskId, router])

  return null
}
