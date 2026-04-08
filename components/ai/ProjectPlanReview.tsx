"use client";

import { useState } from "react";
import {
  FolderKanban,
  List,
  ChevronLeft,
  Loader2,
  Tag,
  User,
  Hash,
  Calendar,
} from "lucide-react";
import type {
  GenerateProjectPlanResponse,
  TaskPlanDto,
  SprintPlanDto,
  MemberOption,
} from "@/app/types/workspace-ai";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = "info" | "sprints" | "tasks";

const PRIORITY_COLOR: Record<string, string> = {
  critical: "text-red-700 bg-red-50 border-red-200",
  high:     "text-orange-700 bg-orange-50 border-orange-200",
  medium:   "text-yellow-700 bg-yellow-50 border-yellow-200",
  low:      "text-slate-600 bg-slate-50 border-slate-200",
};

const TYPE_COLOR: Record<string, string> = {
  story: "text-violet-700 bg-violet-50 border-violet-200",
  bug:   "text-red-700 bg-red-50 border-red-200",
  task:  "text-blue-700 bg-blue-50 border-blue-200",
};

function MemberAvatar({ member }: { member?: MemberOption }) {
  if (!member) return <div className="h-6 w-6 rounded-full bg-slate-200" />;
  return member.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={member.avatarUrl} alt={member.fullName} className="h-6 w-6 rounded-full object-cover" title={member.fullName} />
  ) : (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[9px] font-bold text-white" title={member.fullName}>
      {(member.fullName && typeof member.fullName === 'string' ? member.fullName.slice(0, 2) : "??").toUpperCase()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Project Info
// ─────────────────────────────────────────────────────────────────────────────

function InfoTab({ plan }: { plan: GenerateProjectPlanResponse }) {
  const p = plan.project;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white shadow-sm">
            {p.projectKey}
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{p.name}</h3>
            <p className="text-xs text-slate-500">{p.estimatedWeeks} weeks</p>
          </div>
        </div>
        {p.description && (
          <p className="text-sm leading-relaxed text-slate-600">{p.description}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Calendar,     label: "Sprints",      value: plan.sprints.length },
          { icon: List,         label: "Tasks",        value: plan.totalTasks },
          { icon: Hash,         label: "Story points", value: plan.totalStoryPoints },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-4 text-center">
            <Icon size={18} className="mb-1 text-slate-400" />
            <p className="text-xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Sprint Timeline
// ─────────────────────────────────────────────────────────────────────────────

function SprintsTab({ sprints }: { sprints: SprintPlanDto[] }) {
  return (
    <div className="space-y-3">
      {sprints.map((sprint, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800">{sprint.name}</p>
              <p className="text-xs text-slate-500">Weeks {sprint.weekStart}-{sprint.weekEnd}</p>
            </div>
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {sprint.tasks?.length ?? 0} tasks
            </span>
          </div>
          {sprint.goal && (
            <p className="ml-10 text-xs italic text-slate-400">{sprint.goal}</p>
          )}

          {/* Sprint progress bar placeholder */}
          <div className="ml-10 mt-3 h-1.5 rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-blue-600"
              style={{ width: `${Math.min(100, ((sprint.tasks?.length ?? 0) / 6) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Task List
// ─────────────────────────────────────────────────────────────────────────────

function TasksTab({
  sprints,
  members,
  onEdit,
}: {
  sprints: SprintPlanDto[];
  members: MemberOption[];
  onEdit: (sprintIdx: number, taskIdx: number, patch: Partial<TaskPlanDto>) => void;
}) {
  const memberMap = Object.fromEntries(members.map((m) => [m.userId, m]));

  return (
    <div className="space-y-6">
      {sprints.map((sprint, si) => (
        <div key={si}>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-[10px] font-bold text-blue-700">
              {si + 1}
            </div>
            <span className="text-xs font-semibold text-slate-600">{sprint.name}</span>
          </div>

          <div className="space-y-2">
            {(sprint.tasks ?? []).map((task, ti) => {
              const assignee = task.suggestedAssigneeId ? memberMap[task.suggestedAssigneeId] : undefined;
              return (
                <div key={ti} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start gap-3">
                    {/* Editable title */}
                    <input
                      className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-slate-800 outline-none hover:border-slate-200 focus:border-blue-300 focus:bg-blue-50"
                      value={task.title}
                      onChange={(e) => onEdit(si, ti, { title: e.target.value })}
                    />
                    <MemberAvatar member={assignee} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {/* Type */}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", TYPE_COLOR[task.type] ?? TYPE_COLOR.task)}>
                      {task.type}
                    </span>

                    {/* Priority (editable) */}
                    <select
                      value={task.priority}
                      onChange={(e) => onEdit(si, ti, { priority: e.target.value as TaskPlanDto["priority"] })}
                      className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase cursor-pointer outline-none", PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium)}
                    >
                      {["critical", "high", "medium", "low"].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>

                    {/* Story points (editable) */}
                    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                      <Hash size={9} className="text-slate-400" />
                      <input
                        type="number"
                        min={1}
                        max={13}
                        value={task.storyPoints}
                        onChange={(e) => onEdit(si, ti, { storyPoints: parseInt(e.target.value) || 1 })}
                        className="w-8 bg-transparent text-[10px] font-semibold text-slate-600 outline-none"
                      />
                      <span className="text-[9px] text-slate-400">SP</span>
                    </div>

                    {/* Skill tags */}
                    {task.skillTagsRequired?.slice(0, 2).map((tag) => (
                      <span key={tag} className="flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        <Tag size={8} />
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Assignee name */}
                  {assignee ? (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                      <User size={9} />
                      {assignee.fullName}
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[10px] text-amber-600">
                      No suitable assignee identified from the current member skill data yet.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProjectPlanReview — main export
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectPlanReviewProps {
  plan: GenerateProjectPlanResponse;
  members: MemberOption[];
  onConfirm: (plan: GenerateProjectPlanResponse) => void;
  onBack: () => void;
  isConfirming: boolean;
}

export default function ProjectPlanReview({
  plan: initialPlan,
  members,
  onConfirm,
  onBack,
  isConfirming,
}: ProjectPlanReviewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [plan, setPlan] = useState<GenerateProjectPlanResponse>(initialPlan);

  const handleTaskEdit = (si: number, ti: number, patch: Partial<TaskPlanDto>) => {
    setPlan((prev) => {
      const sprints = prev.sprints.map((s, i) => {
        if (i !== si) return s;
        return {
          ...s,
          tasks: s.tasks.map((t, j) => (j === ti ? { ...t, ...patch } : t)),
        };
      });
      return { ...prev, sprints };
    });
  };

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "info",    label: "Overview", icon: FolderKanban },
    { key: "sprints", label: "Sprint structure", icon: Calendar },
    { key: "tasks",   label: `Work items (${plan.totalTasks})`, icon: List },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition",
              activeTab === key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === "info"    && <InfoTab    plan={plan} />}
        {activeTab === "sprints" && <SprintsTab sprints={plan.sprints} />}
        {activeTab === "tasks"   && (
          <TasksTab sprints={plan.sprints} members={members} onEdit={handleTaskEdit} />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ChevronLeft size={15} />
          Back
        </button>
        <button
          type="button"
          onClick={() => onConfirm(plan)}
          disabled={isConfirming}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {isConfirming ? <Loader2 size={15} className="animate-spin" /> : null}
          {isConfirming ? "Creating project..." : "Create project"}
        </button>
      </div>
    </div>
  );
}
