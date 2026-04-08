"use client";

import { Plus, ClipboardList, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

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
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-slate-800"
        >
          <ClipboardList size={15} />
          Plan tasks
        </button>
      ) : null}

      {canUseAi && onAiAssign ? (
        <button
          type="button"
          onClick={onAiAssign}
          className="flex items-center gap-1.5 rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-slate-800"
        >
          <Users size={15} />
          Recommend assignments
        </button>
      ) : null}
    </div>
  );
}
