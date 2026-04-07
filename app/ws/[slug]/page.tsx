"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  Eye,
  FolderKanban,
  Globe,
  Landmark,
  Loader2,
  Lock,
  MoreHorizontal,
  Mail,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceService } from "@/app/services/workspace.service";
import { ProjectService } from "@/app/services/ProjectService";
import { ProfileService } from "@/app/services/profile.service";
import {
  type Workspace,
  type WorkspaceMember,
  type WorkspaceRole,
} from "@/app/types/workspace.schema";
import { type Project } from "@/app/types/project..schema";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/useAuthStore";

const ROLE_STYLES: Record<WorkspaceRole, string> = {
  OWNER: "border-[#fff1c2] bg-[#fff8c5] text-[#9a6700]",
  ADMIN: "border-[#b6e3ff] bg-[#ddf4ff] text-[#0969da]",
  MEMBER: "border-[#d0d7de] bg-[#f6f8fa] text-[#57606a]",
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

const WORKSPACE_SKILL_COLORS: Record<string, string> = {
  React: "bg-emerald-500 text-white",
  "Vue.js": "bg-blue-500 text-white",
  Python: "bg-blue-600 text-white",
  Django: "bg-emerald-700 text-white",
  Linux: "bg-purple-600 text-white",
  AWS: "bg-orange-500 text-white",
  Selenium: "bg-red-500 text-white",
  JMeter: "bg-yellow-500 text-white",
  Scrum: "bg-cyan-500 text-white",
  Jira: "bg-fuchsia-500 text-white",
  SQL: "bg-blue-600 text-white",
  Tableau: "bg-purple-600 text-white",
  "Node.js": "bg-emerald-500 text-white",
  MongoDB: "bg-orange-500 text-white",
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSkillTags(skillTags: string[]) {
  return Array.from(
    new Set(
      skillTags
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 20);
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
      className="grid w-full grid-cols-[minmax(0,1fr)_148px] gap-4 border-t border-[#d8dee4] px-5 py-4 text-left transition hover:bg-[#f6f8fa]"
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
          <p className="mt-1.5 line-clamp-1 text-sm leading-6 text-[#57606a]">
            {project.description}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#57606a]">
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
        <div className="hidden w-full max-w-[104px] md:block">
          <div className="h-[32px] overflow-hidden rounded-full bg-[#f6f8fa] px-3 py-3.5">
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

type InviteWorkspaceMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
};

function InviteWorkspaceMemberModal({
  isOpen,
  onClose,
  workspaceId,
}: InviteWorkspaceMemberModalProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const [skillMode, setSkillMode] = useState<"profile" | "custom">("profile");
  const [customSkills, setCustomSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const normalizedEmail = email.trim().toLowerCase();
  const isValidEmail = EMAIL_REGEX.test(normalizedEmail);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedEmail(normalizedEmail);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [normalizedEmail]);

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setRole("MEMBER");
      setDebouncedEmail("");
      setSkillMode("profile");
      setCustomSkills([]);
      setSkillInput("");
    }
  }, [isOpen]);

  const inviteePreviewQuery = useQuery({
    queryKey: ["invite-preview", debouncedEmail],
    queryFn: () => ProfileService.getInviteePreview(debouncedEmail),
    enabled: isOpen && isValidEmail,
    staleTime: 30_000,
  });

  useEffect(() => {
    const preview = inviteePreviewQuery.data;
    if (!preview || !isOpen) return;
    if (preview.existsInSystem && preview.skillTags.length > 0) {
      setSkillMode("profile");
      setCustomSkills([]);
      return;
    }
    if (preview.existsInSystem) {
      setSkillMode("custom");
    }
  }, [inviteePreviewQuery.data, isOpen]);

  const addCustomSkill = () => {
    const next = normalizeSkillTags([...customSkills, skillInput]);
    setCustomSkills(next);
    setSkillInput("");
  };

  const removeCustomSkill = (skill: string) => {
    setCustomSkills((current) => current.filter((item) => item !== skill));
  };

  const inviteMutation = useMutation({
    mutationFn: () =>
      WorkspaceService.inviteMember(workspaceId, {
        email: normalizedEmail,
        role,
        skillTags: inviteePreviewQuery.data?.existsInSystem
          ? (skillMode === "custom" ? customSkills : undefined)
          : undefined,
      }),
    onSuccess: (response) => {
      const payload = response.data;
      toast.success(
        payload.addedToWorkspace
          ? "Thành viên đã được thêm và email đã được gửi ngay."
          : "Email mời đã được gửi ngay cho người chưa có tài khoản."
      );
      if (payload.addedToWorkspace) {
        queryClient.invalidateQueries({ queryKey: ["ws-members", workspaceId] });
      }
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      setEmail("");
      setRole("MEMBER");
      setDebouncedEmail("");
      setSkillMode("profile");
      setCustomSkills([]);
      setSkillInput("");
      onClose();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Không thể thêm thành viên";
      toast.error(message);
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1117]/45 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#d0d7de] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#d8dee4] px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-[#1f2328]">Thêm thành viên</h3>
            <p className="mt-1 text-sm text-[#57606a]">
              Mời thành viên mới vào workspace này.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#57606a] transition hover:bg-[#f6f8fa]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#1f2328]">
              Email
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="h-11 w-full rounded-xl border border-[#d0d7de] px-4 text-sm text-[#1f2328] outline-none transition placeholder:text-[#8c959f] focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/15"
            />
          </div>

          {isValidEmail && (
            <div className="rounded-2xl border border-[#d8dee4] bg-[#f6f8fa] p-4">
              {inviteePreviewQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#57606a]">
                  <Loader2 size={15} className="animate-spin" />
                  Checking account and profile skills...
                </div>
              ) : inviteePreviewQuery.data?.existsInSystem ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {inviteePreviewQuery.data.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inviteePreviewQuery.data.avatarUrl}
                        alt={inviteePreviewQuery.data.fullName || inviteePreviewQuery.data.email}
                        className="h-11 w-11 rounded-full border border-[#d0d7de] object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d0d7de] bg-white text-sm font-semibold text-[#57606a]">
                        {getInitials(inviteePreviewQuery.data.fullName || inviteePreviewQuery.data.email)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#1f2328]">
                        {inviteePreviewQuery.data.fullName || inviteePreviewQuery.data.email}
                      </div>
                      <div className="truncate text-xs text-[#57606a]">
                        {inviteePreviewQuery.data.email}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#57606a]">
                      Profile skills
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {inviteePreviewQuery.data.skillTags.length > 0 ? (
                        inviteePreviewQuery.data.skillTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-[#b6e3ff] bg-[#ddf4ff] px-2 py-0.5 text-[11px] font-semibold text-[#0969da]"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#57606a]">
                          This user has no profile skills yet.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSkillMode("profile")}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
                          skillMode === "profile"
                            ? "border-[#0969da] bg-[#ddf4ff] text-[#0969da]"
                            : "border-[#d0d7de] bg-white text-[#1f2328] hover:border-[#8c959f]"
                        )}
                      >
                        Use profile skills
                      </button>
                      <button
                        type="button"
                        onClick={() => setSkillMode("custom")}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
                          skillMode === "custom"
                            ? "border-[#0969da] bg-[#ddf4ff] text-[#0969da]"
                            : "border-[#d0d7de] bg-white text-[#1f2328] hover:border-[#8c959f]"
                        )}
                      >
                        Use workspace skills
                      </button>
                    </div>

                    {skillMode === "custom" && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            value={skillInput}
                            onChange={(event) => setSkillInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                addCustomSkill();
                              }
                            }}
                            placeholder="Add a skill"
                            className="h-10 flex-1 rounded-xl border border-[#d0d7de] bg-white px-4 text-sm text-[#1f2328] outline-none transition placeholder:text-[#8c959f] focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/15"
                          />
                          <button
                            type="button"
                            onClick={addCustomSkill}
                            disabled={!skillInput.trim()}
                            className="rounded-xl border border-[#d0d7de] bg-white px-3 text-sm font-semibold text-[#1f2328] transition hover:bg-[#f6f8fa] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {customSkills.length > 0 ? customSkills.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-full bg-[#1f2328] px-2 py-0.5 text-[11px] font-semibold text-white"
                            >
                              {tag}
                              <button type="button" onClick={() => removeCustomSkill(tag)}>
                                <X size={10} />
                              </button>
                            </span>
                          )) : (
                            <span className="text-xs text-[#57606a]">
                              Leave empty to keep using profile skills.
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d0d7de] bg-white text-[#57606a]">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[#1f2328]">
                      {normalizedEmail}
                    </div>
                    <div className="text-xs text-[#57606a]">
                      No existing account found. We will send an email immediately, but this person will not appear as an internal account yet.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-[#1f2328]">
              Vai trò
            </label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as "ADMIN" | "MEMBER")}
              className="h-11 w-full rounded-xl border border-[#d0d7de] px-4 text-sm text-[#1f2328] outline-none transition focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/15"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#d8dee4] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#d0d7de] bg-white px-4 py-2 text-sm font-medium text-[#24292f] transition hover:bg-[#f6f8fa]"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => inviteMutation.mutate()}
            disabled={!isValidEmail || inviteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {inviteMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Thêm thành viên
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberListRow({ member }: { member: WorkspaceMember }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px_140px] items-center gap-4 border-t border-[#d8dee4] px-5 py-4 first:border-t-0">
      <div className="flex min-w-0 items-center gap-3">
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
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[#1f2328]">
            {member.fullName}
          </div>
          <div className="truncate text-xs text-[#57606a]">{member.email}</div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-1.5">
          {(member.skillTags ?? []).length > 0 ? (
            (member.skillTags ?? []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#ddf4ff] px-2 py-0.5 text-[11px] font-semibold text-[#0969da]"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-xs text-[#8c959f]">Chưa có skill</span>
          )}
        </div>
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide text-[#57606a]">
        {member.role}
      </div>

      <div className="text-right text-[11px] text-[#57606a]">
        {member.joinedAt ? new Date(member.joinedAt).toISOString().split("T")[0] : "-"}
        <div className="mt-1 text-[#8c959f]">{member.activeTaskCount} task mở</div>
      </div>
    </div>
  );
}

function WorkspaceRoleBadge({ role }: { role: WorkspaceRole }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-tight text-slate-500">
      {role}
    </span>
  );
}

function MemberListHeader() {
  return (
    <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px_140px] gap-4 border-b border-[#d8dee4] bg-[#f6f8fa] px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-[#57606a]">
      <div>Thành viên</div>
      <div>Skills</div>
      <div>Role</div>
      <div className="text-right">Ngày tham gia</div>
    </div>
  );
}

function CompactMemberList({ members }: { members: WorkspaceMember[] }) {
  return (
    <div className="space-y-3">
      {members.slice(0, 4).map((member) => (
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
            <div className="truncate text-xs uppercase text-[#57606a]">
              {member.role}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SidebarCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#d0d7de] bg-white p-5 shadow-[0_1px_2px_rgba(31,35,40,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#1f2328]">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params.slug as string;
  const { selectWorkspace } = useWorkspace();
  const currentUserId = useAuthStore((state) => String(state.user?.id ?? ""));

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("projects");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | Project["visibility"]>(
    "all"
  );
  const [sortBy, setSortBy] = useState<"updated" | "name" | "progress">("updated");
  const [addingSkillToMemberId, setAddingSkillToMemberId] = useState<string | null>(null);
  const [newSkillText, setNewSkillText] = useState("");

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

  const canManage = workspace?.role === "OWNER" || workspace?.role === "ADMIN";
  const canManageMemberSkills = (userId: string) => canManage || currentUserId === userId;

  const updateSkillMutation = useMutation({
    mutationFn: ({ userId, skillTags }: { userId: string; skillTags: string[] }) =>
      WorkspaceService.updateMemberSkills(workspace!.id, userId, skillTags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ws-members", workspace?.id] });
    },
    onError: () => {
      toast.error("Không thể cập nhật skill của thành viên.");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => WorkspaceService.removeMember(workspace!.id, userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ["ws-members", workspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["workspace", slug] });
      if (userId === currentUserId) {
        toast.success("Đã rời workspace.");
        router.push("/workspaces");
        return;
      }
      toast.success("Đã xóa thành viên khỏi workspace.");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.meta?.message ||
        error?.response?.data?.message ||
        "Không thể xóa thành viên khỏi workspace.";
      toast.error(message);
    },
  });

  const handleRemoveSkill = (userId: string, skill: string) => {
    const target = members.find((member) => member.userId === userId);
    const currentSkills = target?.skillTags ?? [];
    updateSkillMutation.mutate({
      userId,
      skillTags: currentSkills.filter((item) => item !== skill),
    });
  };

  const handleAddSkill = (userId: string) => {
    const trimmed = newSkillText.trim();
    if (!trimmed) {
      setAddingSkillToMemberId(null);
      return;
    }
    const target = members.find((member) => member.userId === userId);
    const currentSkills = target?.skillTags ?? [];
    const nextSkills = Array.from(new Set([...currentSkills, trimmed])).slice(0, 20);
    updateSkillMutation.mutate({ userId, skillTags: nextSkills });
    setNewSkillText("");
    setAddingSkillToMemberId(null);
  };

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
  const tabs: { id: WorkspaceTab; label: string; icon: ReactNode }[] = [
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0">
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
                  router.push("/projects?context=workspace");
                }}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[#1f883d] bg-[#2da44e] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#2c974b]"
              >
                <Plus size={15} />
                Tạo dự án
              </button>
              <button
                type="button"
                onClick={() => {
                  selectWorkspace(workspace);
                  router.push(`/ws/${slug}/projects/new-with-ai`);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-medium text-[#24292f] shadow-sm transition hover:bg-[#f6f8fa]"
              >
                <Sparkles size={15} />
                Tạo với AI
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
                      router.push("/projects?context=workspace");
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
              <SidebarCard title="Thông tin workspace">
                <div className="space-y-3 text-sm text-[#57606a]">
              <div className="flex items-center justify-between gap-4">
                <span>Loại</span>
                <span className="font-medium text-[#1f2328]">
                  {workspace.type === "PERSONAL" ? "Personal" : "Organization"}
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
            </div>
              </SidebarCard>

              <SidebarCard
                title="Thành viên"
                action={
                  canManage ? (
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#d0d7de] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#24292f] transition hover:bg-[#f6f8fa]"
                    >
                      <Plus size={12} />
                      Thêm
                    </button>
                  ) : undefined
                }
              >
                {membersLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={18} className="animate-spin text-[#0969da]" />
                  </div>
                ) : members.length === 0 ? (
              <p className="text-sm text-[#57606a]">
                Workspace này chưa có thành viên nào.
              </p>
            ) : (
                  <CompactMemberList members={members} />
                )}
              </SidebarCard>

          <SidebarCard title="Top visibility">
            <div className="flex flex-wrap gap-3 text-sm text-[#57606a]">
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
          </SidebarCard>
        </aside>
          </div>
        )}

        {activeTab === "members" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <main className="min-w-0">
              <div className="mb-4 flex items-center justify-end gap-3">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
                  >
                    <Plus size={15} />
                    Thêm thành viên
                  </button>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-100/80 px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900">Thành viên workspace</h2>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold text-slate-600 shadow-sm">
                      {members.length}
                    </span>
                  </div>
                </div>
                {membersLoading ? (
                  <div className="flex items-center justify-center px-6 py-16">
                    <Loader2 size={24} className="animate-spin text-[#0969da]" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="px-6 py-16 text-center text-sm text-[#57606a]">
                    Workspace này chưa có thành viên nào.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/30">
                          <th className="px-6 py-4 text-xs font-bold text-slate-900">Tên</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-900">Email</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-900">Role</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-900">Skill</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-900">Ngày tham gia</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-slate-900">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {members.map((member) => (
                          <tr key={member.userId} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {member.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={member.avatarUrl}
                                    alt={member.fullName}
                                    className="h-10 w-10 rounded-full border border-slate-100 object-cover shadow-sm"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-sm font-semibold text-slate-700 shadow-sm">
                                    {getInitials(member.fullName)}
                                  </div>
                                )}
                                <div className="text-sm font-bold text-slate-900">{member.fullName}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-slate-600">{member.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <WorkspaceRoleBadge role={member.role} />
                            </td>
                            <td className="min-w-[220px] px-6 py-4">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {(member.skillTags ?? []).map((skill) => (
                                  <span
                                    key={skill}
                                    className={cn(
                                      "flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold",
                                      WORKSPACE_SKILL_COLORS[skill] || "bg-slate-500 text-white"
                                    )}
                                  >
                                    {skill}
                                    {canManageMemberSkills(member.userId) && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSkill(member.userId, skill)}
                                        className="rounded-full p-0.5 transition-colors hover:bg-black/20"
                                      >
                                        <X size={10} strokeWidth={3} />
                                      </button>
                                    )}
                                  </span>
                                ))}
                                {canManageMemberSkills(member.userId) && addingSkillToMemberId === member.userId ? (
                                  <input
                                    autoFocus
                                    value={newSkillText}
                                    onChange={(event) => setNewSkillText(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") handleAddSkill(member.userId);
                                      if (event.key === "Escape") setAddingSkillToMemberId(null);
                                    }}
                                    onBlur={() => handleAddSkill(member.userId)}
                                    className="h-6 w-24 rounded-full border border-blue-300 px-2 py-0 text-[11px] font-bold text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Add..."
                                  />
                                ) : canManageMemberSkills(member.userId) ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddingSkillToMemberId(member.userId);
                                      setNewSkillText("");
                                    }}
                                    className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                  >
                                    <Plus size={12} strokeWidth={3} />
                                  </button>
                                ) : (member.skillTags ?? []).length === 0 ? (
                                  <span className="text-xs text-slate-400">Chưa có skill</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-600">
                                {member.joinedAt ? new Date(member.joinedAt).toISOString().split("T")[0] : "-"}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">{member.activeTaskCount} task mở</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900">
                                    <MoreHorizontal size={18} />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200 p-1 shadow-xl">
                                  <DropdownMenuItem
                                    onClick={() => router.push("/profile")}
                                    className="cursor-pointer rounded-lg py-2 text-sm font-semibold text-slate-700"
                                  >
                                    <Eye size={16} className="mr-2" /> View Profile
                                  </DropdownMenuItem>
                                  {member.userId === currentUserId && workspace.ownerId !== currentUserId && (
                                    <>
                                      <div className="my-1 h-px bg-slate-100" />
                                      <DropdownMenuItem
                                        onClick={() => {
                                          if (confirm(`Bạn có chắc muốn rời workspace ${workspace.name}?`)) {
                                            removeMemberMutation.mutate(member.userId);
                                          }
                                        }}
                                        className="cursor-pointer rounded-lg py-2 text-sm font-semibold text-orange-600 focus:bg-orange-50 focus:text-orange-600"
                                      >
                                        <ArrowLeft size={16} className="mr-2" /> Rời workspace
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {canManage && member.role !== "OWNER" && member.userId !== currentUserId && (
                                    <>
                                      <div className="my-1 h-px bg-slate-100" />
                                      <DropdownMenuItem
                                        onClick={() => {
                                          if (confirm(`Xóa ${member.fullName} khỏi workspace?`)) {
                                            removeMemberMutation.mutate(member.userId);
                                          }
                                        }}
                                        className="cursor-pointer rounded-lg py-2 text-sm font-semibold text-red-600 focus:bg-red-50 focus:text-red-600"
                                      >
                                        <Trash2 size={16} className="mr-2" /> Xóa khỏi workspace
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </main>

            <aside className="space-y-4">
              <SidebarCard
                title="Tóm tắt đội ngũ"
                action={
                  canManage ? (
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#d0d7de] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#24292f] transition hover:bg-[#f6f8fa]"
                    >
                      <Plus size={12} />
                      Mời mới
                    </button>
                  ) : undefined
                }
              >
                <div className="space-y-3 text-sm text-[#57606a]">
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
              </SidebarCard>

              <SidebarCard title="Phân bổ kỹ năng">
                <div className="flex flex-wrap gap-2">
                  {Array.from(
                    new Set(members.flatMap((member) => member.skillTags ?? []))
                  )
                    .slice(0, 8)
                    .map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-[#ddf4ff] px-2.5 py-1 text-xs font-semibold text-[#0969da]"
                      >
                        {skill}
                      </span>
                    ))}
                  {members.every((member) => !(member.skillTags ?? []).length) && (
                    <span className="text-sm text-[#8c959f]">Chưa có skill được khai báo.</span>
                  )}
                </div>
              </SidebarCard>
            </aside>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <main className="min-w-0">
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
                      Owner
                    </div>
                    <div className="mt-2 text-base font-semibold text-[#1f2328]">
                      {workspace.ownerName}
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
              </div>
            </main>

            <aside className="space-y-4">
              <SidebarCard title="Quyền hiện tại">
                <div className="text-sm text-[#57606a]">
                  Bạn đang ở vai trò{" "}
                  <span className="font-semibold text-[#1f2328]">
                    {workspace.role ?? "MEMBER"}
                  </span>{" "}
                  trong workspace này.
                </div>
              </SidebarCard>
            </aside>
          </div>
        )}
      </div>
      <InviteWorkspaceMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        workspaceId={workspace.id}
      />
    </div>
  );
}
