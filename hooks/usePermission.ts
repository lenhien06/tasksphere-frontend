import { useQuery } from "@tanstack/react-query";
import { ProjectService } from "@/app/services/ProjectService";
import { normalizeProjectMyRole } from "@/lib/projectRole";

/**
 * Quyền trong project — đọc từ GET project (`myRole`, `isOwner`), không suy từ `members[]`.
 */
export function usePermission(projectId: string) {
    const { data: projectRes, isLoading } = useQuery({
        queryKey: ["project-detail", projectId],
        queryFn: () => ProjectService.getById(projectId),
        enabled: !!projectId,
    });

    const p = projectRes?.data;
    const isOwner = p?.isOwner === true;
    const normalized = normalizeProjectMyRole(p?.myRole);
    /** Owner luôn có quyền PM dù BE chưa gửi myRole */
    const roleKey = normalized || (isOwner ? "project_manager" : ("" as const));
    const isPM = roleKey === "project_manager" || roleKey === "system_admin";

    return {
        role: roleKey || undefined,
        isPM,
        isMember: roleKey === "member",
        isViewer: roleKey === "viewer" && !isPM,
        isOwner,
        isLoading,
    };
}
