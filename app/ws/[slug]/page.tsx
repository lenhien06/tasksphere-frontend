"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  FolderKanban,
  Crown,
  Shield,
  User,
  Loader2,
  Plus,
  Sparkles,
  Tag,
  Settings,
  Building2,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { WorkspaceService } from "@/app/services/workspace.service";
import { Workspace, WorkspaceMember, WorkspaceRole } from "@/app/types/workspace.schema";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_ICON: Record<WorkspaceRole, React.ElementType> = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
};

const ROLE_COLOR: Record<WorkspaceRole, string> = {
  OWNER: "text-amber-600 bg-amber-50 border-amber-200",
  ADMIN: "text-blue-600 bg-blue-50 border-blue-200",
  MEMBER: "text-slate-600 bg-slate-50 border-slate-200",
};

// ─────────────────────────────────────────────────────────────────────────────
// Member Card
// ─────────────────────────────────────────────────────────────────────────────

function MemberCard({
  member,
  canEdit,
  wsId,
}: {
  member: WorkspaceMember;
  canEdit: boolean;
  wsId: string;
}) {
  const queryClient = useQueryClient();
  const RoleIcon = ROLE_ICON[member.role];
  const initials = member.fullName.slice(0, 2).toUpperCase();

  const removeMutation = useMutation({
    mutationFn: () => WorkspaceService.removeMember(wsId, member.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ws-members", wsId] });
      toast.success(`Đã xoá ${member.fullName} khỏi workspace`);
    },
    onError: () => toast.error("Không thể xoá thành viên"),
  });

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {member.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatarUrl}
          alt={member.fullName}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-sm font-bold text-white">
          {initials}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-slate-800">{member.fullName}</span>
          <span
            className={cn(
              "flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
              ROLE_COLOR[member.role]
            )}
          >
            <RoleIcon size={9} />
            {member.role}
          </span>
        </div>
        <p className="truncate text-xs text-slate-400">{member.email}</p>

        {/* Skill tags */}
        {member.skillTags && member.skillTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {member.skillTags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
              >
                <Tag size={8} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
          <span>{member.activeTaskCount} task đang mở</span>
          {member.avgStoryPoints != null && (
            <span>avg {member.avgStoryPoints} SP</span>
          )}
        </div>
      </div>

      {canEdit && member.role !== "OWNER" && (
        <button
          type="button"
          onClick={() => removeMutation.mutate()}
          disabled={removeMutation.isPending}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
          title="Xoá thành viên"
        >
          {removeMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "projects" | "members";

export default function WorkspaceDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = useState<Tab>("projects");

  const { data: currentUser } = useCurrentUser();

  const {
    data: wsData,
    isLoading: wsLoading,
    isError: wsError,
  } = useQuery({
    queryKey: ["workspace", slug],
    queryFn: () => WorkspaceService.getBySlug(slug),
    staleTime: 2 * 60 * 1000,
  });

  const workspace = wsData?.data as Workspace | undefined;

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["ws-members", workspace?.id],
    queryFn: () => WorkspaceService.getMembers(workspace!.id),
    enabled: !!workspace?.id && activeTab === "members",
    staleTime: 2 * 60 * 1000,
  });

  const members: WorkspaceMember[] = (membersData?.data as WorkspaceMember[]) ?? [];

  const canManage =
    workspace?.role === "OWNER" || workspace?.role === "ADMIN";

  // ── Loading / Error ──────────────────────────────────────────────────────

  if (wsLoading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (wsError || !workspace) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <Building2 size={48} className="mx-auto mb-4 text-slate-300" />
        <h2 className="text-lg font-semibold text-slate-700">
          Workspace không tồn tại
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Kiểm tra lại đường dẫn hoặc liên hệ OWNER.
        </p>
        <button
          type="button"
          onClick={() => router.push("/workspaces")}
          className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Quay về danh sách Workspace
        </button>
      </div>
    );
  }

  const initials = workspace.name.slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* ── Header ── */}
      <div className="mb-6 flex items-start gap-4">
        {workspace.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={workspace.avatarUrl}
            alt={workspace.name}
            className="h-14 w-14 rounded-2xl object-cover shadow"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-lg font-black text-white shadow">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{workspace.name}</h1>
          <p className="text-sm text-slate-400">/{workspace.slug}</p>
          {workspace.description && (
            <p className="mt-1 text-sm text-slate-500">{workspace.description}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {workspace.memberCount} thành viên
            </span>
            <span className="flex items-center gap-1">
              <FolderKanban size={12} />
              {workspace.projectCount} dự án
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {workspace.plan}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/ws/${slug}/settings`)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Settings size={13} />
            Cài đặt
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-6 flex items-center gap-1 border-b border-slate-200">
        {(["projects", "members"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab === "projects" ? (
              <>
                <FolderKanban size={14} />
                Dự án
              </>
            ) : (
              <>
                <Users size={14} />
                Thành viên
              </>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Projects ── */}
      {activeTab === "projects" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {workspace.projectCount} dự án trong workspace này
            </p>
            <div className="flex gap-2">
              {/* AI project creation */}
              <button
                type="button"
                onClick={() => router.push(`/ws/${slug}/projects/new-with-ai`)}
                className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
              >
                <Sparkles size={15} />
                Tạo dự án mới với AI
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={15} />
                Tạo dự án
              </button>
            </div>
          </div>

          {workspace.projectCount === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <FolderKanban size={40} className="mb-3 text-slate-300" />
              <h3 className="text-base font-semibold text-slate-700">
                Chưa có dự án nào
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Tạo dự án đầu tiên cho workspace này
              </p>
              <button
                type="button"
                onClick={() => router.push(`/ws/${slug}/projects/new-with-ai`)}
                className="mt-5 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100"
              >
                <Sparkles size={15} />
                ✨ Tạo dự án mới với AI
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
              Danh sách dự án sẽ hiển thị ở đây
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Members ── */}
      {activeTab === "members" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {workspace.memberCount} thành viên
            </p>
            {canManage && (
              <button
                type="button"
                onClick={() => router.push(`/workspaces/${workspace.id}/invite`)}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={15} />
                Mời thành viên
              </button>
            )}
          </div>

          {membersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {members.map((m) => (
                <MemberCard
                  key={m.userId}
                  member={m}
                  canEdit={canManage}
                  wsId={workspace.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
