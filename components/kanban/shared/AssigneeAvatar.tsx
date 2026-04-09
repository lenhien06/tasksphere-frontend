"use client";

import { useTranslation } from "react-i18next";

interface Assignee {
  id?: string;
  fullName: string;
  avatarUrl: string | null;
}

interface AssigneeAvatarProps {
  assignee: Assignee | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AssigneeAvatar({ assignee }: AssigneeAvatarProps) {
  const { t } = useTranslation();

  if (!assignee) {
    return (
      <div
        title={t("task.unassigned", { defaultValue: "Unassigned" })}
        className="h-6 w-6 rounded-full border border-dashed border-gray-300 bg-white text-gray-400 grid place-items-center text-[10px] font-medium leading-none"
      >
        ?
      </div>
    );
  }

  if (!assignee.avatarUrl) {
    return (
      <div
        title={assignee.fullName}
        className="h-6 w-6 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px] font-semibold"
      >
        {getInitials(assignee.fullName)}
      </div>
    );
  }

  return (
    <img
      src={assignee.avatarUrl}
      alt={assignee.fullName}
      title={assignee.fullName}
      className="h-6 w-6 rounded-full object-cover border border-gray-200"
    />
  );
}
