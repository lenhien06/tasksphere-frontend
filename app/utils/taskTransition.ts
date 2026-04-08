import { TaskStatus } from "@/app/types/task.schema"

export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
    TODO:        ["TODO", "IN_PROGRESS", "READY_FOR_TEST", "TESTING", "IN_REVIEW", "DONE", "CANCELLED"],
    IN_PROGRESS: ["TODO", "IN_PROGRESS", "READY_FOR_TEST", "TESTING", "IN_REVIEW", "DONE", "CANCELLED"],
    READY_FOR_TEST: ["TODO", "IN_PROGRESS", "READY_FOR_TEST", "TESTING", "IN_REVIEW", "DONE", "CANCELLED"],
    TESTING:     ["TODO", "IN_PROGRESS", "READY_FOR_TEST", "TESTING", "IN_REVIEW", "DONE", "CANCELLED"],
    IN_REVIEW:   ["TODO", "IN_PROGRESS", "READY_FOR_TEST", "TESTING", "IN_REVIEW", "DONE", "CANCELLED"],
    DONE:        ["TODO", "IN_PROGRESS", "READY_FOR_TEST", "TESTING", "IN_REVIEW", "DONE", "CANCELLED"],
    CANCELLED:   ["TODO", "IN_PROGRESS", "READY_FOR_TEST", "TESTING", "IN_REVIEW", "DONE", "CANCELLED"],
}

export const canTransitionTo = (_current: TaskStatus, _next: TaskStatus): boolean => true

export const getAvailableTransitions = (current: TaskStatus): TaskStatus[] =>
    VALID_TRANSITIONS[current] ?? []

export const STATUS_LABELS: Record<TaskStatus, string> = {
    TODO:        "To Do",
    IN_PROGRESS: "In Progress",
    READY_FOR_TEST: "Ready for Test",
    TESTING:     "Testing",
    IN_REVIEW:   "In Review",
    DONE:        "Done",
    CANCELLED:   "Cancelled",
}

export const STATUS_STYLES: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
    TODO:        { bg: "bg-gray-100",  text: "text-gray-600",   dot: "bg-gray-400"   },
    IN_PROGRESS: { bg: "bg-blue-50",   text: "text-blue-600",   dot: "bg-blue-500"   },
    READY_FOR_TEST: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500" },
    TESTING:     { bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-500" },
    IN_REVIEW:   { bg: "bg-purple-50", text: "text-purple-600", dot: "bg-purple-500" },
    DONE:        { bg: "bg-green-50",  text: "text-green-600",  dot: "bg-green-500"  },
    CANCELLED:   { bg: "bg-red-50",    text: "text-red-500",    dot: "bg-red-400"    },
}
