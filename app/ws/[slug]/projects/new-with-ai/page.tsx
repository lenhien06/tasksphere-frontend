"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import WorkspaceAiProjectCreationFlow from "@/components/ai/WorkspaceAiProjectCreationFlow";
import { WorkspaceService } from "@/app/services/workspace.service";
import { Workspace } from "@/app/types/workspace.schema";

export default function AiProjectCreationPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: wsData } = useQuery({
    queryKey: ["workspace", slug],
    queryFn: () => WorkspaceService.getBySlug(slug),
    staleTime: 5 * 60 * 1000,
  });

  const workspace = wsData?.data as Workspace | undefined;

  return (
    <WorkspaceAiProjectCreationFlow
      workspaceId={workspace?.id}
      workspaceName={workspace?.name}
      backHref={`/ws/${slug}`}
      backLabel="Back to workspace"
    />
  );
}
