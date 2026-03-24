import type { SprintDetail } from "@/app/types/task.schema"

export function orderSprintsForBacklogUi(sprints: SprintDetail[]): SprintDetail[] {
    const rank = (s: SprintDetail) =>
        s.status === "ACTIVE" ? 0 : s.status === "PLANNED" ? 1 : 2
    return [...sprints].sort((a, b) => {
        const dr = rank(a) - rank(b)
        if (dr !== 0) return dr
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    })
}

export function formatSprintDateRange(startIso: string, endIso: string, locale = "vi-VN"): string {
    const a = new Date(startIso)
    const b = new Date(endIso)
    const o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
    return `${a.toLocaleDateString(locale, o)} – ${b.toLocaleDateString(locale, o)}`
}
