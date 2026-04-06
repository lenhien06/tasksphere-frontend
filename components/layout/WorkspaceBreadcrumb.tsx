"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Building2 } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface WorkspaceBreadcrumbProps {
  currentProject?: { id: string; name: string; key: string } | undefined;
}

export default function WorkspaceBreadcrumb({ currentProject }: WorkspaceBreadcrumbProps) {
  const pathname = usePathname();
  const { currentWorkspace, currentSlug } = useWorkspace();

  // Only show breadcrumb when inside a workspace
  if (!currentWorkspace || !currentSlug) return null;

  // Parse path segments after /ws/[slug]
  const afterSlug = pathname?.replace(`/ws/${currentSlug}`, "") ?? "";
  const isProjectPath = !!currentProject;

  // Determine if we're on a specific task
  const taskMatch = pathname?.match(/\/tasks\/([^/]+)/);
  const taskId = taskMatch ? taskMatch[1] : null;

  return (
    <nav className="flex items-center gap-1.5 border-b border-slate-100 bg-white px-6 py-2 text-xs text-slate-500">
      <Building2 size={12} className="shrink-0 text-slate-400" />

      {/* Workspaces root */}
      <Link href="/workspaces" className="hover:text-blue-600">
        Workspaces
      </Link>

      <ChevronRight size={11} className="shrink-0 text-slate-300" />

      {/* Current workspace */}
      <Link
        href={`/ws/${currentSlug}`}
        className="font-semibold text-slate-700 hover:text-blue-600 truncate max-w-[160px]"
      >
        {currentWorkspace.name}
      </Link>

      {/* Project segment */}
      {isProjectPath && (
        <>
          <ChevronRight size={11} className="shrink-0 text-slate-300" />
          <Link
            href={`/projects/${currentProject.id}/board`}
            className="hover:text-blue-600 truncate max-w-[160px]"
          >
            <span className="mr-1 rounded border border-blue-100 bg-blue-50 px-1 py-0.5 text-[10px] font-bold text-blue-600">
              {currentProject.key}
            </span>
            {currentProject.name}
          </Link>
        </>
      )}

      {/* Task segment (shown when on task detail page) */}
      {taskId && (
        <>
          <ChevronRight size={11} className="shrink-0 text-slate-300" />
          <span className="text-slate-500">Task</span>
        </>
      )}
    </nav>
  );
}
