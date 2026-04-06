"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Sparkles, Users } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export default function MembersPage() {
  const { id } = useParams();
  const router = useRouter();
  const { currentWorkspace, currentSlug } = useWorkspace();

  const handleAiClick = () => {
    if (currentWorkspace && currentSlug) {
      router.push(`/ws/${currentSlug}/projects/new-with-ai`);
    } else {
      toast.info("Tính năng này yêu cầu bạn đang ở trong một Workspace. Tạo Workspace trước nhé!");
      router.push("/workspaces/new");
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users size={22} className="text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-800">Thành viên dự án</h1>
        </div>
        <button
          type="button"
          onClick={handleAiClick}
          className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
        >
          <Sparkles size={15} />
          Tạo dự án mới với AI
        </button>
      </div>

      <p className="text-slate-500 text-sm mb-2">Project ID: {id}</p>

      <div className="mt-8 p-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
        <Users size={36} className="mb-3 text-slate-300" />
        <p className="text-lg font-medium italic">"Members management coming soon..."</p>
      </div>
    </div>
  );
}
