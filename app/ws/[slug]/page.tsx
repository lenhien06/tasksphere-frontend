"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Building2 } from "lucide-react";
import { WorkspaceService } from "@/app/services/workspace.service";
import { Workspace } from "@/app/types/workspace.schema";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function WorkspaceDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { selectWorkspace } = useWorkspace();

  const {
    data: wsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["workspace", slug],
    queryFn: () => WorkspaceService.getBySlug(slug),
    staleTime: 2 * 60 * 1000,
  });

  const workspace = wsData?.data as Workspace | undefined;

  useEffect(() => {
    if (!workspace) return;
    selectWorkspace(workspace);
    router.replace("/projects");
  }, [router, selectWorkspace, workspace]);

  if (isError) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <Building2 size={48} className="mx-auto mb-4 text-slate-300" />
        <h2 className="text-lg font-semibold text-slate-700">Workspace không tồn tại</h2>
        <p className="mt-1 text-sm text-slate-400">
          Kiểm tra lại đường dẫn hoặc liên hệ OWNER.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-20">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
        <Loader2 size={28} className="mx-auto mb-3 animate-spin text-blue-500" />
        <p className="text-sm font-semibold text-slate-700">
          Đang mở dashboard của workspace...
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {isLoading ? "Đang tải workspace" : workspace?.name}
        </p>
      </div>
    </div>
  );
}
