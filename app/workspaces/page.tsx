"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  FolderKanban,
  Loader2,
  Plus,
  Users,
} from "lucide-react";
import { WorkspaceService } from "@/app/services/workspace.service";
import {
  type Workspace,
  type WorkspaceRole,
} from "@/app/types/workspace.schema";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<WorkspaceRole, string> = {
  OWNER: "border-[#bfd8ff] bg-[#ddf4ff] text-[#0969da]",
  ADMIN: "border-[#c2e5c4] bg-[#dafbe1] text-[#1a7f37]",
  MEMBER: "border-[#d0d7de] bg-[#f6f8fa] text-[#57606a]",
};

function getInitials(name?: string | null) {
  return (name && typeof name === "string" ? name.slice(0, 2) : "WS").toUpperCase();
}

function WorkspaceRow({
  workspace,
  onOpen,
  actionLabel,
}: {
  workspace: Workspace;
  onOpen: () => void;
  actionLabel: string;
}) {
  const role = workspace.role ?? "MEMBER";

  return (
    <div className="flex flex-col gap-4 border-t border-[#d8dee4] px-4 py-4 first:border-t-0 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        {workspace.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={workspace.avatarUrl}
            alt={workspace.name}
            className="h-11 w-11 rounded-lg border border-[#d0d7de] object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#d0d7de] bg-[#f6f8fa] text-sm font-semibold text-[#57606a]">
            {getInitials(workspace.name)}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="truncate text-left text-[18px] font-semibold text-[#0969da] hover:underline"
            >
              {workspace.name}
            </button>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                ROLE_STYLES[role]
              )}
            >
              {role}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#57606a]">
            <span>/{workspace.slug}</span>
            <span className="inline-flex items-center gap-1">
              <Users size={14} />
              {workspace.memberCount} thành viên
            </span>
            <span className="inline-flex items-center gap-1">
              <FolderKanban size={14} />
              {workspace.projectCount} dự án
            </span>
          </div>
          {workspace.description && (
            <p className="mt-1 line-clamp-1 text-sm text-[#57606a]">
              {workspace.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-start md:self-center">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-md border border-[#d0d7de] bg-white px-3 py-1.5 text-sm font-medium text-[#24292f] shadow-sm transition hover:bg-[#f6f8fa]"
        >
          {actionLabel}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default function WorkspaceListPage() {
  const router = useRouter();
  const { selectWorkspace } = useWorkspace();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-workspaces"],
    queryFn: () => WorkspaceService.getMyWorkspaces(),
    staleTime: 2 * 60 * 1000,
  });

  const workspaces: Workspace[] = (data?.data as Workspace[]) ?? [];
  const organizationWorkspaces = workspaces.filter(
    (workspace) => workspace.type !== "PERSONAL"
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 text-[#1f2328]">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[32px] font-medium text-[#1f2328]">Workspaces</h1>
          <p className="mt-1 text-sm text-[#57606a]">
            Quản lý các workspace tổ chức của bạn theo một nơi thống nhất.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/workspaces/new")}
          className="inline-flex items-center gap-2 rounded-md border border-[#d0d7de] bg-white px-4 py-2 text-sm font-medium text-[#24292f] shadow-sm transition hover:bg-[#f6f8fa]"
        >
          <Plus size={15} />
          Tạo workspace
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[#0969da]" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-[#ff818266] bg-[#ffebe9] px-6 py-5 text-sm text-[#cf222e]">
          Không thể tải danh sách workspace. Vui lòng thử lại.
        </div>
      )}

      {!isLoading && !isError && workspaces.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#d0d7de] bg-white px-6 py-16 text-center shadow-[0_1px_2px_rgba(31,35,40,0.04)]">
          <Building2 size={42} className="mx-auto mb-3 text-[#8c959f]" />
          <h2 className="text-lg font-semibold text-[#1f2328]">
            Bạn chưa có workspace nào
          </h2>
          <p className="mt-2 text-sm text-[#57606a]">
            Tạo workspace đầu tiên để tách riêng không gian cá nhân và team.
          </p>
          <button
            type="button"
            onClick={() => router.push("/workspaces/new")}
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-[#d0d7de] bg-white px-4 py-2 text-sm font-medium text-[#24292f] shadow-sm transition hover:bg-[#f6f8fa]"
          >
            <Plus size={15} />
            Tạo workspace đầu tiên
          </button>
        </div>
      )}

      {!isLoading && !isError && organizationWorkspaces.length > 0 && (
        <section>
          <div className="mb-3 text-sm font-semibold text-[#1f2328]">
            Organization workspaces
          </div>
          <div className="overflow-hidden rounded-xl border border-[#d0d7de] bg-white shadow-[0_1px_2px_rgba(31,35,40,0.04)]">
            {organizationWorkspaces.map((workspace) => (
              <WorkspaceRow
                key={workspace.id}
                workspace={workspace}
                actionLabel="Xem chi tiết"
                onOpen={() => {
                  selectWorkspace(workspace);
                  router.push(`/ws/${workspace.slug}`);
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
