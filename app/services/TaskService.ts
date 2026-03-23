import { apiJava } from "@/lib/axios";
import { ApiResponse, PageResponse } from "@/app/types/common..schema";
import {
    CreateTaskRequest,
    UpdateTaskRequest,
    UpdateTaskStatusRequest,
    UpdateTaskPositionRequest,
    TaskResponse,
    TaskDetailResponse,
    TaskStatusChangedResponse,
    TaskFilterParams,
    ColumnResponse,
    CreateColumnRequest,
    UpdateColumnRequest,
    SavedFilter,
    CreateSavedFilterRequest,
    DependencyItem,
    TaskDependenciesResponse,
    CalendarApiTask,
    CalendarResponse,
    SprintDetail,
    CreateSprintRequest,
    CompleteSprintRequest,
    CompleteSprintResponse,
    SprintStatus,
    BurndownData,
    VelocityData,
    ProjectOverview,
    MemberPerformance,
    MemberReportData,
    ProjectVersion,
    CreateVersionRequest,
    VersionStatus,
    CustomFieldDefinition,
    CustomFieldValue,
    CreateCustomFieldRequest,
    UpdateCustomFieldRequest,
    SaveCustomFieldValuesRequest,
    TaskRecurrence,
    SetRecurrenceRequest,
    WebhookItem,
    CreateWebhookRequest,
    WebhookTestResult,
    NotificationPreferences,
} from "@/app/types/task.schema";

const BASE = "/v1/projects";

export const TaskService = {
    // POST /projects/{pId}/tasks
    createTask: async (projectId: string, data: CreateTaskRequest): Promise<TaskDetailResponse> => {
        const res = await apiJava.post<ApiResponse<TaskDetailResponse>>(
            `${BASE}/${projectId}/tasks`, data
        );
        return res.data.data;
    },

    // GET /projects/{pId}/tasks
    getTasks: async (projectId: string, params?: TaskFilterParams): Promise<PageResponse<TaskResponse>> => {
        const res = await apiJava.get<ApiResponse<PageResponse<TaskResponse>>>(
            `${BASE}/${projectId}/tasks`, { params }
        );
        return res.data.data;
    },

    // GET /projects/{pId}/tasks/{tId}
    getTaskById: async (projectId: string, taskId: string): Promise<{ task: TaskDetailResponse; etag: string }> => {
        const res = await apiJava.get<ApiResponse<TaskDetailResponse>>(
            `${BASE}/${projectId}/tasks/${taskId}`
        );
        const etag = (res.headers as Record<string, string>)["etag"] ?? "";
        return { task: res.data.data, etag };
    },

    // PUT /projects/{pId}/tasks/{tId}
    updateTask: async (projectId: string, taskId: string, data: UpdateTaskRequest): Promise<TaskDetailResponse> => {
        const res = await apiJava.put<ApiResponse<TaskDetailResponse>>(
            `${BASE}/${projectId}/tasks/${taskId}`, data
        );
        return res.data.data;
    },

    // PATCH /projects/{pId}/tasks/{tId}/status
    updateStatus: async (
        projectId: string,
        taskId: string,
        data: UpdateTaskStatusRequest,
        etag?: string,
    ): Promise<TaskStatusChangedResponse> => {
        const headers: Record<string, string> = {};
        if (etag) headers["If-Match"] = etag;
        const res = await apiJava.patch<ApiResponse<TaskStatusChangedResponse>>(
            `${BASE}/${projectId}/tasks/${taskId}/status`,
            data, { headers }
        );
        return res.data.data;
    },

    // PATCH /projects/{pId}/tasks/{tId}/position
    updatePosition: async (
        projectId: string,
        taskId: string,
        data: UpdateTaskPositionRequest,
    ): Promise<void> => {
        await apiJava.patch(`${BASE}/${projectId}/tasks/${taskId}/position`, data);
    },

    // DELETE /projects/{pId}/tasks/{tId}
    deleteTask: async (projectId: string, taskId: string): Promise<void> => {
        await apiJava.delete(`${BASE}/${projectId}/tasks/${taskId}`);
    },

    // GET /projects/{pId}/columns — always returns ≥ 3 default columns (BE seeds on demand)
    getColumns: async (projectId: string): Promise<ColumnResponse[]> => {
        const res = await apiJava.get<ApiResponse<ColumnResponse[]>>(
            `${BASE}/${projectId}/columns`
        );
        return res.data.data;
    },

    // ── COLUMNS CRUD ──────────────────────────────────────────

    // POST /projects/{pId}/columns
    createColumn: async (projectId: string, data: CreateColumnRequest): Promise<ColumnResponse> => {
        const res = await apiJava.post<ApiResponse<ColumnResponse>>(
            `${BASE}/${projectId}/columns`, data
        );
        return res.data.data;
    },

    // PUT /columns/{id}
    updateColumn: async (columnId: string, data: UpdateColumnRequest): Promise<ColumnResponse> => {
        const res = await apiJava.put<ApiResponse<ColumnResponse>>(
            `/v1/columns/${columnId}`, data
        );
        return res.data.data;
    },

    // DELETE /columns/{id}
    deleteColumn: async (columnId: string): Promise<{ message: string; movedTaskCount: number; movedToColumn: string }> => {
        const res = await apiJava.delete<ApiResponse<{ message: string; movedTaskCount: number; movedToColumn: string }>>(
            `/v1/columns/${columnId}`
        );
        return res.data.data;
    },

    // PATCH /projects/{pId}/columns/reorder
    reorderColumns: async (projectId: string, orderedIds: string[]): Promise<ColumnResponse[]> => {
        const res = await apiJava.patch<ApiResponse<ColumnResponse[]>>(
            `${BASE}/${projectId}/columns/reorder`,
            { orderedIds }
        );
        return res.data.data;
    },

    // ── SAVED FILTERS ─────────────────────────────────────────

    // POST /projects/{pId}/saved-filters
    createSavedFilter: async (projectId: string, data: CreateSavedFilterRequest): Promise<SavedFilter> => {
        const res = await apiJava.post<ApiResponse<SavedFilter>>(
            `${BASE}/${projectId}/saved-filters`, data
        );
        return res.data.data;
    },

    // GET /projects/{pId}/saved-filters
    getSavedFilters: async (projectId: string): Promise<SavedFilter[]> => {
        const res = await apiJava.get<ApiResponse<SavedFilter[]>>(
            `${BASE}/${projectId}/saved-filters`
        );
        return res.data.data;
    },

    // DELETE /saved-filters/{filterId}
    deleteSavedFilter: async (filterId: string): Promise<void> => {
        await apiJava.delete(`/v1/saved-filters/${filterId}`);
    },

    // ── DEPENDENCIES ──────────────────────────────────────────

    // GET /tasks/{tId}/links (preferred over /dependencies per spec 3.2)
    getDependencies: async (taskId: string): Promise<TaskDependenciesResponse> => {
        const res = await apiJava.get<ApiResponse<TaskDependenciesResponse>>(
            `/v1/tasks/${taskId}/links`
        );
        return res.data.data;
    },

    // POST /tasks/{tId}/links (preferred) — targetTaskId + linkType per spec 3.1
    addDependency: async (taskId: string, targetTaskId: string, linkType: string): Promise<DependencyItem> => {
        const res = await apiJava.post<ApiResponse<DependencyItem>>(
            `/v1/tasks/${taskId}/links`,
            { targetTaskId, linkType }
        );
        return res.data.data;
    },

    // DELETE /tasks/{tId}/links/{linkId} (spec 3.3)
    deleteDependency: async (taskId: string, depId: string): Promise<void> => {
        await apiJava.delete(`/v1/tasks/${taskId}/links/${depId}`);
    },

    // ── CALENDAR ──────────────────────────────────────────────

    // GET /projects/{pId}/tasks/calendar?year=&month=
    getCalendar: async (projectId: string, year: number, month: number): Promise<CalendarResponse> => {
        const res = await apiJava.get<ApiResponse<CalendarResponse>>(
            `${BASE}/${projectId}/tasks/calendar`,
            { params: { year, month } }
        );
        return res.data.data;
    },

    // ── SPRINT ────────────────────────────────────────────────

    getSprints: async (projectId: string): Promise<SprintDetail[]> => {
        const res = await apiJava.get<ApiResponse<SprintDetail[]>>(
            `/v1/projects/${projectId}/sprints`
        );
        return res.data.data;
    },

    createSprint: async (projectId: string, data: CreateSprintRequest): Promise<SprintDetail> => {
        const res = await apiJava.post<ApiResponse<SprintDetail>>(
            `/v1/projects/${projectId}/sprints`, data
        );
        return res.data.data;
    },

    updateSprint: async (sprintId: string, data: Partial<CreateSprintRequest>): Promise<SprintDetail> => {
        const res = await apiJava.put<ApiResponse<SprintDetail>>(
            `/v1/sprints/${sprintId}`, data
        );
        return res.data.data;
    },

    deleteSprint: async (sprintId: string): Promise<{ message: string; tasksMoved: number }> => {
        const res = await apiJava.delete<ApiResponse<{ message: string; tasksMoved: number }>>(
            `/v1/sprints/${sprintId}`
        );
        return res.data.data;
    },

    startSprint: async (sprintId: string): Promise<{ id: string; name: string; status: SprintStatus; message: string }> => {
        const res = await apiJava.patch<ApiResponse<{ id: string; name: string; status: SprintStatus; message: string }>>(
            `/v1/sprints/${sprintId}/start`
        );
        return res.data.data;
    },

    completeSprint: async (sprintId: string, data: CompleteSprintRequest): Promise<CompleteSprintResponse> => {
        const res = await apiJava.patch<ApiResponse<CompleteSprintResponse>>(
            `/v1/sprints/${sprintId}/complete`, data
        );
        return res.data.data;
    },

    // ── BACKLOG ───────────────────────────────────────────────

    getBacklog: async (projectId: string, params?: TaskFilterParams): Promise<PageResponse<TaskResponse>> => {
        const res = await apiJava.get<ApiResponse<PageResponse<TaskResponse>>>(
            `/v1/projects/${projectId}/backlog`, { params }
        );
        return res.data.data;
    },

    assignTaskToSprint: async (taskId: string, sprintId: string | null): Promise<TaskResponse> => {
        const res = await apiJava.patch<ApiResponse<TaskResponse>>(
            `/v1/tasks/${taskId}/sprint`, { sprintId }
        );
        return res.data.data;
    },

    batchAssignToSprint: async (projectId: string, taskIds: string[], sprintId: string | null): Promise<{ updatedCount: number; message: string }> => {
        const res = await apiJava.patch<ApiResponse<{ updatedCount: number; message: string }>>(
            `/v1/projects/${projectId}/tasks/batch-sprint`,
            { taskIds, sprintId }
        );
        return res.data.data;
    },

    // ── REPORTS ───────────────────────────────────────────────

    // FR-27: Project overview stats
    getProjectOverview: async (projectId: string, sprintId?: string): Promise<ProjectOverview> => {
        const res = await apiJava.get<ApiResponse<ProjectOverview>>(
            `${BASE}/${projectId}/reports/overview`,
            { params: { sprintId } }
        );
        return res.data.data;
    },

    getBurndown: async (sprintId: string): Promise<BurndownData> => {
        const res = await apiJava.get<ApiResponse<BurndownData>>(
            `/v1/sprints/${sprintId}/burndown`
        );
        return res.data.data;
    },

    getVelocity: async (projectId: string, limit = 5): Promise<VelocityData> => {
        const res = await apiJava.get<ApiResponse<VelocityData>>(
            `${BASE}/${projectId}/reports/velocity`,
            { params: { limit } }
        );
        return res.data.data;
    },

    // FR-28: Member performance
    getMemberPerformance: async (projectId: string, params?: {
        sprintId?: string; dateFrom?: string; dateTo?: string
    }): Promise<MemberReportData> => {
        const res = await apiJava.get<ApiResponse<MemberReportData>>(
            `${BASE}/${projectId}/reports/members`, { params }
        );
        return res.data.data;
    },

    // FR-48: Export
    createExportJob: async (
        projectId: string,
        format: "EXCEL" | "PDF",
        scope: "ALL" | "FILTERED" | "SPRINT",
        sprintId?: string
    ): Promise<{ status: number; data: Blob }> => {
        const res = await apiJava.post(
            `${BASE}/${projectId}/export`,
            null,
            { params: { format, scope, sprintId }, responseType: "blob" }
        );
        return { status: res.status, data: res.data };
    },

    // ── VERSION ───────────────────────────────────────────────

    getVersions: async (projectId: string): Promise<ProjectVersion[]> => {
        const res = await apiJava.get<ApiResponse<ProjectVersion[]>>(
            `/v1/projects/${projectId}/versions`
        );
        return res.data.data;
    },

    createVersion: async (projectId: string, data: CreateVersionRequest): Promise<ProjectVersion> => {
        const res = await apiJava.post<ApiResponse<ProjectVersion>>(
            `/v1/projects/${projectId}/versions`, data
        );
        return res.data.data;
    },

    updateVersion: async (versionId: string, data: Partial<CreateVersionRequest> & { status?: VersionStatus }): Promise<ProjectVersion> => {
        const res = await apiJava.put<ApiResponse<ProjectVersion>>(
            `/v1/versions/${versionId}`, data
        );
        return res.data.data;
    },

    deleteVersion: async (versionId: string): Promise<void> => {
        await apiJava.delete(`/v1/versions/${versionId}`);
    },

    assignTaskToVersion: async (taskId: string, versionId: string | null): Promise<TaskResponse> => {
        const res = await apiJava.patch<ApiResponse<TaskResponse>>(
            `/v1/tasks/${taskId}/version`, { versionId }
        );
        return res.data.data;
    },

    // ── CUSTOM FIELDS ─────────────────────────────────────────

    getCustomFields: async (projectId: string): Promise<CustomFieldDefinition[]> => {
        const res = await apiJava.get<ApiResponse<CustomFieldDefinition[]>>(
            `/v1/projects/${projectId}/custom-fields`
        );
        return res.data.data;
    },

    createCustomField: async (projectId: string, data: CreateCustomFieldRequest): Promise<CustomFieldDefinition> => {
        const res = await apiJava.post<ApiResponse<CustomFieldDefinition>>(
            `/v1/projects/${projectId}/custom-fields`, data
        );
        return res.data.data;
    },

    updateCustomField: async (projectId: string, fieldId: string, data: UpdateCustomFieldRequest): Promise<CustomFieldDefinition> => {
        const res = await apiJava.put<ApiResponse<CustomFieldDefinition>>(
            `/v1/projects/${projectId}/custom-fields/${fieldId}`, data
        );
        return res.data.data;
    },

    deleteCustomField: async (projectId: string, fieldId: string): Promise<{ message: string; action: "HIDDEN" | "DELETED" }> => {
        const res = await apiJava.delete<ApiResponse<{ message: string; action: "HIDDEN" | "DELETED" }>>(
            `/v1/projects/${projectId}/custom-fields/${fieldId}`
        );
        return res.data.data;
    },

    // GET /tasks/{taskId}/custom-fields/values (spec 10)
    getCustomFieldValues: async (taskId: string): Promise<CustomFieldValue[]> => {
        const res = await apiJava.get<ApiResponse<CustomFieldValue[]>>(
            `/v1/tasks/${taskId}/custom-fields/values`
        );
        return res.data.data;
    },

    // POST /tasks/{taskId}/custom-fields/values (spec 10 — POST not PUT, /custom-fields/values not /custom-field-values)
    saveCustomFieldValues: async (taskId: string, data: SaveCustomFieldValuesRequest): Promise<CustomFieldValue[]> => {
        const res = await apiJava.post<ApiResponse<CustomFieldValue[]>>(
            `/v1/tasks/${taskId}/custom-fields/values`, data
        );
        return res.data.data;
    },

    // ── RECURRING TASK ────────────────────────────────────────

    getRecurrence: async (taskId: string): Promise<TaskRecurrence | null> => {
        const res = await apiJava.get<ApiResponse<TaskRecurrence | null>>(
            `/v1/tasks/${taskId}/recurrence`
        );
        return res.data.data;
    },

    setRecurrence: async (taskId: string, data: SetRecurrenceRequest): Promise<TaskRecurrence> => {
        const res = await apiJava.post<ApiResponse<TaskRecurrence>>(
            `/v1/tasks/${taskId}/recurrence`, data
        );
        return res.data.data;
    },

    updateRecurrence: async (taskId: string, data: Partial<SetRecurrenceRequest>): Promise<TaskRecurrence> => {
        const res = await apiJava.put<ApiResponse<TaskRecurrence>>(
            `/v1/tasks/${taskId}/recurrence`, data
        );
        return res.data.data;
    },

    deleteRecurrence: async (taskId: string): Promise<{ message: string; cancelledInstances: number }> => {
        const res = await apiJava.delete<ApiResponse<{ message: string; cancelledInstances: number }>>(
            `/v1/tasks/${taskId}/recurrence`
        );
        return res.data.data;
    },

    getRecurringInstances: async (taskId: string): Promise<TaskResponse[]> => {
        const res = await apiJava.get<ApiResponse<TaskResponse[]>>(
            `/v1/tasks/${taskId}/instances`
        );
        return res.data.data;
    },

    // ── WEBHOOK ───────────────────────────────────────────────

    getWebhooks: async (projectId: string): Promise<WebhookItem[]> => {
        const res = await apiJava.get<ApiResponse<WebhookItem[]>>(
            `/v1/projects/${projectId}/webhooks`
        );
        return res.data.data;
    },

    createWebhook: async (projectId: string, data: CreateWebhookRequest): Promise<WebhookItem> => {
        const res = await apiJava.post<ApiResponse<WebhookItem>>(
            `/v1/projects/${projectId}/webhooks`, data
        );
        return res.data.data;
    },

    updateWebhook: async (webhookId: string, data: Partial<CreateWebhookRequest> & { isActive?: boolean }): Promise<WebhookItem> => {
        const res = await apiJava.put<ApiResponse<WebhookItem>>(
            `/v1/webhooks/${webhookId}`, data
        );
        return res.data.data;
    },

    deleteWebhook: async (webhookId: string): Promise<void> => {
        await apiJava.delete(`/v1/webhooks/${webhookId}`);
    },

    testWebhook: async (projectId: string, webhookId: string): Promise<WebhookTestResult> => {
        const res = await apiJava.post<ApiResponse<WebhookTestResult>>(
            `/v1/projects/${projectId}/webhooks/${webhookId}/test`
        );
        return res.data.data;
    },

    // ── NOTIFICATION PREFERENCES ──────────────────────────────

    getNotifPreferences: async (): Promise<NotificationPreferences> => {
        const res = await apiJava.get<ApiResponse<NotificationPreferences>>(
            `/v1/users/me/notification-preferences`
        );
        return res.data.data;
    },

    updateNotifPreferences: async (data: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
        const res = await apiJava.put<ApiResponse<NotificationPreferences>>(
            `/v1/users/me/notification-preferences`, data
        );
        return res.data.data;
    },
};
