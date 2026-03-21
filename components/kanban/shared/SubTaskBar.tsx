"use client";

import { useMemo } from "react";

interface SubTaskBarProps {
  done: number;
  total: number;
}

export default function SubTaskBar({ done, total }: SubTaskBarProps) {
  const percent = useMemo(() => {
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, (done / total) * 100));
  }, [done, total]);

  if (total <= 0) return null;

  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-[11px] text-slate-500">
        {done}/{total}
      </span>
    </div>
  );
}
