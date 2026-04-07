"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CalendarDays, ChevronRight, FolderGit2, Globe, Info, Landmark, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ProjectService } from "@/app/services/ProjectService";
import { ProjectRequest, ProjectVisibilityEnum } from "@/app/types/project..schema";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";

const CreateProjectPageSchema = z
  .object({
    name: z
      .string()
      .min(1, "Project name is required")
      .max(255, "Project name must not exceed 255 characters"),
    projectKey: z.string().max(10, "Project key must not exceed 10 characters"),
    description: z.string().optional().nullable(),
    visibility: ProjectVisibilityEnum.default("private"),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const projectKey = (data.projectKey || "").trim();
    const hasInvalidProjectKeyChar = /[^A-Z0-9]/.test(projectKey);

    if (hasInvalidProjectKeyChar) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["projectKey"],
        message: "Chỉ được dùng chữ in hoa và số",
      });
    } else if (projectKey.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["projectKey"],
        message: "Project Key phải có ít nhất 2 ký tự",
      });
    }

    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      if (endDate <= startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endDate"],
          message: "Ngày kết thúc phải sau ngày bắt đầu",
        });
      }
    }
  });

type CreateProjectPageValues = z.infer<typeof CreateProjectPageSchema>;

const visibilityOptions: Array<{
  id: "private" | "internal" | "public";
  label: string;
  description: string;
  icon: typeof Lock;
}> = [
  {
    id: "private",
    label: "Private",
    description: "Only project members can view and collaborate on this project.",
    icon: Lock,
  },
  {
    id: "internal",
    label: "Internal",
    description: "Visible within your organization for internal collaboration.",
    icon: Landmark,
  },
  {
    id: "public",
    label: "Public",
    description: "Visible to everyone in the system.",
    icon: Globe,
  },
];

function buildProjectKey(name: string) {
  return (name || "")
    .trim()
    .split(/\s+/)
    .map((word) => word[0] || "")
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
}

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser({ required: false });
  const { selectedContext, organizationWorkspaces } = useWorkspace();

  const requestedWorkspaceId = searchParams.get("workspaceId");

  const targetWorkspace = useMemo(() => {
    if (requestedWorkspaceId) {
      return (
        organizationWorkspaces.find((workspace) => workspace.id === requestedWorkspaceId) ??
        null
      );
    }
    return selectedContext.kind === "workspace" ? selectedContext.workspace : null;
  }, [organizationWorkspaces, requestedWorkspaceId, selectedContext]);

  const ownerLabel =
    currentUser?.fullName?.trim() ||
    currentUser?.displayName?.trim() ||
    currentUser?.email?.split("@")[0] ||
    "Current user";

  const form = useForm<CreateProjectPageValues>({
    resolver: zodResolver(CreateProjectPageSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      projectKey: "",
      description: "",
      visibility: "private",
      startDate: null,
      endDate: null,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isValid },
  } = form;

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === "name") {
        const currentKey = getValues("projectKey");
        if (!currentKey || currentKey.length <= 3) {
          setValue("projectKey", buildProjectKey(value.name || ""), { shouldValidate: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [getValues, setValue, watch]);

  const createMutation = useMutation({
    mutationFn: ProjectService.create,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "me"] });
      toast.success(`Project "${response.data.name}" created successfully!`);
      router.push(`/projects/${response.data.id}`);
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const message = error?.response?.data?.meta?.message || error?.response?.data?.message || "";
      if (status === 409) {
        if (/key/i.test(message)) {
          form.setError("projectKey", { message });
        } else {
          form.setError("name", { message });
        }
        return;
      }
      if (status === 400) {
        form.setError("projectKey", { message: message || "Project key format is invalid" });
        return;
      }
      toast.error(message || "Failed to create project");
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    const payload: ProjectRequest = {
      name: data.name.trim(),
      projectKey: (data.projectKey || "").trim(),
      description: data.description ?? null,
      visibility: data.visibility,
      startDate: data.startDate ? `${data.startDate}T00:00:00.000Z` : null,
      endDate: data.endDate ? `${data.endDate}T00:00:00.000Z` : null,
      workspaceId: targetWorkspace?.id,
    };

    await createMutation.mutateAsync(payload);
  });

  const projectName = watch("name");
  const selectedVisibility = watch("visibility");

  return (
    <div className="min-h-full bg-[#F6F8FA]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center gap-2 text-sm text-[#57606A]">
          <Link href="/projects" className="inline-flex items-center gap-2 font-medium text-[#0969DA] hover:underline">
            <ArrowLeft size={16} />
            Back to projects
          </Link>
          <ChevronRight size={14} className="text-[#8C959F]" />
          <span>Create a new project</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <div className="sticky top-8 space-y-7 pl-3">
              <div className="relative pl-10">
                <div className="absolute left-[15px] top-8 h-[calc(100%+24px)] w-px bg-[#D8DEE4]" />
                <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-[#D8DEE4] bg-white text-sm font-semibold text-[#24292F]">
                  1
                </span>
                <p className="pt-1 text-sm font-semibold text-[#24292F]">General</p>
              </div>
              <div className="pl-10 text-sm font-medium text-[#57606A]">Configuration</div>
            </div>
          </div>

          <div className="max-w-3xl">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight text-[#24292F]">
                Create a new project
              </h1>
              <p className="mt-2 text-sm text-[#57606A]">
                Required fields are marked with an asterisk (*).
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-10">
              <section className="relative pl-12">
                <div className="absolute left-[15px] top-8 h-[calc(100%-12px)] w-px bg-[#D8DEE4]" />
                <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-[#D8DEE4] bg-white text-sm font-semibold text-[#24292F]">
                  1
                </span>

                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-[#24292F]">General</h2>
                    <p className="mt-1 text-sm text-[#57606A]">
                      Set up the core details before planning sprints and managing tasks.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#24292F]">
                        Owner
                      </label>
                      <div className="flex h-11 items-center rounded-md border border-[#D0D7DE] bg-white px-3 text-sm text-[#24292F] shadow-sm">
                        {ownerLabel}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="name" className="mb-2 block text-sm font-semibold text-[#24292F]">
                        Project name <span className="text-[#D1242F]">*</span>
                      </label>
                      <input
                        id="name"
                        {...register("name")}
                        className={cn(
                          "h-11 w-full rounded-md border bg-white px-3 text-sm text-[#24292F] shadow-sm outline-none transition",
                          errors.name
                            ? "border-[#D1242F] focus:border-[#D1242F] focus:ring-4 focus:ring-[#D1242F]/10"
                            : "border-[#D0D7DE] focus:border-[#0969DA] focus:ring-4 focus:ring-[#0969DA]/10"
                        )}
                        placeholder="TaskSphere Web Revamp"
                      />
                      {errors.name && (
                        <p className="mt-1.5 text-xs font-medium text-[#D1242F]">{errors.name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div>
                      <label htmlFor="projectKey" className="mb-2 block text-sm font-semibold text-[#24292F]">
                        Project key <span className="text-[#D1242F]">*</span>
                      </label>
                      <input
                        id="projectKey"
                        {...register("projectKey")}
                        onChange={(event) =>
                          setValue("projectKey", event.target.value.slice(0, 10).toUpperCase(), {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        className={cn(
                          "h-11 w-full rounded-md border bg-white px-3 font-semibold uppercase tracking-[0.2em] text-[#24292F] shadow-sm outline-none transition",
                          errors.projectKey
                            ? "border-[#D1242F] focus:border-[#D1242F] focus:ring-4 focus:ring-[#D1242F]/10"
                            : "border-[#D0D7DE] focus:border-[#0969DA] focus:ring-4 focus:ring-[#0969DA]/10"
                        )}
                        placeholder="TSW"
                        maxLength={10}
                      />
                      {errors.projectKey ? (
                        <p className="mt-1.5 text-xs font-medium text-[#D1242F]">{errors.projectKey.message}</p>
                      ) : (
                        <p className="mt-1.5 text-xs text-[#57606A]">
                          Uppercase letters and numbers only, 2-10 characters.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="mb-2 block text-sm font-semibold text-[#24292F]">
                      Description
                    </label>
                    <textarea
                      id="description"
                      {...register("description")}
                      rows={4}
                      className="w-full rounded-md border border-[#D0D7DE] bg-white px-3 py-2.5 text-sm text-[#24292F] shadow-sm outline-none transition focus:border-[#0969DA] focus:ring-4 focus:ring-[#0969DA]/10"
                      placeholder="Summarize the project's goals, scope, and delivery direction."
                    />
                    <div className="mt-2 flex items-center gap-2 text-xs text-[#57606A]">
                      <Info size={14} />
                      <span>
                        Great project descriptions make it easier for your team to align from day one.
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="relative pl-12">
                <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-[#D8DEE4] bg-white text-sm font-semibold text-[#24292F]">
                  2
                </span>

                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-[#24292F]">Configuration</h2>
                    <p className="mt-1 text-sm text-[#57606A]">
                      Choose the visibility and schedule that fit this project's setup.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#D8DEE4] bg-white p-5 shadow-sm">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-[#24292F]">
                        Choose visibility <span className="text-[#D1242F]">*</span>
                      </p>
                      <p className="mt-1 text-sm text-[#57606A]">
                        Choose who can see this project in the system.
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {visibilityOptions.map((option) => {
                        const Icon = option.icon;
                        const active = selectedVisibility === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setValue("visibility", option.id, { shouldDirty: true, shouldValidate: true })}
                            className={cn(
                              "flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition",
                              active
                                ? "border-[#0969DA] bg-[#F6F8FA] ring-2 ring-[#0969DA]/10"
                                : "border-[#D8DEE4] hover:border-[#0969DA]/40 hover:bg-[#F6F8FA]"
                            )}
                          >
                            <div className={cn(
                              "mt-0.5 flex h-9 w-9 items-center justify-center rounded-md border",
                              active ? "border-[#B6E3FF] bg-[#DDF4FF] text-[#0969DA]" : "border-[#D8DEE4] bg-white text-[#57606A]"
                            )}>
                              <Icon size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#24292F]">{option.label}</p>
                              <p className="mt-1 text-sm leading-6 text-[#57606A]">{option.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#D8DEE4] bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <CalendarDays size={16} className="text-[#57606A]" />
                      <p className="text-sm font-semibold text-[#24292F]">Schedule</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="startDate" className="mb-2 block text-sm font-semibold text-[#24292F]">
                          Start date
                        </label>
                        <input
                          id="startDate"
                          type="date"
                          {...register("startDate")}
                          className="h-11 w-full rounded-md border border-[#D0D7DE] bg-white px-3 text-sm text-[#24292F] shadow-sm outline-none transition focus:border-[#0969DA] focus:ring-4 focus:ring-[#0969DA]/10"
                        />
                      </div>

                      <div>
                        <label htmlFor="endDate" className="mb-2 block text-sm font-semibold text-[#24292F]">
                          End date
                        </label>
                        <input
                          id="endDate"
                          type="date"
                          {...register("endDate")}
                          className={cn(
                            "h-11 w-full rounded-md border bg-white px-3 text-sm text-[#24292F] shadow-sm outline-none transition",
                            errors.endDate
                              ? "border-[#D1242F] focus:border-[#D1242F] focus:ring-4 focus:ring-[#D1242F]/10"
                              : "border-[#D0D7DE] focus:border-[#0969DA] focus:ring-4 focus:ring-[#0969DA]/10"
                          )}
                        />
                        {errors.endDate && (
                          <p className="mt-1.5 text-xs font-medium text-[#D1242F]">{errors.endDate.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="rounded-xl border border-[#D8DEE4] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => router.push("/projects")}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-[#D0D7DE] bg-white px-4 text-sm font-semibold text-[#24292F] shadow-sm transition hover:bg-[#F6F8FA]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!projectName?.trim() || !isValid || createMutation.isPending}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1677FF] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0958D9] disabled:cursor-not-allowed disabled:bg-[#91CAFF]"
                    >
                      {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                      Create project
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
