"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, FolderPlus, PlayCircle, Sparkles, SquareKanban } from "lucide-react";

interface DashboardEmptyStateProps {
  userName: string;
  onCreateProject: () => void;
  onOpenProjects: () => void;
}

export function DashboardEmptyState({
  userName,
  onCreateProject,
  onOpenProjects,
}: DashboardEmptyStateProps) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardContent className="relative p-8 md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,_rgba(248,250,252,0.9),_rgba(255,255,255,1))]" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-[28px] border border-sky-100 bg-sky-50 text-sky-700 shadow-sm">
            <Sparkles className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Welcome to TaskSphere, {userName}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Your workspace is ready. Start with a project, add your first tasks, and invite the
            team when you are ready to collaborate.
          </p>

          <div className="mt-8 grid w-full gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={onCreateProject}
              className="rounded-3xl border border-sky-200 bg-sky-600 p-6 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-sky-700"
            >
              <FolderPlus className="h-6 w-6" />
              <div className="mt-6 text-xl font-semibold">Create Project</div>
              <p className="mt-2 text-sm text-sky-100">
                Set up the first space for your tasks, milestones, and team.
              </p>
            </button>

            <button
              type="button"
              onClick={onOpenProjects}
              className="rounded-3xl border border-slate-200 bg-white p-6 text-left text-slate-950 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-slate-300"
            >
              <SquareKanban className="h-6 w-6 text-violet-600" />
              <div className="mt-6 text-xl font-semibold">Join Project</div>
              <p className="mt-2 text-sm text-slate-600">
                Open the project area to accept invites or jump into an existing workspace.
              </p>
            </button>

            <button
              type="button"
              onClick={onOpenProjects}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left text-slate-950 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-slate-300"
            >
              <PlayCircle className="h-6 w-6 text-emerald-600" />
              <div className="mt-6 text-xl font-semibold">Create First Task</div>
              <p className="mt-2 text-sm text-slate-600">
                Once you are inside a project, create your first task and start assigning work.
              </p>
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
            <span>1. Create project</span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <span>2. Add tasks</span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <span>3. Assign team</span>
          </div>

          <div className="mt-8">
            <Button
              variant="outline"
              size="md"
              radius="full"
              className="border-slate-200 bg-white"
              onClick={onOpenProjects}
            >
              Open workspace
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
