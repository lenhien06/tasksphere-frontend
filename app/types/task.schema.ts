// ── Enums — uppercase to match BE ────────────────────────────
export type TaskStatus   = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED"
export type TaskPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
export type TaskType     = "TASK" | "BUG" | "FEATURE" | "STORY" | "EPIC" | "SUB_TASK"
export type ProjectRole  = "PM" | "MEMBER" | "VIEWER"

// ── Shared sub-types ──────────────────────────────────────────
export interface UserSummary {
    id: string
    fullName: string
    avatarUrl: string | null
}

export interface ColumnSummary {
    id: string
    name: string
    colorHex: string   // "#1677FF"
    position: number
}

export interface SprintSummary {
    id: string
    name: string
    status: "PLANNED" | "ACTIVE" | "COMPLETED"
}

// ── TaskResponse — list/board (100% matches BE response) ────
export interface TaskResponse {
    id: string
    taskCode: string
    title: string
    type: TaskType
    priority: TaskPriority
    taskStatus: TaskStatus          // BE: taskStatus (not status)
    columnId: string                // BE: columnId (not statusColumn.id)
    columnName: string              // BE: columnName
    taskPosition: number            // BE: taskPosition (not position)
    sprintId: string | null         // spec 1.2
    sprintName: string | null       // spec 1.2
    storyPoints: number | null
    dueDate: string | null          // ISO 8601
    overdue: boolean                // BE: overdue (not isOverdue)
    subtaskCount: number
    subtaskDone: number             // BE: subtaskDone (not subtaskDoneCount)
    subtaskProgress: number | null  // 0–100, null if no subtasks
    commentsCount: number           // BE: commentsCount (not commentCount)
    attachmentsCount: number        // BE: attachmentsCount (not attachmentCount)
    assignee: UserSummary | null
    reporter: UserSummary
    createdAt: string
    updatedAt: string
    parentRecurringTaskId?: string | null  // recurring instance
    recurring?: boolean                    // BE field name — true when task has active recurrence
}

// ── TaskDetailResponse — Task Detail Panel (full) ─────────────
export interface TaskDetailResponse extends TaskResponse {
    description: string | null      // Markdown
    estimatedHours: number | null
    actualHours: number | null
    sprint: SprintSummary | null
    parentTask: { id: string; taskCode: string; title: string } | null
    subtasks: SubTaskSummary[]
    checklist: ChecklistItem[]
    attachments: AttachmentSummary[]
    version: number                 // ETag optimistic locking
    versionInfo?: { id: string; name: string; status: string } | null   // Project version assignment
    customFieldValues?: CustomFieldValue[]
    canEdit?: boolean               // BE-computed — true if current user may edit
    canDelete?: boolean             // BE-computed — true if current user may delete
}

export interface SubTaskSummary {
    id: string
    taskCode: string
    title: string
    status: TaskStatus
    assignee: UserSummary | null
    depth: number               // 0–3
}

export interface ChecklistItem {
    id: string
    title: string
    isDone: boolean
    position: number
    completedBy: UserSummary | null
    completedAt: string | null
}

export interface AttachmentSummary {
    id: string
    fileName: string
    fileSize: number            // bytes
    mimeType: string
    uploadedBy: UserSummary
    uploadedAt: string
}

export interface TaskStatusChangedResponse {
    id: string
    taskCode: string
    oldStatus: TaskStatus
    newStatus: TaskStatus
    updatedAt: string
}

// ── Request types ─────────────────────────────────────────────
export interface CreateTaskRequest {
    title: string                       // required, max 255
    description?: string                // Markdown
    type?: TaskType                     // default: TASK
    priority?: TaskPriority             // default: MEDIUM
    assigneeId?: string                 // UUID, must be member
    dueDate?: string                    // ISO 8601
    storyPoints?: number                // 0–100
    estimatedHours?: number
    sprintId?: string                   // null = backlog
    parentTaskId?: string
    statusColumnId?: string             // null = first column
}

export interface UpdateTaskRequest {
    title?: string
    description?: string | null
    type?: TaskType
    priority?: TaskPriority
    assigneeId?: string | null          // null = unassign
    dueDate?: string | null
    storyPoints?: number | null         // 1–100; null = keep
    estimatedHours?: number | null
    sprintId?: string | null            // null = backlog
    statusColumnId?: string | null      // triggers BR-14 same as PATCH status
}

export interface UpdateTaskStatusRequest {
    status: TaskStatus
    comment?: string                    // optional activity log (spec 1.6 — no statusColumnId in DTO)
}

export interface UpdateTaskPositionRequest {
    newPosition: number
    statusColumnId: string
}

export interface TaskFilterParams {
    q?: string                          // search title or taskCode
    status?: TaskStatus
    assigneeId?: string                 // UUID or "me"
    sprintId?: string                   // UUID (not "backlog" — use /backlog endpoint)
    priority?: TaskPriority
    type?: TaskType
    overdue?: boolean                   // dueDate < today, not DONE/CANCELLED
    dueSoon?: boolean                   // dueDate within 7 days, not DONE/CANCELLED
    limit?: number                      // max 100
    sortBy?: "dueDate" | "priority" | "createdAt"
    order?: "asc" | "desc"
    sort?: string                       // legacy "due_date,asc" format
    page?: number
    size?: number
}

// ── ColumnResponse — from GET /projects/{id}/columns ─────────
export interface ColumnResponse {
    id: string
    name: string
    colorHex: string
    position: number
    isDefault: boolean
    taskCount: number
    mappedStatus?: TaskStatus   // BE: canonical status for this column (preferred over name heuristics)
}

// ── Status transition validation ──────────────────────────────
// BR-14: strict workflow — IN_PROGRESS → IN_REVIEW only (not directly to DONE)
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
    TODO:        ["IN_PROGRESS"],
    IN_PROGRESS: ["IN_REVIEW"],
    IN_REVIEW:   ["DONE", "IN_PROGRESS"],
    DONE:        [],
    CANCELLED:   [],
}

export const canTransitionTo = (current: TaskStatus, next: TaskStatus): boolean =>
    VALID_TRANSITIONS[current]?.includes(next) ?? false

// ── TaskDetailService response types ──────────────────────────

export interface ChecklistItemResponse {
    id:          string
    title:       string
    isDone:      boolean
    sortOrder:   number
    completedBy: UserSummary | null
    completedAt: string | null
    createdAt:   string
}

export interface CommentResponse {
    id:             string
    author:         UserSummary
    content:        string        // sanitized HTML
    parentId:       string | null
    depth:          number        // 0 = root, 1 = reply, 2 = reply-to-reply
    isEdited:       boolean
    mentionedUsers: UserSummary[]
    attachments:    AttachmentResponse[]
    replies:        CommentResponse[]   // direct children, returned by server
    canEdit:        boolean       // true if author + < 24h
    canDelete:      boolean       // true if author or PM
    createdAt:      string
    updatedAt:      string | null
}

export interface AttachmentResponse {
    id:          string
    fileName:    string
    fileSize:    number           // bytes
    mimeType:    string
    downloadUrl: string           // presigned TTL 1h
    previewUrl:  string | null    // presigned TTL 15min
    previewable: boolean
    uploadedBy:  UserSummary
    uploadedAt:  string
}

export interface WorklogResponse {
    id:                 string
    user:               UserSummary
    timeSpent:          number    // seconds
    timeSpentFormatted: string    // "2h 30m"
    logDate:            string    // "2024-08-20"
    note:               string | null
    createdAt:          string
}

export interface WorklogSummary {
    totalSeconds:   number
    totalFormatted: string
    logs:           WorklogResponse[]
}

export interface SubTaskResponse {
    id:           string
    taskCode:     string
    title:        string
    taskStatus:   TaskStatus
    priority:     TaskPriority
    assignee:     UserSummary | null
    dueDate:      string | null
    depth:                 number
    subtaskCount:          number
    completedSubtaskCount: number
}

/** POST /v1/tasks/{subtaskId}/promote — fields optional; omitted = giữ nguyên */
export interface PromoteSubTaskRequestBody {
    title?: string
    assigneeId?: string
    dueDate?: string
    description?: string
}

// ── Custom Columns ─────────────────────────────────────────────
export interface CreateColumnRequest {
    name:          string
    colorHex:      string
    mappedStatus?: TaskStatus
}

export interface UpdateColumnRequest {
    name?:     string
    colorHex?: string
}

export interface ReorderColumnsRequest {
    orderedIds: string[]
}

// ── Saved Filters ──────────────────────────────────────────────
export interface SavedFilter {
    id:             string
    name:           string
    filterCriteria: Record<string, unknown>
    createdAt:      string
}

export interface CreateSavedFilterRequest {
    name:           string
    filterCriteria: Record<string, unknown>
}

// ── Task Dependencies ──────────────────────────────────────────
export interface DependencyItem {
    depId:    string
    linkType: string          // BLOCKS | BLOCKED_BY | RELATES_TO | DUPLICATES | IS_DUPLICATED_BY
    task: {
        id:         string
        taskCode:   string
        title:      string
        taskStatus: TaskStatus
        priority:   TaskPriority
        type:       TaskType
    }
}

export interface TaskDependenciesResponse {
    blockedBy:           DependencyItem[]   // tasks blocking this task
    blocking:            DependencyItem[]   // tasks this task is blocking
    others:              DependencyItem[]   // RELATES_TO, DUPLICATES, …
    canTransitionToDone: boolean
}

// ── Phase 4 — Sprint / Version / Reports ──────────────────────

export type SprintStatus  = "PLANNED" | "ACTIVE" | "COMPLETED"
export type VersionStatus = "PLANNING" | "IN_PROGRESS" | "RELEASED"
export type VelocityTrend = "UP" | "DOWN" | "STABLE"

export interface SprintDetail {
    id:             string
    name:           string
    goal:           string | null
    status:         SprintStatus
    startDate:      string
    endDate:        string
    startedAt:      string | null
    completedAt:    string | null
    velocity:       number
    taskCount:      number
    doneCount:      number
    completionRate: number
}

export interface CreateSprintRequest {
    name:       string
    goal?:      string
    startDate:  string
    endDate:    string
}

export interface CompleteSprintRequest {
    unfinishedTasksAction: "backlog" | "nextSprint"
    nextSprintId?:         string
}

export interface CompleteSprintResponse {
    sprintId:    string
    name:        string
    status:      SprintStatus
    velocity:    number
    completedAt: string
    report: {
        totalTasks:     number
        doneTasks:      number
        cancelledTasks: number
        movedToBacklog: number
        velocity:       number
        completionRate: number
    }
}

// FR-27: Project Overview
export interface ProjectOverview {
    totalTasks:      number
    completionRate:  number        // %
    tasksByStatus: {
        TODO:        number
        IN_PROGRESS: number
        IN_REVIEW:   number
        DONE:        number
        CANCELLED:   number
    }
    overdueCount:    number
    overdueTasks?:   number        // Alias for overdueCount if used in some API versions
    dueTodayCount:   number
    totalStoryPoints: number
    doneStoryPoints:  number
}

// FR-27: Burndown Chart
export interface BurndownPoint {
    date:            string    // "2026-03-01"
    remainingPoints: number | null   // actual
    idealPoints:     number   // ideal
}

export interface BurndownData {
    sprintId:         string
    sprintName:       string
    startDate:        string
    endDate:          string
    totalStoryPoints: number
    idealLine:        BurndownPoint[]
    actualLine:       BurndownPoint[]
}

// FR-29: Velocity
export interface SprintVelocityItem {
    sprintId:    string
    sprintName:  string
    completedAt: string
    velocity:    number
    totalTasks:  number
    doneTasks:   number
    completionRate: number
}

export interface VelocityData {
    sprints:         SprintVelocityItem[]
    averageVelocity: number
    trend:           VelocityTrend
}

// FR-28: Member Performance
export interface MemberPerformance {
    user:                 UserSummary & { projectRole: string }
    tasksAssigned:        number
    tasksDone:            number
    tasksInProgress:      number
    tasksOverdue:         number
    storyPointsCompleted: number
    completionRate:       number
    avgCompletionDays:    number
}

export interface MemberReportData {
    period: {
        sprintId?:   string
        sprintName?: string
        dateFrom?:   string
        dateTo?:     string
    }
    members: MemberPerformance[]
}

export interface ProjectVersion {
    id:             string
    name:           string
    description:    string | null
    status:         VersionStatus
    releaseDate:    string | null
    taskCount:      number
    doneCount:      number
    completionRate: number
    createdAt:      string
}

export interface CreateVersionRequest {
    name:         string
    description?: string
    releaseDate?: string
}

export interface VersionSummary {
    id:     string
    name:   string
    status: VersionStatus
}

// ── Calendar ───────────────────────────────────────────────────
export interface CalendarApiTask {
    id:          string
    taskCode:    string
    title:       string
    priority:    TaskPriority
    taskStatus:  TaskStatus
    dueDate:     string
    columnName:  string
    columnColor: string
    isOverdue:   boolean
    assignee:    UserSummary | null
}

export interface CalendarResponse {
    year:       number
    month:      number
    totalTasks: number
    tasks:      CalendarApiTask[]
}

// ── Phase 6 — Custom Fields ────────────────────────────────────

export type CustomFieldType = "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "MULTI_SELECT" | "URL"

export interface CustomFieldDefinition {
    id:        string
    name:      string
    fieldType: CustomFieldType
    options:   string[] | null      // only for SELECT type
    required:  boolean
    hidden:    boolean
    position:  number
    hasValues: boolean              // true → cannot delete (only hide)
}

export interface CustomFieldValue {
    fieldDefinitionId: string
    fieldName:         string
    fieldType:         CustomFieldType
    value:             string | null    // raw string
    typedValue:        unknown          // converted (number, date, boolean...)
}

export interface CreateCustomFieldRequest {
    name:      string
    fieldType: CustomFieldType
    options?:  string[]           // required if SELECT
    required?: boolean
    position?: number
}

export interface UpdateCustomFieldRequest {
    name?:     string
    options?:  string[]
    position?: number
    required?: boolean
    hidden?:   boolean
}

export interface SaveCustomFieldValuesRequest {
    values: { fieldId: string; value: string | null }[]   // spec: fieldId (not fieldDefinitionId)
}

// ── Phase 6 — Recurring Task ───────────────────────────────────

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM"
export type RecurrenceStatus    = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED"

export interface TaskRecurrence {
    id:                   string
    frequency:            RecurrenceFrequency
    frequencyConfig:      Record<string, unknown>
    endDate:              string | null
    maxOccurrences:       number | null
    occurrenceCount:      number
    nextRunAt:            string
    status:               RecurrenceStatus
    remainingOccurrences: number | null
}

export interface SetRecurrenceRequest {
    frequency:       RecurrenceFrequency
    daysOfWeek?:     number[]          // WEEKLY: [1,3,5] Mon=1
    dayOfMonth?:     number            // MONTHLY: 1-31
    cronExpression?: string            // CUSTOM
    endDate?:        string
    maxOccurrences?: number
    firstRunAt:      string            // ISO datetime
}

// ── Phase 6 — Webhook ─────────────────────────────────────────

export interface WebhookItem {
    id:              string
    name:            string
    url:             string
    events:          string[]
    active:          boolean
    lastTriggeredAt: string | null
    failureCount:    number
    secretKey?:      string            // masked "****"
}

export interface CreateWebhookRequest {
    name:       string
    url:        string                  // HTTPS only
    events:     string[]
    secretKey?: string
}

export interface WebhookTestResult {
    success:      boolean
    statusCode:   number | null
    responseTime: number
    message:      string
}

// ── Phase 6 — Notification Preferences ────────────────────────

export interface NotificationPreferences {
    emailDailyDigest: boolean
    weekdaysOnly:     boolean
    timezone:         string           // IANA timezone
    typePreferences:  Record<string, boolean>  // per-type toggle
}
