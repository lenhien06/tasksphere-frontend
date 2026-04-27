"use client";

import { Plus, ClipboardList, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const AI_ACTION_BUTTON_CLASSNAME =
  "relative isolate overflow-hidden rounded-xl border border-cyan-200/70 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_22%,#7c3aed_52%,#ec4899_80%,#f59e0b_100%)] px-4 py-2 text-sm font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.14)_inset,0_10px_24px_rgba(14,165,233,0.26),0_0_24px_rgba(168,85,247,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.24)_inset,0_16px_34px_rgba(14,165,233,0.34),0_0_34px_rgba(236,72,153,0.26)] before:absolute before:inset-[1px] before:rounded-[11px] before:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.32),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03))] before:content-[''] after:absolute after:-inset-x-10 after:top-0 after:h-full after:-skew-x-12 after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.26),transparent)] after:opacity-0 after:transition-opacity after:duration-300 after:content-[''] hover:after:opacity-100";

interface TaskPrimaryActionsProps {
  canCreateTask: boolean;
  canUseAi: boolean;
  onCreateTask: () => void;
  onAiGenerate?: () => void;
  onAiAssign?: () => void;
}

export default function TaskPrimaryActions({
  canCreateTask,
  canUseAi,
  onCreateTask,
  onAiGenerate,
  onAiAssign,
}: TaskPrimaryActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canCreateTask ? (
        <button
          type="button"
          onClick={onCreateTask}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700"
        >
          <Plus size={16} strokeWidth={3} />
          {t("backlog.createTaskCta")}
        </button>
      ) : null}

      {canUseAi && onAiGenerate ? (
        <button
          type="button"
          onClick={onAiGenerate}
          className={`${AI_ACTION_BUTTON_CLASSNAME} flex items-center gap-1.5`}
        >
          <ClipboardList className="relative z-10" size={15} />
          <span className="relative z-10">Plan tasks</span>
        </button>
      ) : null}

      {canUseAi && onAiAssign ? (
        <button
          type="button"
          onClick={onAiAssign}
          className={`${AI_ACTION_BUTTON_CLASSNAME} flex items-center gap-1.5`}
        >
          <Users className="relative z-10" size={15} />
          <span className="relative z-10">Recommend assignments</span>
        </button>
      ) : null}
    </div>
  );
}
