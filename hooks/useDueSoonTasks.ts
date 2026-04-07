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
        sprintId: t.sprintId ?? null,
        sprintName: t.sprintName ?? null,
        subtaskCount: typeof t.subtaskCount === 'number' ? t.subtaskCount : 0,
        subtaskDone: typeof t.subtaskDone === 'number' ? t.subtaskDone : 0,
        commentsCount: typeof t.commentsCount === 'number' ? t.commentsCount : 0,
      })) as DueSoonTask[];
    },
    staleTime: 60 * 1000,
    enabled: !!projectId,
  });
}
