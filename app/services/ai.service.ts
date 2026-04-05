import { apiJava } from '@/lib/axios';
import type {
  ApiResponse,
  AssignmentConfirmResult,
  ConfirmAssignmentsRequest,
  ConfirmTasksRequest,
  ConfirmTasksResponse,
  GenerateTasksRequest,
  GeneratedTaskDto,
  SuggestAssignmentsResponse,
} from '@/app/types/ai';

// ── Feature 1: AI Task Generation ────────────────────────────────────────────

export async function generateTasks(
  projectId: string,
  payload: GenerateTasksRequest,
): Promise<GeneratedTaskDto[]> {
  const { data } = await apiJava.post<ApiResponse<GeneratedTaskDto[]>>(
    `/v1/projects/${projectId}/ai/generate-tasks`,
    payload,
  );
  return data.data;
}

export async function confirmTasks(
  projectId: string,
  payload: ConfirmTasksRequest,
): Promise<ConfirmTasksResponse> {
  const { data } = await apiJava.post<ApiResponse<ConfirmTasksResponse>>(
    `/v1/projects/${projectId}/ai/confirm-tasks`,
    payload,
  );
  return data.data;
}

// ── Feature 2: AI Assignment Suggestions ─────────────────────────────────────

export async function suggestAssignments(
  projectId: string,
): Promise<SuggestAssignmentsResponse> {
  const { data } = await apiJava.post<ApiResponse<SuggestAssignmentsResponse>>(
    `/v1/projects/${projectId}/ai/suggest-assignments`,
  );
  return data.data;
}

export async function confirmAssignments(
  projectId: string,
  payload: ConfirmAssignmentsRequest,
): Promise<AssignmentConfirmResult> {
  const { data } = await apiJava.post<ApiResponse<AssignmentConfirmResult>>(
    `/v1/projects/${projectId}/ai/confirm-assignments`,
    payload,
  );
  return data.data;
}

// ── User Skill Tags ───────────────────────────────────────────────────────────

export async function updateSkillTags(tags: string[]): Promise<string[]> {
  const { data } = await apiJava.patch<ApiResponse<{ skillTags: string[] }>>(
    '/v1/users/me/skill-tags',
    { skillTags: tags },
  );
  return data.data.skillTags;
}
