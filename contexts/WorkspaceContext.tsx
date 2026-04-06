"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { WorkspaceService } from "@/app/services/workspace.service";
import { Workspace } from "@/app/types/workspace.schema";

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

interface WorkspaceContextValue {
  currentWorkspace: Workspace | null;
  currentSlug: string | null;
  workspaces: Workspace[];
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  currentWorkspace: null,
  currentSlug: null,
  workspaces: [],
  isLoading: false,
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Detect workspace slug from URL: /ws/[slug]/...
  const slugMatch = pathname?.match(/^\/ws\/([^/]+)/);
  const currentSlug = slugMatch ? slugMatch[1] : null;

  // Fetch current workspace by slug when inside /ws/[slug]
  const { data: wsData, isLoading: wsLoading } = useQuery({
    queryKey: ["workspace", currentSlug],
    queryFn: () => WorkspaceService.getBySlug(currentSlug!),
    enabled: !!currentSlug,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch sidebar workspace list (reuse existing query)
  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["sidebar-workspaces"],
    queryFn: () => WorkspaceService.getMyWorkspaces(),
    staleTime: 2 * 60 * 1000,
  });

  const currentWorkspace = currentSlug
    ? ((wsData?.data as Workspace) ?? null)
    : null;

  const workspaces: Workspace[] = (listData?.data as Workspace[]) ?? [];

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        currentSlug,
        workspaces,
        isLoading: wsLoading || listLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
