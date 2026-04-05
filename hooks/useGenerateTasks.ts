import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmTasks, generateTasks } from '@/app/services/ai.service';
import type {
  ConfirmTasksRequest,
  ConfirmTasksResponse,
  GenerateTasksRequest,
  GeneratedTaskDto,
} from '@/app/types/ai';

export function useGenerateTasks(projectId: string) {
  return useMutation<GeneratedTaskDto[], Error, GenerateTasksRequest>({
    mutationFn: (payload) => generateTasks(projectId, payload),
  });
}

export function useConfirmTasks(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation<ConfirmTasksResponse, Error, ConfirmTasksRequest>({
    mutationFn: (payload) => confirmTasks(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}
