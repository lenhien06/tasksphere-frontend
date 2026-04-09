"use client";

import { Workspace, WorkspaceHealthMetrics, WorkspaceRole } from "@/app/types/workspace.schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

const ROLE_STYLES: Record<WorkspaceRole, string> = {
  OWNER: "border-sky-200 bg-sky-50 text-sky-700",
  ADMIN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEMBER: "border-slate-200 bg-slate-100 text-slate-600",
};

function getInitials(name?: string | null) {
  return (name?.trim().slice(0, 2) || "WS").toUpperCase();
}

function roleLabel(role: WorkspaceRole) {
  if (role === "OWNER") return "Owner";
  if (role === "ADMIN") return "Admin";
  return "Member";
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function WorkspaceHealthCard({
  workspace,
  metrics,
  onOpenHealth,
  onOpenWorkspace,
}: {
  workspace: Workspace;
  metrics?: WorkspaceHealthMetrics | null;
  onOpenHealth: () => void;
  onOpenWorkspace: () => void;
}) {
  const role = workspace.role ?? "MEMBER";
  const progress = metrics?.globalProgress ?? 0;
  const overdueCount = metrics?.overdueTaskCount ?? 0;
  const riskyProjectCount = metrics?.riskyProjectCount ?? 0;
  const memberPreview = metrics?.memberPreview ?? [];

  return (
    <article className="rounded-[15px] border border-slate-200 bg-white p-3.5 shadow-[0_12px_36px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="h-11 w-11 rounded-[11px] border border-slate-200 bg-slate-50">
            <AvatarImage src={workspace.avatarUrl ?? undefined} alt={workspace.name} />
            <AvatarFallback className="rounded-[11px] bg-slate-100 text-sm font-bold text-slate-700">
              {getInitials(workspace.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onOpenWorkspace}
              className="line-clamp-2 text-left text-[18px] font-bold leading-tight tracking-tight text-slate-950 hover:text-blue-700"
            >
              {workspace.name}
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", ROLE_STYLES[role])}>
                {roleLabel(role)}
              </span>
              <span className="break-all text-xs text-slate-500">/{workspace.slug}</span>
            </div>
          </div>
        </div>

        <div className="flex min-w-[92px] shrink-0 items-center justify-between gap-2 rounded-[11px] border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="whitespace-nowrap text-[11px] font-medium text-slate-500">Members</div>
          <div className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-700">
            {workspace.memberCount}
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-slate-500">
              Portfolio progress ({metrics?.doneTaskCount ?? 0}/{metrics?.totalTaskCount ?? 0} tasks)
            </div>
          </div>
          <div className="whitespace-nowrap text-[26px] leading-none font-extrabold tracking-tight tabular-nums text-slate-950">
            {Math.round(progress)}%
          </div>
        </div>
        <Progress value={progress} className="mt-2.5 h-2.5 rounded-full bg-slate-200 [&>div]:bg-gradient-to-r [&>div]:from-blue-600 [&>div]:to-cyan-500" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700">
          {pluralize(overdueCount, "overdue task")}
        </span>
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
          {pluralize(riskyProjectCount, "project")} at risk
        </span>
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
          {pluralize(workspace.projectCount, "project")}
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex -space-x-2">
          {(memberPreview.length > 0 ? memberPreview : [{ userId: workspace.ownerId, fullName: workspace.ownerName, avatarUrl: null, role }]).slice(0, 4).map((member) => (
            <Avatar key={member.userId} className="h-8 w-8 border-2 border-white shadow-sm">
              <AvatarImage src={member.avatarUrl ?? undefined} alt={member.fullName} />
              <AvatarFallback className="bg-slate-200 text-[11px] font-bold text-slate-700">
                {getInitials(member.fullName)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenHealth}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 whitespace-nowrap rounded-[12px] bg-[#4f6bed] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(79,107,237,0.28)] transition hover:bg-[#4057d6]"
        >
          Open health view
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
