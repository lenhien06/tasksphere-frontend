import { useQuery } from '@tanstack/react-query';
import { apiJava } from '@/lib/axios';
import type { VelocityData } from '@/app/types/overview.types';

const toNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function normalizeTrend(t: string): VelocityData['trend'] {
  if (t === 'UP' || t === 'increasing') return 'increasing';
  if (t === 'DOWN' || t === 'decreasing') return 'decreasing';
  return 'stable';
}

export function useVelocityData(projectId: string, limit = 5) {
  return useQuery({
    queryKey: ['velocity', projectId, limit],
    queryFn: async () => {
      const { data } = await apiJava.get(`/v1/projects/${projectId}/reports/velocity`, {
        params: { limit },
      });
      const raw = data?.data?.data ?? data?.data ?? data ?? {};
      return {
        averageVelocity: toNumber(
          raw?.averageVelocity ?? raw?.avgVelocity ?? raw?.average_velocity,
          0
        ),
        trend: normalizeTrend(String(raw?.trend ?? 'stable')),
        sprints: (raw?.sprints ?? raw?.data ?? []).map((s: any) => ({
          sprintId: String(s.sprintId ?? s.id ?? s.sprint_id ?? ''),
          sprintName: String(s.sprintName ?? s.name ?? s.sprint_name ?? 'Sprint'),
          velocity: toNumber(
            s.velocity ?? s.storyPointsCompleted ?? s.completedStoryPoints ??
            s.completed_story_points ?? s.points ?? s.score,
            0
          ),
          completedTasks: toNumber(s.doneTasks ?? s.completedTasks ?? s.done_tasks ?? s.completed_tasks, 0),
        })),
      } as VelocityData;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!projectId,
  });
}
