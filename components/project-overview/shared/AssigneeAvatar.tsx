"use client";

interface AssigneeAvatarProps {
  assignee: {
    fullName: string;
    avatarUrl: string | null;
  } | null;
  size?: number;
}

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function AssigneeAvatar({ assignee, size = 24 }: AssigneeAvatarProps) {
  const px = `${size}px`;

  if (!assignee) {
    return (
      <div
        title="Unassigned"
        className="rounded-full border border-dashed border-gray-300 text-gray-300 grid place-items-center text-xs"
        style={{ width: px, height: px }}
      >
        ?
      </div>
    );
  }

  if (!assignee.avatarUrl) {
    return (
      <div
        title={assignee.fullName}
        className="rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px] font-semibold ring-1 ring-white"
        style={{ width: px, height: px }}
      >
        {initials(assignee.fullName)}
      </div>
    );
  }

  return (
    <img
      src={assignee.avatarUrl}
      alt={assignee.fullName}
      title={assignee.fullName}
      className="rounded-full object-cover ring-1 ring-white"
      style={{ width: px, height: px }}
    />
  );
}
