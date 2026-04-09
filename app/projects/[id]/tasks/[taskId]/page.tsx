"use client"

import { useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

/**
 * Redirect to board with ?taskId=xxx so the right-side panel opens.
 * This keeps old direct links working.
 */
export default function TaskDetailRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const taskId = params.taskId as string

  useEffect(() => {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.set("taskId", taskId)
    router.replace(`/projects/${projectId}/board?${nextSearchParams.toString()}`)
  }, [projectId, searchParams, taskId, router])

  return null
}
