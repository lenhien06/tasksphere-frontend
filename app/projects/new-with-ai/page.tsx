"use client";

import WorkspaceAiProjectCreationFlow from "@/components/ai/WorkspaceAiProjectCreationFlow";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function PersonalAiProjectCreationPage() {
  const { personalWorkspace } = useWorkspace();

  return (
    <WorkspaceAiProjectCreationFlow
      workspaceId={personalWorkspace?.id}
      workspaceName={personalWorkspace?.name ?? "Personal workspace"}
      backHref="/projects"
      backLabel="Back to personal projects"
    />
  );
}
