"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  FolderKanban,
  Crown,
  Shield,
  User,
  Loader2,
  Building2,
} from "lucide-react";
import { WorkspaceService } from "@/app/services/workspace.service";
import { Workspace, WorkspaceRole } from "@/app/types/workspace.schema";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_ICON: Record<WorkspaceRole, React.ElementType> = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
};

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

const ROLE_COLOR: Record<WorkspaceRole, string> = {
  OWNER: "text-amber-600 bg-amber-50 border-amber-200",
  ADMIN: "text-blue-600 bg-blue-50 border-blue-200",
  MEMBER: "text-slate-600 bg-slate-50 border-slate-200",
};

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceCard
// ─────────────────────────────────────────────────────────────────────────────

function WorkspaceCard({
  workspace,
  onClick,
}: {
  workspace: Workspace;
  onClick: () => void;
}) {
  const role = workspace.role ?? "MEMBER";
  const RoleIcon = ROLE_ICON[role];
  const initials = (workspace.name && typeof workspace.name === 'string' ? workspace.name.slice(0, 2) : "WS").toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {workspace.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={workspace.avatarUrl}
            alt={workspace.name}
            className="h-11 w-11 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-black text-white shadow-sm">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-slate-800 group-hover:text-blue-700">
            {workspace.name}
          </div>
          <div className="truncate text-xs text-slate-400">/{workspace.slug}</div>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
            ROLE_COLOR[role]
          )}
        >
          <RoleIcon size={10} />
          {ROLE_LABEL[role]}
        </span>
      </div>

      {/* Description */}
      {workspace.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
          {workspace.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Users size={12} />
          {workspace.memberCount} thành viên
        </span>
        <span className="flex items-center gap-1">
          <FolderKanban size={12} />
          {workspace.projectCount} dự án
        </span>
        <span className="ml-auto rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {workspace.plan}
        </span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function WorkspaceListPage() {
  const router = useRouter();
  const { selectPersonal, selectWorkspace } = useWorkspace();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-workspaces"],
    queryFn: () => WorkspaceService.getMyWorkspaces(),
    staleTime: 2 * 60 * 1000,
  });

  const workspaces: Workspace[] = (data?.data as Workspace[]) ?? [];
  const personalWorkspace =
    workspaces.find((workspace) => workspace.type === "PERSONAL") ?? null;
  const organizationWorkspaces = workspaces.filter(
    (workspace) => workspace.type !== "PERSONAL"
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <Building2 size={24} className="text-blue-600" />
            Workspaces
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý nhóm làm việc và các dự án con của bạn
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/workspaces/new")}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Tạo Workspace
        </button>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          Không thể tải danh sách workspace. Vui lòng thử lại.
        </div>
      )}

      {!isLoading && !isError && workspaces.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <Building2 size={48} className="mb-4 text-slate-300" />
          <h3 className="text-base font-semibold text-slate-700">
            Bạn chưa có workspace nào
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Tạo workspace để cộng tác với team và quản lý nhiều dự án cùng lúc
          </p>
          <button
            type="button"
            onClick={() => router.push("/workspaces/new")}
            className="mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Tạo Workspace đầu tiên
          </button>
        </div>
      )}

      {!isLoading && !isError && personalWorkspace && (
        <div className="mb-8">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Personal Workspace
          </div>
          <WorkspaceCard
            workspace={personalWorkspace}
            onClick={() => {
              selectPersonal();
              router.push("/projects");
            }}
          />
        </div>
      )}

      {!isLoading && !isError && organizationWorkspaces.length > 0 && (
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Organization Workspaces
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organizationWorkspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                onClick={() => {
                  selectWorkspace(ws);
                  router.push(`/ws/${ws.slug}`);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
