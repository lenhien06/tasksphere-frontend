"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Download } from "lucide-react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ProjectService } from "@/app/services/ProjectService";
import { TaskService } from "@/app/services/TaskService";
import ReportsPage from "@/components/projects/ReportsPage";
import { usePermission } from "@/hooks/usePermission";

const TAB_KEYS = ["overview", "burndown", "velocity", "members"] as const;
type TabKey = typeof TAB_KEYS[number];

export default function ReportsRoutePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const { isViewer } = usePermission(projectId);

  // Read URL state
  const tabParam = (searchParams.get("tab") ?? "overview") as TabKey;
  const sprintParam = searchParams.get("sprintId") ?? "";

  const activeTabIndex = Math.max(0, TAB_KEYS.indexOf(tabParam));

  const [showExportModal, setShowExportModal] = useState(false);

  const { data: projectRes } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => ProjectService.getById(projectId),
    enabled: !!projectId,
  });
  const project = projectRes?.data;

  const { data: sprints = [] } = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: () => TaskService.getSprints(projectId),
    enabled: !!projectId,
  });

  // Default to active sprint on first load
  useEffect(() => {
    if (sprints.length > 0 && !searchParams.get("sprintId")) {
      const activeSprint = sprints.find(s => s.status === "ACTIVE");
      if (activeSprint) {
        const next = new URLSearchParams(searchParams.toString());
        next.set("sprintId", activeSprint.id);
        router.replace(`?${next.toString()}`, { scroll: false });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprints]);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleTabChange = (index: number) => {
    updateParam("tab", TAB_KEYS[index]);
  };

  const handleSprintChange = (sprintId: string) => {
    updateParam("sprintId", sprintId || null);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#F5F5F5] p-8">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem className="text-sm">
            <BreadcrumbLink asChild>
              <Link href="/projects" className="text-[#8C8C8C] hover:text-[#141414]">
                Projects
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-[#D9D9D9]" />
          <BreadcrumbItem className="text-sm">
            <BreadcrumbLink asChild>
              <Link
                href={`/projects/${projectId}`}
                className="text-[#8C8C8C] hover:text-[#141414]"
              >
                {project?.name ?? "Project"}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-[#D9D9D9]" />
          <BreadcrumbItem className="text-sm">
            <BreadcrumbPage className="text-[#141414] font-medium">Reports</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#141414]">Reports & Analytics</h1>
          <p className="text-base text-[#555] mt-1">
            Track progress, project performance, and task distribution.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Sprint Selector */}
          <div className="relative">
            <select
              value={sprintParam}
              onChange={(e) => handleSprintChange(e.target.value)}
              className="h-10 pl-4 pr-10 border border-[#D9D9D9] rounded-lg text-sm
                         outline-none bg-white min-w-[240px] appearance-none cursor-pointer font-medium"
            >
              <option value="">All sprints</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  Sprint: {s.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          {/* Export Button — hidden for viewers */}
          {!isViewer && (
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 h-10 px-5
                         border border-[#1677FF] rounded-lg text-sm
                         text-[#1677FF] hover:bg-blue-50 transition-all bg-white font-bold"
            >
              <Download size={16} />
              Export
            </button>
          )}
        </div>
      </div>

      <ReportsPage
        projectId={projectId}
        sprintId={sprintParam || undefined}
        activeTab={activeTabIndex}
        onTabChange={handleTabChange}
        showExportModal={showExportModal}
        onCloseExportModal={() => setShowExportModal(false)}
      />
    </div>
  );
}
