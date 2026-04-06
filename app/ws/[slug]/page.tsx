"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  FolderKanban,
  Globe,
  Landmark,
  Loader2,
  Lock,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { WorkspaceService } from "@/app/services/workspace.service";
import { ProjectService } from "@/app/services/ProjectService";
import {
  type Workspace,
  type WorkspaceMember,
  type WorkspacePlan,
  type WorkspaceRole,
} from "@/app/types/workspace.schema";
import { type Project } from "@/app/types/project..schema";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<WorkspaceRole, string> = {
  OWNER: "border-[#fff1c2] bg-[#fff8c5] text-[#9a6700]",
  ADMIN: "border-[#b6e3ff] bg-[#ddf4ff] text-[#0969da]",
  MEMBER: "border-[#d0d7de] bg-[#f6f8fa] text-[#57606a]",
};

const PLAN_LABELS: Record<WorkspacePlan, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

const VISIBILITY_STYLES: Record<
  Project["visibility"],
  {
    label: string;
    className: string;
    icon: typeof Lock;
  }
> = {
  private: {
    label: "Private",
    className: "border-[#d0d7de] bg-white text-[#57606a]",
    icon: Lock,
  },
  internal: {
    label: "Internal",
    className: "border-[#bfd8ff] bg-[#edf4ff] text-[#0969da]",
    icon: Landmark,
  },
  public: {
    label: "Public",
    className: "border-[#c2e5c4] bg-[#dafbe1] text-[#1a7f37]",
    icon: Globe,
  },
};

const STATUS_STYLES: Record<Project["status"], string> = {
  active: "bg-[#dafbe1] text-[#1a7f37]",
  completed: "bg-[#ddf4ff] text-[#0969da]",
  archived: "bg-[#f6f8fa] text-[#57606a]",
  deleted: "bg-[#ffebe9] text-[#cf222e]",
};

function getInitials(name?: string | null) {
  return (name && typeof name === "string" ? name.slice(0, 2) : "WS").toUpperCase();
}

function formatDateLabel(value?: string | null) {
  if (!value) return "Vừa cập nhật";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Vừa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function ProjectRow({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: () => void;
}) {
  const visibility = VISIBILITY_STYLES[project.visibility];
  const VisibilityIcon = visibility.icon;
  const progress = Math.max(0, Math.min(100, project.progress ?? 0));

  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[minmax(0,1fr)_200px] gap-6 border-t border-[#d8dee4] px-5 py-5 text-left transition hover:bg-[#f6f8fa]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[18px] font-semibold text-[#0969da] hover:underline">
            {project.name}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              visibility.className
            )}
          >
            <VisibilityIcon size={11} />
            {visibility.label}
          </span>
          <span className="rounded-full bg-[#f6f8fa] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[#57606a]">
            {project.projectKey}
          </span>
        </div>

        {project.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#57606a]">
            {project.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#57606a]">
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
              STATUS_STYLES[project.status]
            )}
          >
            {project.status}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={14} />
            {project.memberCount} thành viên
          </span>
          <span className="inline-flex items-center gap-1">
            <FolderKanban size={14} />
            {project.taskStats.total} task
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={14} />
            Cập nhật {formatDateLabel(project.updatedAt ?? project.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        <div className="hidden w-full max-w-[120px] md:block">
          <div className="h-[36px] overflow-hidden rounded-full bg-[#f6f8fa] px-3 py-4">
            <div
              className="h-[3px] rounded-full bg-gradient-to-r from-[#2da44e] via-[#1f883d] to-[#9be9a8]"
              style={{ width: `${Math.max(progress, 6)}%` }}
            />
          </div>
          <div className="mt-2 text-right text-[11px] font-medium text-[#57606a]">
            {progress}% complete
          </div>
        </div>
        <ArrowUpRight size={16} className="text-[#57606a]" />
      </div>
    </button>
  );
}

type WorkspaceTab = "projects" | "members" | "settings";

function MemberListRow({ member }: { member: WorkspaceMember }) {
  return (
    <div className="flex items-center gap-3 border-t border-[#d8dee4] px-5 py-4 first:border-t-0">
      {member.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatarUrl}
          alt={member.fullName}
          className="h-10 w-10 rounded-full border border-[#d0d7de] object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d0d7de] bg-[#f6f8fa] text-xs font-semibold text-[#57606a]">
          {getInitials(member.fullName)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[#1f2328]">
          {member.fullName}
        </div>
        <div className="truncate text-xs text-[#57606a]">{member.email}</div>
      </div>

      <div className="text-right">
        <div className="text-xs font-semibold uppercase tracking-wide text-[#57606a]">
          {member.role}
        </div>
        <div className="mt-1 text-[11px] text-[#8c959f]">
          {member.activeTaskCount} task mở
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { selectWorkspace } = useWorkspace();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("projects");
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | Project["visibility"]>(
    "all"
  );
  const [sortBy, setSortBy] = useState<"updated" | "name" | "progress">("updated");

  const {
    data: workspaceResponse,
    isLoading: workspaceLoading,
    isError: workspaceError,
  } = useQuery({
    queryKey: ["workspace", slug],
    queryFn: () => WorkspaceService.getBySlug(slug),
    staleTime: 2 * 60 * 1000,
  });

  const workspace = workspaceResponse?.data as Workspace | undefined;

  const {
    data: projectsResponse,
    isLoading: projectsLoading,
  } = useQuery({
    queryKey: ["workspace-projects", workspace?.id],
    queryFn: () =>
      ProjectService.search({
        workspaceId: workspace!.id,
        size: 100,
        sort: "updatedAt,desc",
      }),
    enabled: !!workspace?.id,
    staleTime: 2 * 60 * 1000,
  });

  const {
    data: membersResponse,
    isLoading: membersLoading,
  } = useQuery({
    queryKey: ["ws-members", workspace?.id],
    queryFn: () => WorkspaceService.getMembers(workspace!.id),
    enabled: !!workspace?.id,
    staleTime: 2 * 60 * 1000,
  });

  const allProjects = useMemo(
    () => ((projectsResponse?.data.content as Project[]) ?? []).filter(Boolean),
    [projectsResponse]
  );

  const members = useMemo(
    () => ((membersResponse?.data as WorkspaceMember[]) ?? []).filter(Boolean),
    [membersResponse]
  );

  const filteredProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...allProjects]
      .filter((project) => {
        if (visibilityFilter !== "all" && project.visibility !== visibilityFilter) {
          return false;
        }
        if (!keyword) return true;
        return (
          project.name.toLowerCase().includes(keyword) ||
          project.projectKey.toLowerCase().includes(keyword) ||
          (project.description ?? "").toLowerCase().includes(keyword)
        );
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "progress") return (b.progress ?? 0) - (a.progress ?? 0);
        const aTime = new Date(a.updatedAt ?? a.createdAt).getTime();
        const bTime = new Date(b.updatedAt ?? b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [allProjects, search, sortBy, visibilityFilter]);

  const visibilitySummary = useMemo(() => {
    return allProjects.reduce(
      (acc, project) => {
        acc[project.visibility] += 1;
        return acc;
      },
      { private: 0, internal: 0, public: 0 }
    );
  }, [allProjects]);

  const memberPreview = members.slice(0, 8);
  const canManage = workspace?.role === "OWNER" || workspace?.role === "ADMIN";

  if (workspaceLoading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-[#0969da]" />
      </div>
    );
  }

  if (workspaceError || !workspace) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <Building2 size={48} className="mx-auto mb-4 text-[#8c959f]" />
        <h2 className="text-xl font-semibold text-[#1f2328]">
          Workspace không tồn tại
        </h2>
        <p className="mt-2 text-sm text-[#57606a]">
          Kiểm tra lại đường dẫn hoặc quay về danh sách workspaces để chọn lại.
        </p>
        <button
          type="button"
          onClick={() => router.push("/workspaces")}
          className="mt-6 rounded-md border border-[#d0d7de] bg-white px-4 py-2 text-sm font-medium text-[#24292f] shadow-sm transition hover:bg-[#f6f8fa]"
        >
          Quay về Workspaces
        </button>
      </div>
    );
  }

  const initials = getInitials(workspace.name);
  const tabs: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
    { id: "projects", label: "Tất cả dự án", icon: <FolderKanban size={14} /> },
    { id: "members", label: "Thành viên", icon: <Users size={14} /> },
    { id: "settings", label: "Settings", icon: <Settings size={14} /> },
  ];

  return (
    <div className="w-full pb-8 pt-0 text-[#1f2328]">
      <section className="border-b border-slate-200 bg-white px-6 pb-0 pt-5 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-6">
            {workspace.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={workspace.avatarUrl}
                alt={workspace.name}
                className="h-24 w-24 rounded-xl border border-[#d0d7de] object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-[#d0d7de] bg-[#f6f8fa] text-3xl font-semibold text-[#57606a]">
                {initials}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="truncate text-[34px] font-medium leading-tight text-[#1f2328]">
                  {workspace.name}
                </h1>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-semibold",
                    ROLE_STYLES[workspace.role ?? "MEMBER"]
                  )}
                >
                  {workspace.role ?? "MEMBER"}
                </span>
              </div>
              <p className="mt-1 text-[18px] text-[#57606a]">/{workspace.slug}</p>
              {workspace.description && (
                <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#57606a]">
                  {workspace.description}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              selectWorkspace(workspace);
              router.push(`/ws/${slug}/projects/new-with-ai`);
            }}
            className="inline-flex items-center gap-2 rounded-md border border-[#d0d7de] bg-white px-4 py-2 text-sm font-medium text-[#24292f] shadow-sm transition hover:bg-[#f6f8fa]"
          >
            <Sparkles size={15} />
            Tạo với AI
          </button>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 whitespace-nowrap px-4 pb-3 text-[14px] font-semibold tracking-tight transition-all",
                activeTab === tab.id
                  ? "text-blue-600"
                  : "text-slate-400 hover:text-slate-900"
              )}
            >
              <span className={cn(activeTab === tab.id ? "opacity-100" : "opacity-70")}>
                {tab.icon}
              </span>
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-t-full bg-blue-600 shadow-[0_-2px_6px_rgba(37,99,235,0.2)]" />
              )}
            </button>
          ))}
        </div>
      </section>

      <div className="px-6 pt-6">
        {activeTab === "projects" && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="min-w-0">
          <div className="mb-4 flex items-center gap-2 text-[22px] font-semibold text-[#1f2328]">
            <FolderKanban size={20} />
            Dự án
          </div>

          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8c959f]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm dự án trong workspace..."
                className="h-10 w-full rounded-md border border-[#d0d7de] bg-white pl-11 pr-4 text-sm text-[#1f2328] outline-none transition placeholder:text-[#8c959f] focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/15"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={visibilityFilter}
                onChange={(event) =>
                  setVisibilityFilter(
                    event.target.value as "all" | Project["visibility"]
                  )
                }
                className="h-10 rounded-md border border-[#d0d7de] bg-white px-3 text-sm text-[#24292f] outline-none transition focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/15"
              >
                <option value="all">Phạm vi</option>
                <option value="private">Private</option>
                <option value="internal">Internal</option>
                <option value="public">Public</option>
              </select>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as "updated" | "name" | "progress")
                }
                className="h-10 rounded-md border border-[#d0d7de] bg-white px-3 text-sm text-[#24292f] outline-none transition focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/15"
              >
                <option value="updated">Sắp xếp</option>
                <option value="updated">Cập nhật gần nhất</option>
                <option value="name">Tên A-Z</option>
                <option value="progress">Tiến độ cao nhất</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  selectWorkspace(workspace);
                  router.push("/projects");
                }}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[#1f883d] bg-[#2da44e] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#2c974b]"
              >
                <Plus size={15} />
                Tạo dự án
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#d0d7de] bg-white shadow-[0_1px_2px_rgba(31,35,40,0.04)]">
            {projectsLoading ? (
              <div className="flex items-center justify-center px-6 py-16">
                <Loader2 size={24} className="animate-spin text-[#0969da]" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <FolderKanban size={38} className="mx-auto mb-3 text-[#8c959f]" />
                <h3 className="text-lg font-semibold text-[#1f2328]">
                  Chưa có dự án phù hợp
                </h3>
                <p className="mt-2 text-sm text-[#57606a]">
                  Thử đổi bộ lọc hoặc tạo dự án đầu tiên cho workspace này.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      selectWorkspace(workspace);
                      router.push("/projects");
                    }}
                    className="rounded-md border border-[#1f883d] bg-[#2da44e] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#2c974b]"
                  >
                    Tạo dự án
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      selectWorkspace(workspace);
                      router.push(`/ws/${slug}/projects/new-with-ai`);
                    }}
                    className="rounded-md border border-[#d0d7de] bg-white px-4 py-2 text-sm font-medium text-[#24292f] shadow-sm transition hover:bg-[#f6f8fa]"
                  >
                    Tạo với AI
                  </button>
                </div>
              </div>
            ) : (
              filteredProjects.map((project, index) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onOpen={() => router.push(`/projects/${project.id}`)}
                />
              ))
            )}
          </div>
        </main>

        <aside className="space-y-4">
          <div className="rounded-xl border border-[#d0d7de] bg-white p-5 shadow-[0_1px_2px_rgba(31,35,40,0.04)]">
            <h2 className="text-sm font-semibold text-[#1f2328]">Thông tin workspace</h2>
            <div className="mt-4 space-y-3 text-sm text-[#57606a]">
              <div className="flex items-center justify-between gap-4">
                <span>Loại</span>
                <span className="font-medium text-[#1f2328]">
                  {workspace.type === "PERSONAL" ? "Personal" : "Organization"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Gói</span>
                <span className="font-medium text-[#1f2328]">
                  {PLAN_LABELS[workspace.plan]}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Owner</span>
                <span className="truncate font-medium text-[#1f2328]">
                  {workspace.ownerName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Thành viên</span>
                <span className="font-medium text-[#1f2328]">
                  {workspace.memberCount}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Dự án</span>
                <span className="font-medium text-[#1f2328]">
                  {workspace.projectCount}
                </span>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    selectWorkspace(workspace);
                    router.push("/projects");
                  }}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#d0d7de] bg-white px-3 py-2 text-sm font-medium text-[#24292f] shadow-sm transition hover:bg-[#f6f8fa]"
                >
                  <FolderKanban size={14} />
                  Mở danh sách dự án
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#d0d7de] bg-white p-5 shadow-[0_1px_2px_rgba(31,35,40,0.04)]">
            <h2 className="text-sm font-semibold text-[#1f2328]">Thành viên</h2>
            {membersLoading ? (
              <div className="mt-4 flex items-center justify-center py-6">
                <Loader2 size={18} className="animate-spin text-[#0969da]" />
              </div>
            ) : members.length === 0 ? (
              <p className="mt-4 text-sm text-[#57606a]">
                Workspace này chưa có thành viên nào.
              </p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {memberPreview.map((member) =>
                    member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={member.userId}
                        src={member.avatarUrl}
                        alt={member.fullName}
                        title={member.fullName}
                        className="h-9 w-9 rounded-full border border-[#d0d7de] object-cover"
                      />
                    ) : (
                      <div
                        key={member.userId}
                        title={member.fullName}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d0d7de] bg-[#f6f8fa] text-xs font-semibold text-[#57606a]"
                      >
                        {getInitials(member.fullName)}
                      </div>
                    )
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {members.slice(0, 5).map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 border-t border-[#d8dee4] pt-3 first:border-t-0 first:pt-0"
                    >
                      {member.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.avatarUrl}
                          alt={member.fullName}
                          className="h-8 w-8 rounded-full border border-[#d0d7de] object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#57606a]">
                          {getInitials(member.fullName)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[#1f2328]">
                          {member.fullName}
                        </div>
                        <div className="truncate text-xs text-[#57606a]">
                          {member.role}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-[#d0d7de] bg-white p-5 shadow-[0_1px_2px_rgba(31,35,40,0.04)]">
            <h2 className="text-sm font-semibold text-[#1f2328]">Top visibility</h2>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#57606a]">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#57606a]" />
                Private {visibilitySummary.private}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#0969da]" />
                Internal {visibilitySummary.internal}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#1a7f37]" />
                Public {visibilitySummary.public}
              </span>
            </div>
          </div>
        </aside>
          </div>
        )}

        {activeTab === "members" && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <main className="min-w-0">
              <div className="mb-4 flex items-center gap-2 text-[22px] font-semibold text-[#1f2328]">
                <Users size={20} />
                Thành viên
              </div>

              <div className="overflow-hidden rounded-xl border border-[#d0d7de] bg-white shadow-[0_1px_2px_rgba(31,35,40,0.04)]">
                {membersLoading ? (
                  <div className="flex items-center justify-center px-6 py-16">
                    <Loader2 size={24} className="animate-spin text-[#0969da]" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="px-6 py-16 text-center text-sm text-[#57606a]">
                    Workspace này chưa có thành viên nào.
                  </div>
                ) : (
                  members.map((member) => (
                    <MemberListRow key={member.userId} member={member} />
                  ))
                )}
              </div>
            </main>

            <aside className="space-y-4">
              <div className="rounded-xl border border-[#d0d7de] bg-white p-5 shadow-[0_1px_2px_rgba(31,35,40,0.04)]">
                <h2 className="text-sm font-semibold text-[#1f2328]">Tóm tắt đội ngũ</h2>
                <div className="mt-4 space-y-3 text-sm text-[#57606a]">
                  <div className="flex items-center justify-between">
                    <span>Tổng thành viên</span>
                    <span className="font-medium text-[#1f2328]">{workspace.memberCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Owner</span>
                    <span className="font-medium text-[#1f2328]">
                      {members.filter((member) => member.role === "OWNER").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Admin</span>
                    <span className="font-medium text-[#1f2328]">
                      {members.filter((member) => member.role === "ADMIN").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Member</span>
                    <span className="font-medium text-[#1f2328]">
                      {members.filter((member) => member.role === "MEMBER").length}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <main className="min-w-0">
              <div className="mb-4 flex items-center gap-2 text-[22px] font-semibold text-[#1f2328]">
                <Settings size={20} />
                Settings
              </div>

              <div className="rounded-xl border border-[#d0d7de] bg-white p-6 shadow-[0_1px_2px_rgba(31,35,40,0.04)]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#d8dee4] p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#57606a]">
                      Tên workspace
                    </div>
                    <div className="mt-2 text-base font-semibold text-[#1f2328]">
                      {workspace.name}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#d8dee4] p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#57606a]">
                      Slug
                    </div>
                    <div className="mt-2 text-base font-semibold text-[#1f2328]">
                      /{workspace.slug}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#d8dee4] p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#57606a]">
                      Loại
                    </div>
                    <div className="mt-2 text-base font-semibold text-[#1f2328]">
                      {workspace.type === "PERSONAL" ? "Personal" : "Organization"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#d8dee4] p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#57606a]">
                      Gói
                    </div>
                    <div className="mt-2 text-base font-semibold text-[#1f2328]">
                      {PLAN_LABELS[workspace.plan]}
                    </div>
                  </div>
                </div>

                {workspace.description && (
                  <div className="mt-4 rounded-xl border border-[#d8dee4] p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#57606a]">
                      Mô tả
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#57606a]">
                      {workspace.description}
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      selectWorkspace(workspace);
                      router.push("/projects");
                    }}
                    className="rounded-md border border-[#d0d7de] bg-white px-4 py-2 text-sm font-medium text-[#24292f] shadow-sm transition hover:bg-[#f6f8fa]"
                  >
                    Mở dự án
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      selectWorkspace(workspace);
                      router.push(`/ws/${slug}/projects/new-with-ai`);
                    }}
                    className="rounded-md border border-[#d0d7de] bg-white px-4 py-2 text-sm font-medium text-[#24292f] shadow-sm transition hover:bg-[#f6f8fa]"
                  >
                    Tạo với AI
                  </button>
                </div>
              </div>
            </main>

            <aside className="space-y-4">
              <div className="rounded-xl border border-[#d0d7de] bg-white p-5 shadow-[0_1px_2px_rgba(31,35,40,0.04)]">
                <h2 className="text-sm font-semibold text-[#1f2328]">Quyền hiện tại</h2>
                <div className="mt-4 text-sm text-[#57606a]">
                  Bạn đang ở vai trò{" "}
                  <span className="font-semibold text-[#1f2328]">
                    {workspace.role ?? "MEMBER"}
                  </span>{" "}
                  trong workspace này.
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
