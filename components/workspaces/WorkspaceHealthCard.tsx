"use client";

import { Workspace, WorkspaceHealthMetrics, WorkspaceRole } from "@/app/types/workspace.schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AlertTriangle, Activity, ArrowRight, ShieldAlert, Users } from "lucide-react";

const ROLE_STYLES: Record<WorkspaceRole, string> = {
  OWNER: "border-sky-200 bg-sky-50 text-sky-700",
  ADMIN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEMBER: "border-slate-200 bg-slate-100 text-slate-600",
};

function getInitials(name?: string | null) {
  return (name?.trim().slice(0, 2) || "WS").toUpperCase();
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
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-12 w-12 rounded-2xl border border-slate-200 bg-slate-50">
            <AvatarImage src={workspace.avatarUrl ?? undefined} alt={workspace.name} />
            <AvatarFallback className="rounded-2xl bg-slate-100 text-sm font-bold text-slate-700">
              {getInitials(workspace.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <button
              type="button"
              onClick={onOpenWorkspace}
              className="truncate text-left text-lg font-bold tracking-tight text-slate-950 hover:text-blue-700"
            >
              {workspace.name}
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", ROLE_STYLES[role])}>
                {role}
              </span>
              <span className="text-xs text-slate-500">/{workspace.slug}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Members</div>
          <div className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
            <Users className="h-4 w-4 text-slate-400" />
            {workspace.memberCount}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Global Progress
            </div>
            <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              {Math.round(progress)}%
            </div>
          </div>
          <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Tổng Task
            </div>
            <div className="mt-1 text-lg font-bold text-slate-900">{metrics?.totalTaskCount ?? 0}</div>
          </div>
        </div>
        <Progress value={progress} className="mt-4 h-3 rounded-full bg-slate-200 [&>div]:bg-gradient-to-r [&>div]:from-blue-600 [&>div]:to-cyan-500" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          {overdueCount} Task quá hạn
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
          <ShieldAlert className="h-3.5 w-3.5" />
          {riskyProjectCount} Dự án rủi ro
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
          <Activity className="h-3.5 w-3.5" />
          {workspace.projectCount} dự án
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex -space-x-2">
          {(memberPreview.length > 0 ? memberPreview : [{ userId: workspace.ownerId, fullName: workspace.ownerName, avatarUrl: null, role }]).slice(0, 4).map((member) => (
            <Avatar key={member.userId} className="h-9 w-9 border-2 border-white shadow-sm">
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
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Khám sức khỏe
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
