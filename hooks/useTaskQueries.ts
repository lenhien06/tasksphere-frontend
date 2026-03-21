import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TaskService } from "@/app/services/TaskService";
import { handleKanbanError } from "@/lib/errorHandler";
import {
    TaskResponse,
    TaskFilterParams,
    CreateTaskRequest,
    UpdateTaskStatusRequest,
} from "@/app/types/task.schema";

export const useTaskList = (projectId: string, params?: TaskFilterParams) => {
    return useQuery({
        queryKey: ["tasks", projectId, params],
        queryFn: async () => {
            const hasExplicitPagination = typeof params?.page === "number" || typeof params?.size === "number";
            if (hasExplicitPagination) {
                return TaskService.getTasks(projectId, params);
            }

            // Default behavior for board/task lists: fetch all pages to avoid missing tasks.
            const pageSize = 50;
            const first = await TaskService.getTasks(projectId, { ...params, page: 0, size: pageSize });
            if (first.totalPages <= 1) return first;

            const rest = await Promise.all(
                Array.from({ length: first.totalPages - 1 }, (_, i) =>
                    TaskService.getTasks(projectId, { ...params, page: i + 1, size: pageSize })
                )
            );

            const mergedContent = [first, ...rest].flatMap((page) => page.content);
            return {
                ...first,
                content: mergedContent,
                totalElements: mergedContent.length,
                totalPages: 1,
                size: mergedContent.length,
                number: 0,
                first: true,
                last: true,
                empty: mergedContent.length === 0,
            };
        },
        staleTime: 30_000,
        enabled: !!projectId,
        select: (data) => {
            const grouped: Record<string, TaskResponse[]> = {};
            data.content.forEach(task => {
                const colId = task.columnId;
                if (!grouped[colId]) grouped[colId] = [];
                grouped[colId].push(task);
            });
            Object.values(grouped).forEach(tasks =>
                tasks.sort((a, b) => a.taskPosition - b.taskPosition)
            );
            return { ...data, grouped };
        },
    });
};

export const useTaskDetail = (projectId: string, taskId: string | null) => {
    return useQuery({
        queryKey: ["task", projectId, taskId],
        queryFn: async () => {
            if (!taskId) return null;
            return TaskService.getTaskById(projectId, taskId);
        },
        enabled: !!taskId,
        staleTime: 10_000,
    });
};

export const useCreateTask = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateTaskRequest) => TaskService.createTask(projectId, data),
        onSuccess: (newTask) => {
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
            toast.success(`Task ${newTask.taskCode} created`);
        },
        onError: (error: any) => {
            handleKanbanError(error);
        },
    });
};

export const useUpdateTaskStatus = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            taskId,
            data,
            etag,
        }: {
            taskId: string;
            data: UpdateTaskStatusRequest;
            etag?: string;
        }) => TaskService.updateStatus(projectId, taskId, data, etag),

        onMutate: async ({ taskId, data }) => {
            await queryClient.cancelQueries({ queryKey: ["tasks", projectId] });
            const previous = queryClient.getQueryData(["tasks", projectId]);
            queryClient.setQueryData(["tasks", projectId], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    content: old.content.map((t: TaskResponse) =>
                        t.id === taskId ? { ...t, taskStatus: data.status } : t
                    ),
                };
            });
            return { previous };
        },

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
        },

        onError: (error: any, _vars, context) => {
            queryClient.setQueryData(["tasks", projectId], context?.previous);
            const status = error?.response?.status;
            if (status === 409) {
                queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
                toast.warning("Data has changed, reloading...");
            } else {
                handleKanbanError(error);
            }
        },
    });
};

export const useDeleteTask = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (taskId: string) => TaskService.deleteTask(projectId, taskId),
        onSuccess: (_, taskId) => {
            queryClient.setQueryData(["tasks", projectId], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    content: old.content.filter((t: TaskResponse) => t.id !== taskId),
                };
            });
            toast.success("Task deleted successfully");
        },
        onError: (error: any) => {
            handleKanbanError(error);
        },
    });
};
