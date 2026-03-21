import type { TaskStatus, TaskPriority, TaskType } from "@/app/types/task.schema"

export const STATUS_CONFIG: Record<TaskStatus, {
    label: string
    bg: string
    dot: string
}> = {
    TODO:        { label: "To Do",        bg: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",   dot: "bg-gray-400" },
    IN_PROGRESS: { label: "In Progress",  bg: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",   dot: "bg-blue-500" },
    IN_REVIEW:   { label: "In Review",    bg: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", dot: "bg-orange-500" },
    DONE:        { label: "Done",         bg: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", dot: "bg-green-500" },
    CANCELLED:   { label: "Cancelled",    bg: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",        dot: "bg-red-500" },
}

export const TYPE_CONFIG: Record<TaskType, {
    label: string
    icon: string
    color: string
}> = {
    TASK:     { label: "TASK",     icon: "✦",  color: "text-blue-500" },
    BUG:      { label: "BUG",      icon: "🐛", color: "text-red-500" },
    FEATURE:  { label: "FEATURE",  icon: "⭐", color: "text-indigo-500" },
    STORY:    { label: "STORY",    icon: "📖", color: "text-purple-500" },
    EPIC:     { label: "EPIC",     icon: "⚡", color: "text-orange-500" },
    SUB_TASK: { label: "SUB-TASK", icon: "↳",  color: "text-gray-500" },
}

export const PRIORITY_CONFIG: Record<TaskPriority, {
    label: string
    color: string
    bg: string
    dot: string
}> = {
    CRITICAL: { label: "Critical", color: "text-red-600",    bg: "bg-red-50 dark:bg-red-900/20",    dot: "bg-red-500" },
    HIGH:     { label: "High",     color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-900/20", dot: "bg-orange-500" },
    MEDIUM:   { label: "Medium",   color: "text-yellow-600",  bg: "bg-yellow-50 dark:bg-yellow-900/20", dot: "bg-yellow-500" },
    LOW:      { label: "Low",      color: "text-green-600",   bg: "bg-green-50 dark:bg-green-900/20",  dot: "bg-green-500" },
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
}

export function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins  = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days  = Math.floor(diff / 86_400_000)
    if (mins < 1)   return "Just now"
    if (mins < 60)  return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return "Yesterday"
    return new Date(dateStr).toLocaleDateString("en-US")
}

export function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-US", {
        day: "numeric", month: "long", year: "numeric"
    })
}

export function getFileIcon(mimeType: string, fileName: string): string {
    if (mimeType.startsWith("image/")) return "🖼️"
    if (mimeType === "application/pdf") return "📄"
    if (mimeType.includes("spreadsheet") || fileName.match(/\.(xls|xlsx|csv)$/i)) return "📊"
    if (mimeType.includes("presentation") || fileName.match(/\.(ppt|pptx)$/i)) return "📑"
    if (mimeType.includes("word") || fileName.match(/\.(doc|docx)$/i)) return "📝"
    if (mimeType.includes("zip") || mimeType.includes("archive")) return "🗜️"
    return "📎"
}

export function isImageMime(mimeType: string): boolean {
    return mimeType.startsWith("image/")
}

export function isPdfMime(mimeType: string): boolean {
    return mimeType === "application/pdf"
}

export function isTextMime(mimeType: string, fileName: string): boolean {
    return mimeType.startsWith("text/") || fileName.endsWith(".md")
}
