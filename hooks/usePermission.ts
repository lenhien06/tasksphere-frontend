import { useQuery } from "@tanstack/react-query";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { useCurrentUser } from "./useCurrentUser";

export function usePermission(projectId: string) {
    const { data: currentUser } = useCurrentUser();
    
    const { data: members = [], isLoading } = useQuery({
        queryKey: ["project-members", projectId],
        queryFn: () => ProjectMemberService.getMembers(projectId),
        enabled: !!projectId,
    });

    const currentMember = members.find(m => String(m.user.id) === String(currentUser?.id));
    const role = currentMember?.projectRole?.toLowerCase();

    return {
        role,
        isPM: role === "project_manager" || role === "pm",
        isMember: role === "member",
        isViewer: role === "viewer",
        isLoading,
    };
}
