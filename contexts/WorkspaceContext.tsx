"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { WorkspaceService } from "@/app/services/workspace.service";
import { Workspace } from "@/app/types/workspace.schema";

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "tasksphere:selected-context";

type StoredSelection =
  | { kind: "personal" }
  | { kind: "workspace"; workspaceId: string };

type SelectedContext =
  | { kind: "personal"; workspace: Workspace | null }
  | { kind: "workspace"; workspace: Workspace };

interface WorkspaceContextValue {
  currentWorkspace: Workspace | null;
  currentSlug: string | null;
  selectedWorkspace: Workspace | null;
  selectedContext: SelectedContext;
  workspaces: Workspace[];
  organizationWorkspaces: Workspace[];
  personalWorkspace: Workspace | null;
  isLoading: boolean;
  selectPersonal: () => void;
  selectWorkspace: (workspace: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  currentWorkspace: null,
  currentSlug: null,
  selectedWorkspace: null,
  selectedContext: { kind: "personal", workspace: null },
  workspaces: [],
  organizationWorkspaces: [],
  personalWorkspace: null,
  isLoading: false,
  selectPersonal: () => {},
  selectWorkspace: () => {},
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [selection, setSelection] = useState<StoredSelection>({ kind: "personal" });
  const [isHydrated, setIsHydrated] = useState(false);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredSelection;
        if (parsed?.kind === "workspace" && parsed.workspaceId) {
          setSelection(parsed);
        } else {
          setSelection({ kind: "personal" });
        }
      }
    } catch {
      setSelection({ kind: "personal" });
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const persistSelection = (nextSelection: StoredSelection) => {
    setSelection(nextSelection);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSelection));
    }
  };

  const workspaces: Workspace[] = (listData?.data as Workspace[]) ?? [];
  const personalWorkspace =
    workspaces.find((workspace) => workspace.type === "PERSONAL") ?? null;
  const organizationWorkspaces = workspaces.filter(
    (workspace) => workspace.type !== "PERSONAL"
  );

  const routeWorkspace = currentSlug
    ? (((wsData?.data as Workspace) ??
        organizationWorkspaces.find((workspace) => workspace.slug === currentSlug)) as Workspace | null)
    : null;

  useEffect(() => {
    if (!isHydrated) return;
    if (routeWorkspace?.id) {
      persistSelection({ kind: "workspace", workspaceId: routeWorkspace.id });
    }
  }, [isHydrated, routeWorkspace?.id]);

  useEffect(() => {
    if (!isHydrated || currentSlug) return;

    if (
      selection.kind === "workspace" &&
      !organizationWorkspaces.some((workspace) => workspace.id === selection.workspaceId)
    ) {
      persistSelection({ kind: "personal" });
    }
  }, [currentSlug, isHydrated, organizationWorkspaces, selection]);

  const selectedWorkspace = useMemo(() => {
    if (routeWorkspace) return routeWorkspace;
    if (selection.kind !== "workspace") return null;
    return (
      organizationWorkspaces.find((workspace) => workspace.id === selection.workspaceId) ??
      null
    );
  }, [organizationWorkspaces, routeWorkspace, selection]);

  const selectedContext: SelectedContext = selectedWorkspace
    ? { kind: "workspace", workspace: selectedWorkspace }
    : { kind: "personal", workspace: personalWorkspace };

  const selectPersonal = () => {
    persistSelection({ kind: "personal" });
  };

  const selectWorkspace = (workspace: Workspace) => {
    persistSelection({ kind: "workspace", workspaceId: workspace.id });
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace: routeWorkspace,
        currentSlug,
        selectedWorkspace,
        selectedContext,
        workspaces,
        organizationWorkspaces,
        personalWorkspace,
        isLoading: wsLoading || listLoading,
        selectPersonal,
        selectWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
