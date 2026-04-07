"use client";

import { useEffect, useState } from "react";
import { calculateHoursRemaining } from "@/lib/dateUtils";
import type { ProjectInviteListItem } from "@/app/types/member.schema";
import RoleBadge from "@/components/projects/RoleBadge";
import StatusBadge from "@/components/projects/StatusBadge";

interface InviteTableRowProps {
  invite: ProjectInviteListItem;
  onResend: (inviteId: string) => void;
  onRevoke: (inviteId: string) => void;
  isResending: boolean;
  isRevoking: boolean;
  resendingId?: string;
  revokingId?: string;
}

export default function InviteTableRow({
  invite,
  onResend,
  onRevoke,
  isResending,
  isRevoking,
  resendingId,
  revokingId,
}: InviteTableRowProps) {
  const [timeRemaining, setTimeRemaining] = useState<ReturnType<typeof calculateHoursRemaining>>(null);

  // Update time remaining every minute (or more frequently if needed)
  useEffect(() => {
    const updateTime = () => {
      setTimeRemaining(calculateHoursRemaining(invite.expiresAt));
    };

    updateTime(); // Initial update
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [invite.expiresAt]);

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-6 py-4">
        <div className="text-sm font-bold text-slate-900">{invite.email}</div>
      </td>
      <td className="px-6 py-4">
        <RoleBadge role={invite.role} />
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-slate-600">{invite.inviterName || "-"}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-slate-600">{new Date(invite.invitedAt).toLocaleString()}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-slate-600">
          {new Date(invite.expiresAt).toLocaleString()}
          {timeRemaining && (
            <span
              className={`ml-1 ${
                timeRemaining.isExpired ? "text-red-600 font-semibold" : "text-slate-400"
              }`}
            >
              {timeRemaining.display}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={invite.status} />
      </td>
      <td className="px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          {invite.status === "PENDING" && (
            <>
              <button
                onClick={() => onResend(invite.id)}
                disabled={isResending && resendingId === invite.id}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all disabled:opacity-50"
              >
                {isResending && resendingId === invite.id ? "..." : "Gửi lại"}
              </button>
              <button
                onClick={() => onRevoke(invite.id)}
                disabled={isRevoking && revokingId === invite.id}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all disabled:opacity-50"
              >
                {isRevoking && revokingId === invite.id ? "..." : "Hủy"}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
