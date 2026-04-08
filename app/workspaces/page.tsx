"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Building2, Loader2, Plus } from "lucide-react";

import { WorkspaceService } from "@/app/services/workspace.service";
import {
  type Workspace,
  type WorkspaceHealthMetrics,
} from "@/app/types/workspace.schema";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import WorkspaceHealthCard from "@/components/workspaces/WorkspaceHealthCard";
import HealthCheckDrawer from "@/components/workspaces/HealthCheckDrawer";

function DashboardHero({
  totalWorkspaces,
  totalOverdue,
  totalRisks,
}: {
  totalWorkspaces: number;
  totalOverdue: number;
  totalRisks: number;
}) {
  return (
    <section className="rounded-[16px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_34%),linear-gradient(135deg,_#ffffff,_#f4f7fc)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="max-w-3xl pr-0 xl:pr-8">
          <div className="text-[12px] font-medium text-slate-500">
            Workspace portfolio
          </div>
          <h1 className="mt-4 text-[28px] font-black tracking-tight text-slate-950 sm:text-[34px]">
            Operational visibility across workspaces
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Monitor execution progress, delivery risk, and resource pressure across the organization
            from one executive dashboard.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="min-w-[156px] rounded-[14px] border border-white/80 bg-white/90 px-5 py-4 shadow-sm">
            <div className="whitespace-nowrap text-[12px] font-medium text-slate-500">Workspaces</div>
            <div className="mt-2 whitespace-nowrap text-3xl font-black tabular-nums text-slate-950">{totalWorkspaces}</div>
          </div>
          <div className="min-w-[168px] rounded-[14px] border border-amber-100 bg-amber-50/90 px-5 py-4 shadow-sm">
            <div className="whitespace-nowrap text-[12px] font-medium text-amber-700">Projects at risk</div>
            <div className="mt-2 whitespace-nowrap text-3xl font-black tabular-nums text-amber-700">{totalRisks}</div>
          </div>
          <div className="min-w-[168px] rounded-[14px] border border-rose-100 bg-rose-50/90 px-5 py-4 shadow-sm">
            <div className="whitespace-nowrap text-[12px] font-medium text-rose-700">Overdue tasks</div>
            <div className="mt-2 whitespace-nowrap text-3xl font-black tabular-nums text-rose-700">{totalOverdue}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function WorkspaceListPage() {
  const router = useRouter();
  const { selectWorkspace } = useWorkspace();
  const [drawerWorkspace, setDrawerWorkspace] = useState<Workspace | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-workspaces"],
    queryFn: () => WorkspaceService.getMyWorkspaces(),
    staleTime: 2 * 60 * 1000,
  });

  const workspaces: Workspace[] = (data?.data as Workspace[]) ?? [];
  const organizationWorkspaces = workspaces.filter((workspace) => workspace.type !== "PERSONAL");

  const healthQueries = useQueries({
    queries: organizationWorkspaces.map((workspace) => ({
      queryKey: ["workspace-health", workspace.id],
      queryFn: () => WorkspaceService.getHealthMetrics(workspace.id),
      staleTime: 5 * 60 * 1000,
      enabled: organizationWorkspaces.length > 0,
    })),
  });

  const healthByWorkspaceId = useMemo(() => {
    const entries = organizationWorkspaces.map((workspace, index) => {
      const metrics = healthQueries[index]?.data?.data as WorkspaceHealthMetrics | undefined;
      return [workspace.id, metrics ?? null] as const;
    });
    return new Map<string, WorkspaceHealthMetrics | null>(entries);
  }, [organizationWorkspaces, healthQueries]);

  const totals = useMemo(() => {
    return organizationWorkspaces.reduce(
      (acc, workspace) => {
        const metrics = healthByWorkspaceId.get(workspace.id);
        acc.workspaces += 1;
        acc.overdue += metrics?.overdueTaskCount ?? 0;
        acc.risky += metrics?.riskyProjectCount ?? 0;
        return acc;
      },
      { workspaces: 0, overdue: 0, risky: 0 }
    );
  }, [organizationWorkspaces, healthByWorkspaceId]);

  const drawerMetrics = drawerWorkspace ? healthByWorkspaceId.get(drawerWorkspace.id) ?? null : null;

  return (
    <>
      <div className="mx-auto w-full max-w-[1680px] space-y-6 px-4 pb-8 pt-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[12px] font-medium text-slate-500">
              Organization overview
            </div>
            <h1 className="mt-2 text-[28px] font-black tracking-tight text-slate-950 sm:text-[32px]">
              Workspaces
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review delivery health, portfolio exposure, and team capacity without opening each workspace
              one by one.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/workspaces/new")}
            className="inline-flex items-center gap-2 rounded-[14px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create workspace
          </button>
        </div>

        <DashboardHero
          totalWorkspaces={totals.workspaces}
          totalOverdue={totals.overdue}
          totalRisks={totals.risky}
        />

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-[#0969da]" />
          </div>
        )}

        {isError && (
          <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
            Unable to load workspaces. Please try again.
          </div>
        )}

        {!isLoading && !isError && organizationWorkspaces.length === 0 && (
          <div className="rounded-[16px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <Building2 size={42} className="mx-auto mb-3 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-950">No organization workspace found</h2>
            <p className="mt-2 text-sm text-slate-500">
              Create your first workspace to start monitoring delivery health and team capacity.
            </p>
            <button
              type="button"
              onClick={() => router.push("/workspaces/new")}
              className="mt-5 inline-flex items-center gap-2 rounded-[12px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create your first workspace
            </button>
          </div>
        )}

        {!isLoading && !isError && organizationWorkspaces.length > 0 && (
          <section className="space-y-4">
            <div className="text-sm font-semibold text-slate-800">
              Workspace health cards
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {organizationWorkspaces.map((workspace) => (
                <WorkspaceHealthCard
                  key={workspace.id}
                  workspace={workspace}
                  metrics={healthByWorkspaceId.get(workspace.id)}
                  onOpenHealth={() => {
                    setDrawerWorkspace(workspace);
                    setDrawerOpen(true);
                  }}
                  onOpenWorkspace={() => {
                    selectWorkspace(workspace);
                    router.push(`/ws/${workspace.slug}`);
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <HealthCheckDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        workspace={drawerWorkspace}
        metrics={drawerMetrics}
      />
    </>
  );
}
