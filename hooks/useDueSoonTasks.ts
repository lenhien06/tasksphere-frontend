import { useQuery } from '@tanstack/react-query';
import { apiJava } from '@/lib/axios';
import type { DueSoonTask } from '@/app/types/overview.types';

export function useDueSoonTasks(projectId: string) {
  return useQuery({
    queryKey: ['due-soon', projectId],
    queryFn: async () => {
      const { data } = await apiJava.get(`/v1/projects/${projectId}/tasks`, {
        params: { dueSoon: true, limit: 5, sortBy: 'dueDate', order: 'asc', size: 5 },
      });
      const tasks: any[] = data.data?.content ?? data.data ?? [];
      return tasks.map((t) => ({
        id: t.id,
        taskId: t.taskCode ?? t.id,
        title: t.title,
        type: String(t.type ?? 'task').toLowerCase() as DueSoonTask['type'],
        priority: (t.priority as string).toLowerCase() as DueSoonTask['priority'],
        status: t.taskStatus ?? t.status ?? '',
        dueDate: t.dueDate ?? null,
        storyPoints: typeof t.storyPoints === 'number' ? t.storyPoints : null,
        isOverdue: Boolean(t.overdue ?? t.isOverdue),
        assignee: t.assignee
          ? {
              id: t.assignee.id,
              fullName: t.assignee.fullName,
              avatarUrl: t.assignee.avatarUrl ?? null,
            }
          : null,
      })) as DueSoonTask[];
    },
    staleTime: 60 * 1000,
    enabled: !!projectId,
  });
}
