"use client";

import { useEffect, useState } from "react";
import { calculateHoursRemaining } from "@/lib/dateUtils";
import type { ProjectInviteListItem } from "@/app/types/member.schema";

interface InviteTableRowProps {
  invite: ProjectInviteListItem;
  onResend: (inviteId: string) => void;
  onRevoke: (inviteId: string) => void;
  isResending: boolean;
  isRevoking: boolean;
  resendingId?: string;
  revokingId?: string;
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string }> = {
    project_manager: { label: "Quản lý dự án" },
    pm: { label: "Quản lý dự án" },
    member: { label: "Thành viên" },
    viewer: { label: "Người xem" },
    owner: { label: "Chủ sở hữu" },
    system_admin: { label: "Quản trị hệ thống" },
  };
  const cfg = map[String(role || "").toLowerCase()] || map["viewer"];
  return (
    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  if (s === "PENDING") {
    return (
      <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-blue-100 text-blue-600 border border-blue-200 uppercase tracking-tight">
        ĐANG CHỜ
      </span>
    );
  }
  if (s === "DECLINED") {
    return (
      <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-orange-100 text-orange-600 border border-orange-200 uppercase tracking-tight">
        ĐÃ TỪ CHỐI
      </span>
    );
  }
  if (s === "EXPIRED") {
    return (
      <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-400 border border-slate-200 uppercase tracking-tight">
        HẾT HẠN
      </span>
    );
  }
  if (s === "REVOKED") {
    return (
      <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-tight">
        ĐÃ HỦY
      </span>
    );
  }
  if (s === "ACCEPTED") {
    return (
      <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-tight">
        ĐÃ CHẤP NHẬN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tight">
      {s}
    </span>
  );
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
