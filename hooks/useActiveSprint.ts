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
      return {
        ...active,
        id: String(active.id ?? active.sprintId ?? active.sprint_id ?? ''),
        name: active.name ?? active.sprintName ?? active.sprint_name ?? 'Sprint',
        status: 'active',
        startDate: active.startDate ?? active.start_date ?? '',
        endDate: active.endDate ?? active.end_date ?? '',
        goal: active.goal ?? null,
        totalTasks: Number(active.totalTasks ?? active.total_tasks ?? 0),
        doneTasks: Number(active.doneTasks ?? active.done_tasks ?? 0),
        inProgressTasks: Number(active.inProgressTasks ?? active.in_progress_tasks ?? 0),
        totalStoryPoints: Number(active.totalStoryPoints ?? active.total_story_points ?? 0),
        completedStoryPoints: Number(active.completedStoryPoints ?? active.completed_story_points ?? 0),
      } as ActiveSprintDetail;
    },
    staleTime: 60 * 1000,
    enabled: !!projectId,
  });
}
