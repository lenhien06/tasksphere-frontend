"use client";

import { useParams, useRouter } from "next/navigation";
import ProjectDetailPage from "@/components/projects/ProjectDetailPage";

export default function ProjectDetailRoute() {
  const params = useParams();
  const router = useRouter();

  return (
    <ProjectDetailPage
      projectId={params.id as string}
      onBack={() => router.push("/projects")}
    />
  );
}
