"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Users } from "lucide-react";

export default function MembersPage() {
  const { id } = useParams();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users size={22} className="text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-800">Thành viên dự án</h1>
        </div>
      </div>

      <p className="text-slate-500 text-sm mb-2">Project ID: {id}</p>

      <div className="mt-8 p-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
        <Users size={36} className="mb-3 text-slate-300" />
        <p className="text-lg font-medium italic">"Members management coming soon..."</p>
      </div>
    </div>
  );
}
