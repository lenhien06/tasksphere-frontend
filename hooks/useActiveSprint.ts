import { useQuery } from '@tanstack/react-query';
import { apiJava } from '@/lib/axios';
import type { ActiveSprintDetail } from '@/app/types/overview.types';

export function useActiveSprint(projectId: string) {
  return useQuery({
    queryKey: ['active-sprint', projectId],
    queryFn: async () => {
      const { data } = await apiJava.get(`/v1/projects/${projectId}/sprints`, {
        params: { status: 'active' },
      });
      const list: any[] = data.data?.content ?? data.data ?? [];
      const activeStatuses = new Set(['ACTIVE', 'active', 'IN_PROGRESS', 'in_progress', 'STARTED', 'started', 'RUNNING', 'running']);
      const active = list.find((s) => activeStatuses.has(String(s.status)));
      if (!active) return null;
      const totalTasks = Number(active.totalTasks ?? active.total_tasks ?? active.taskCount ?? active.task_count ?? 0);
      const doneTasks = Number(active.doneTasks ?? active.done_tasks ?? active.doneCount ?? active.done_count ?? 0);
      const inProgressTasks = Number(
        active.inProgressTasks
        ?? active.in_progress_tasks
        ?? Math.max(totalTasks - doneTasks, 0)
      );
      const totalStoryPoints = Number(active.totalStoryPoints ?? active.total_story_points ?? 0);
      const completedStoryPoints = Number(
        active.completedStoryPoints
        ?? active.completed_story_points
        ?? active.doneStoryPoints
        ?? active.done_story_points
        ?? 0
      );

      return {
        ...active,
        id: String(active.id ?? active.sprintId ?? active.sprint_id ?? ''),
        name: active.name ?? active.sprintName ?? active.sprint_name ?? 'Sprint',
        status: 'active',
        startDate: active.startDate ?? active.start_date ?? '',
        endDate: active.endDate ?? active.end_date ?? '',
        goal: active.goal ?? null,
        totalTasks,
        doneTasks,
        inProgressTasks,
        totalStoryPoints,
        completedStoryPoints,
      } as ActiveSprintDetail;
    },
    staleTime: 60 * 1000,
    enabled: !!projectId,
  });
}
