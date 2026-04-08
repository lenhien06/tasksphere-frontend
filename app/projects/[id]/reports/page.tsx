"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
import ReportsPage from "@/components/projects/ReportsPage";

export default function ReportsRoutePage() {
  const params = useParams();
  const projectId = params.id as string;

  const { data: projectRes } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => ProjectService.getById(projectId),
    enabled: !!projectId,
  });

  const project = projectRes?.data;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#F5F5F5] p-8">
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
              <Link href={`/projects/${projectId}`} className="text-[#8C8C8C] hover:text-[#141414]">
                {project?.name ?? "Project"}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-[#D9D9D9]" />
          <BreadcrumbItem className="text-sm">
            <BreadcrumbPage className="font-medium text-[#141414]">Reports</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#141414]">Reports</h1>
        <p className="mt-1 text-base text-[#555]">
          Review sprint burndown, scope growth, and delivery capacity from one reporting hub.
        </p>
      </div>

      <ReportsPage projectId={projectId} />
    </div>
  );
}
