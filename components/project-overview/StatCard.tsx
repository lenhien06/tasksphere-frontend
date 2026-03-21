"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaConfig {
  value: number | null;
  invertGood?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  clickable?: boolean;
  onClick?: () => void;
  delta?: DeltaConfig;
  rightAdornment?: React.ReactNode;
  bottomContent?: React.ReactNode;
}

function renderDelta(delta?: DeltaConfig) {
  if (!delta || delta.value === null) return null;
  if (delta.value === 0) return <span className="text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100">0</span>;

  const good = delta.invertGood ? delta.value < 0 : delta.value > 0;
  const color = good ? "text-green-600" : "text-red-500";
  const Arrow = delta.value > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full", color, good ? "bg-green-50" : "bg-red-50")}>
      <Arrow size={13} />
      {delta.value > 0 ? `+${delta.value}` : delta.value}
    </span>
  );
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  clickable,
  onClick,
  delta,
  rightAdornment,
  bottomContent,
}: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left bg-white rounded-xl border border-gray-200 p-2.5 shadow-sm transition",
        clickable ? "hover:shadow-sm hover:border-blue-200 cursor-pointer" : "cursor-default"
      )}
      disabled={!clickable}
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <div className="h-6 w-6 rounded-md grid place-items-center bg-gray-50">{icon}</div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          {renderDelta(delta)}
          {rightAdornment}
        </div>
      </div>

      <div className="mt-1.5">
        <div className="mt-0.5 text-[26px] sm:text-[30px] leading-none font-bold text-gray-900">{value}</div>
        <div className="mt-0.5 text-[11px] text-gray-400">{subtitle}</div>
      </div>
      {bottomContent ? <div className="mt-2">{bottomContent}</div> : null}
    </button>
  );
}
