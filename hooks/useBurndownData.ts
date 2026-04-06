import { useQuery } from '@tanstack/react-query';
import { apiJava } from '@/lib/axios';
import type { BurndownData } from '@/app/types/overview.types';

const toNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function normalizeBurndown(raw: any): BurndownData {
  // Handle extra .data wrapper: { data: { sprintId, data: [...] } }
  const source = (raw?.data != null && typeof raw.data === 'object' && !Array.isArray(raw.data) ? raw.data : raw) ?? {};

  // New shape variant: { data: [...] } but point keys may differ.
  if (Array.isArray(source.data)) {
    return {
      sprintId: String(source.sprintId ?? ''),
      sprintName: String(source.sprintName ?? ''),
      totalPoints: toNumber(source.totalPoints ?? source.totalStoryPoints, 0),
      data: source.data.map((p: any, idx: number) => ({
        day: toNumber(p?.day ?? idx, idx),
        date: String(p?.date ?? ''),
        ideal: toNumber(p?.ideal ?? p?.idealPoints ?? p?.remainingPoints, 0),
        actual:
          p?.actual == null && p?.remainingPoints == null
            ? null
            : toNumber(p?.actual ?? p?.remainingPoints, 0),
      })),
    };
  }

  // Legacy shape: { idealLine, actualLine }
  const idealArr: any[] = Array.isArray(source.idealLine) ? source.idealLine : [];
  const actualArr: any[] = Array.isArray(source.actualLine) ? source.actualLine : [];
  const actualByDate = new Map<string, number | null>();
  for (const point of actualArr) {
    actualByDate.set(String(point?.date ?? ''), point?.remainingPoints == null ? null : toNumber(point.remainingPoints, 0));
  }

  const hasActualLine = actualArr.length > 0;
  return {
    sprintId: String(source.sprintId ?? ''),
    sprintName: String(source.sprintName ?? ''),
    totalPoints: toNumber(source.totalStoryPoints ?? source.totalPoints, 0),
    data: idealArr.map((point: any, idx: number) => {
      const date = String(point?.date ?? '');
      const fallbackActual = point?.remainingPoints;
      const mappedActual = hasActualLine
        ? (actualByDate.get(date) ?? (actualArr[idx]?.remainingPoints == null ? null : toNumber(actualArr[idx].remainingPoints, 0)))
        : (fallbackActual == null ? null : toNumber(fallbackActual, 0));

      return {
        day: idx,
        date,
        ideal: toNumber(point?.idealPoints ?? point?.ideal ?? point?.remainingPoints, 0),
        actual: mappedActual,
      };
    }),
  };
}

export function useBurndownData(sprintId: string | null | undefined) {
  return useQuery({
    queryKey: ['burndown', sprintId],
    queryFn: async () => {
      const { data } = await apiJava.get(`/v1/sprints/${sprintId}/burndown`);
      return normalizeBurndown(data?.data);
    },
    enabled: !!sprintId,
    staleTime: 2 * 60 * 1000,
  });
}
