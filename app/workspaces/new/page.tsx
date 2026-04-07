"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  Info,
  Loader2,
  Mail,
  Plus,
  Shield,
  Tag,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ProfileService } from "@/app/services/profile.service";
import { WorkspaceService } from "@/app/services/workspace.service";
import { CreateWorkspaceRequest, WorkspaceRole } from "@/app/types/workspace.schema";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

const WorkspaceCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(255, "Workspace name must not exceed 255 characters"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, "Only lowercase letters, numbers, and hyphens are allowed")
    .optional()
    .or(z.literal("")),
  description: z.string().optional(),
});

type WorkspaceCreateValues = z.infer<typeof WorkspaceCreateSchema>;

interface PendingMember {
  email: string;
  role: WorkspaceRole;
  skillTags: string[];
  existsInSystem: boolean;
  useProfileSkills: boolean;
  fullName?: string | null;
  avatarUrl?: string | null;
  profileSkillTags: string[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSkillTags(skillTags: string[]) {
  return Array.from(
    new Set(
      skillTags
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 20);
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

const roleOptions: Array<{
  id: "ADMIN" | "MEMBER";
  label: string;
  description: string;
}> = [
  {
    id: "MEMBER",
    label: "Member",
    description: "Can collaborate in the workspace and join projects.",
  },
  {
    id: "ADMIN",
    label: "Admin",
    description: "Can help manage workspace members and shared settings.",
  },
];

export default function WorkspaceCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser({ required: false });

  const [members, setMembers] = useState<PendingMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [skillInput, setSkillInput] = useState("");
  const [inviteSkills, setInviteSkills] = useState<string[]>([]);
  const [inviteEmailError, setInviteEmailError] = useState("");
  const [debouncedInviteEmail, setDebouncedInviteEmail] = useState("");
  const [skillMode, setSkillMode] = useState<"profile" | "custom">("profile");

  const ownerLabel =
    currentUser?.fullName?.trim() ||
    currentUser?.displayName?.trim() ||
    currentUser?.email?.split("@")[0] ||
    "Current user";

  const form = useForm<WorkspaceCreateValues>({
    resolver: zodResolver(WorkspaceCreateSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = form;

  const workspaceName = watch("name") ?? "";
  const workspaceSlug = watch("slug") ?? "";

  const slugPreview = useMemo(
    () => workspaceSlug || generateSlug(workspaceName),
    [workspaceName, workspaceSlug]
  );
  const normalizedInviteEmail = inviteEmail.trim().toLowerCase();
  const isValidInviteEmail = EMAIL_REGEX.test(normalizedInviteEmail);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedInviteEmail(normalizedInviteEmail);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [normalizedInviteEmail]);

  const inviteePreviewQuery = useQuery({
    queryKey: ["invite-preview", debouncedInviteEmail],
    queryFn: () => ProfileService.getInviteePreview(debouncedInviteEmail),
    enabled: isValidInviteEmail,
    staleTime: 30_000,
  });

  useEffect(() => {
    const preview = inviteePreviewQuery.data;
    if (!preview) return;
    if (preview.existsInSystem && preview.skillTags.length > 0) {
      setSkillMode("profile");
      setInviteSkills([]);
      return;
    }
    if (preview.existsInSystem) {
      setSkillMode("custom");
    }
  }, [inviteePreviewQuery.data]);

  const handleNameChange = (value: string) => {
    setValue("name", value, { shouldValidate: true, shouldDirty: true });
    const currentSlug = form.getValues("slug");
    if (!currentSlug || currentSlug === generateSlug(form.getValues("name") || "")) {
      setValue("slug", generateSlug(value), { shouldValidate: true, shouldDirty: true });
    }
  };

  const addSkill = () => {
    const next = normalizeSkillTags([...inviteSkills, skillInput]);
    setInviteSkills(next);
    setSkillInput("");
  };

  const removeSkill = (tag: string) => {
    setInviteSkills((current) => current.filter((item) => item !== tag));
  };

  const addMember = () => {
    if (!normalizedInviteEmail || !EMAIL_REGEX.test(normalizedInviteEmail)) {
      setInviteEmailError("Please enter a valid email address.");
      return;
    }
    if (members.some((member) => member.email === normalizedInviteEmail)) {
      setInviteEmailError("This email has already been added.");
      return;
    }

    const preview = inviteePreviewQuery.data;
    setMembers((current) => [
      ...current,
      {
        email: normalizedInviteEmail,
        role: inviteRole,
        skillTags: preview?.existsInSystem
          ? (skillMode === "custom" ? inviteSkills : [])
          : [],
        existsInSystem: Boolean(preview?.existsInSystem),
        useProfileSkills: Boolean(preview?.existsInSystem && skillMode === "profile"),
        fullName: preview?.fullName,
        avatarUrl: preview?.avatarUrl,
        profileSkillTags: preview?.skillTags ?? [],
      },
    ]);
    setInviteEmail("");
    setInviteSkills([]);
    setSkillInput("");
    setInviteEmailError("");
    setDebouncedInviteEmail("");
    setSkillMode("profile");
  };

  const removeMember = (email: string) => {
    setMembers((current) => current.filter((member) => member.email !== email));
  };

  const createMutation = useMutation({
    mutationFn: async ({
      workspace,
      invitedMembers,
    }: {
      workspace: CreateWorkspaceRequest;
      invitedMembers: PendingMember[];
    }) => {
      const wsRes = await WorkspaceService.create(workspace);
      const createdWorkspace = wsRes.data;
      if (!createdWorkspace) {
        throw new Error("Unable to create workspace");
      }

      await Promise.allSettled(
        invitedMembers.map((member) =>
          WorkspaceService.inviteMember(createdWorkspace.id, {
            email: member.email,
            role: member.role as "ADMIN" | "MEMBER",
            skillTags: member.existsInSystem && member.useProfileSkills ? undefined : member.skillTags,
          })
        )
      );

      return createdWorkspace;
    },
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ["my-workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-workspaces"] });
      toast.success("Workspace created successfully!");
      router.push(`/ws/${workspace.slug}`);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to create workspace";
      toast.error(message);
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (members.length === 0) {
      toast.error("Add at least one member before creating the workspace.");
      return;
    }

    await createMutation.mutateAsync({
      workspace: {
        name: data.name.trim(),
        slug: data.slug || undefined,
        description: data.description,
      },
      invitedMembers: members,
    });
  });

  return (
    <div className="min-h-full bg-[#F6F8FA]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center gap-2 text-sm text-[#57606A]">
          <Link href="/workspaces" className="inline-flex items-center gap-2 font-medium text-[#0969DA] hover:underline">
            <ArrowLeft size={16} />
            Back to workspaces
          </Link>
          <ChevronRight size={14} className="text-[#8C959F]" />
          <span>Create a new workspace</span>
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
              <div className="pl-10 text-sm font-medium text-[#57606A]">Team setup</div>
            </div>
          </div>

          <div className="max-w-3xl">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight text-[#24292F]">
                Create a new workspace
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
                      Set up the shared workspace that your team will use across projects.
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
                        Workspace name <span className="text-[#D1242F]">*</span>
                      </label>
                      <input
                        id="name"
                        {...register("name")}
                        onChange={(event) => handleNameChange(event.target.value)}
                        className={cn(
                          "h-11 w-full rounded-md border bg-white px-3 text-sm text-[#24292F] shadow-sm outline-none transition",
                          errors.name
                            ? "border-[#D1242F] focus:border-[#D1242F] focus:ring-4 focus:ring-[#D1242F]/10"
                            : "border-[#D0D7DE] focus:border-[#0969DA] focus:ring-4 focus:ring-[#0969DA]/10"
                        )}
                        placeholder="Engineering Team"
                      />
                      {errors.name && (
                        <p className="mt-1.5 text-xs font-medium text-[#D1242F]">{errors.name.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="slug" className="mb-2 block text-sm font-semibold text-[#24292F]">
                      URL slug
                    </label>
                    <div className="flex items-center overflow-hidden rounded-md border border-[#D0D7DE] bg-white shadow-sm focus-within:border-[#0969DA] focus-within:ring-4 focus-within:ring-[#0969DA]/10">
                      <span className="border-r border-[#D0D7DE] bg-[#F6F8FA] px-3 py-2.5 text-sm text-[#57606A]">
                        /ws/
                      </span>
                      <input
                        id="slug"
                        {...register("slug")}
                        className="h-11 flex-1 px-3 text-sm text-[#24292F] outline-none"
                        placeholder="engineering-team"
                      />
                    </div>
                    {slugPreview ? (
                      <p className="mt-1.5 text-xs text-[#57606A]">
                        Workspace URL preview: <span className="font-medium text-[#24292F]">/ws/{slugPreview}</span>
                      </p>
                    ) : null}
                    {errors.slug && (
                      <p className="mt-1.5 text-xs font-medium text-[#D1242F]">{errors.slug.message}</p>
                    )}
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
                      placeholder="Describe the team's mission, domain, or working context."
                    />
                    <div className="mt-2 flex items-center gap-2 text-xs text-[#57606A]">
                      <Info size={14} />
                      <span>
                        A clear workspace description helps members understand the shared scope.
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
                    <h2 className="text-xl font-semibold text-[#24292F]">Team setup</h2>
                    <p className="mt-1 text-sm text-[#57606A]">
                      Invite the first members who will collaborate in this workspace.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#D8DEE4] bg-white p-5 shadow-sm">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-[#24292F]">
                        Add members <span className="text-[#D1242F]">*</span>
                      </p>
                      <p className="mt-1 text-sm text-[#57606A]">
                        At least one invited member is required to complete workspace creation.
                      </p>
                    </div>

                    <div className="grid gap-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-[#24292F]">Email</label>
                        <div className="relative">
                          <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#57606A]" />
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(event) => {
                              setInviteEmail(event.target.value);
                              setInviteEmailError("");
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                addMember();
                              }
                            }}
                            className="h-11 w-full rounded-md border border-[#D0D7DE] bg-white pl-10 pr-3 text-sm text-[#24292F] shadow-sm outline-none transition focus:border-[#0969DA] focus:ring-4 focus:ring-[#0969DA]/10"
                            placeholder="teammate@company.com"
                          />
                        </div>
                        {inviteEmailError ? (
                          <p className="mt-1.5 text-xs font-medium text-[#D1242F]">{inviteEmailError}</p>
                        ) : null}
                      </div>

                      {isValidInviteEmail ? (
                        <div className="rounded-xl border border-[#D8DEE4] bg-[#F6F8FA] p-4">
                          {inviteePreviewQuery.isLoading ? (
                            <div className="flex items-center gap-2 text-sm text-[#57606A]">
                              <Loader2 size={15} className="animate-spin" />
                              Checking account and profile skills...
                            </div>
                          ) : inviteePreviewQuery.data?.existsInSystem ? (
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div className="flex min-w-0 items-center gap-3">
                                {inviteePreviewQuery.data.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={inviteePreviewQuery.data.avatarUrl}
                                    alt={inviteePreviewQuery.data.fullName || inviteePreviewQuery.data.email}
                                    className="h-11 w-11 rounded-full border border-[#D0D7DE] object-cover"
                                  />
                                ) : (
                                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D0D7DE] bg-white text-sm font-semibold text-[#57606A]">
                                    {(inviteePreviewQuery.data.fullName || inviteePreviewQuery.data.email).slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[#24292F]">
                                    {inviteePreviewQuery.data.fullName || inviteePreviewQuery.data.email}
                                  </p>
                                  <p className="truncate text-xs text-[#57606A]">
                                    {inviteePreviewQuery.data.email}
                                  </p>
                                </div>
                              </div>

                              <div className="md:max-w-[55%]">
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#57606A]">
                                  Profile skills
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {inviteePreviewQuery.data.skillTags.length > 0 ? (
                                    inviteePreviewQuery.data.skillTags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full border border-[#B6E3FF] bg-[#DDF4FF] px-2 py-0.5 text-[11px] font-semibold text-[#0969DA]"
                                      >
                                        {tag}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-[#57606A]">
                                      This user has no profile skills yet.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D0D7DE] bg-white text-[#57606A]">
                                <Mail size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#24292F]">
                                  {normalizedInviteEmail}
                                </p>
                                <p className="text-xs text-[#57606A]">
                                  No existing account found. We will send an email immediately, and this person will appear in the workspace after they join the system.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}

                      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#24292F]">Role</label>
                          <div className="grid gap-2">
                            {roleOptions.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setInviteRole(option.id)}
                                className={cn(
                                  "rounded-md border px-3 py-2.5 text-left transition",
                                  inviteRole === option.id
                                    ? "border-[#0969DA] bg-[#F6F8FA] ring-2 ring-[#0969DA]/10"
                                    : "border-[#D8DEE4] hover:border-[#0969DA]/40 hover:bg-[#F6F8FA]"
                                )}
                              >
                                <p className="text-sm font-semibold text-[#24292F]">{option.label}</p>
                                <p className="mt-1 text-xs text-[#57606A]">{option.description}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#24292F]">
                            Skill tags
                          </label>
                          {inviteePreviewQuery.data?.existsInSystem ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSkillMode("profile")}
                                  className={cn(
                                    "rounded-md border px-3 py-2 text-left text-sm font-semibold transition",
                                    skillMode === "profile"
                                      ? "border-[#0969DA] bg-[#F6F8FA] ring-2 ring-[#0969DA]/10 text-[#0969DA]"
                                      : "border-[#D8DEE4] bg-white text-[#24292F] hover:border-[#0969DA]/40"
                                  )}
                                >
                                  Use profile skills
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSkillMode("custom")}
                                  className={cn(
                                    "rounded-md border px-3 py-2 text-left text-sm font-semibold transition",
                                    skillMode === "custom"
                                      ? "border-[#0969DA] bg-[#F6F8FA] ring-2 ring-[#0969DA]/10 text-[#0969DA]"
                                      : "border-[#D8DEE4] bg-white text-[#24292F] hover:border-[#0969DA]/40"
                                  )}
                                >
                                  Set workspace skills
                                </button>
                              </div>

                              {skillMode === "custom" ? (
                                <>
                                  <div className="flex gap-2">
                                    <input
                                      value={skillInput}
                                      onChange={(event) => setSkillInput(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          addSkill();
                                        }
                                      }}
                                      className="h-11 flex-1 rounded-md border border-[#D0D7DE] bg-white px-3 text-sm text-[#24292F] shadow-sm outline-none transition focus:border-[#0969DA] focus:ring-4 focus:ring-[#0969DA]/10"
                                      placeholder="React, Java, Product..."
                                    />
                                    <button
                                      type="button"
                                      onClick={addSkill}
                                      className="inline-flex h-11 items-center justify-center rounded-md border border-[#D0D7DE] bg-white px-4 text-sm font-semibold text-[#24292F] shadow-sm transition hover:bg-[#F6F8FA]"
                                    >
                                      Add
                                    </button>
                                  </div>

                                  {inviteSkills.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {inviteSkills.map((tag) => (
                                        <span
                                          key={tag}
                                          className="inline-flex items-center gap-1 rounded-full border border-[#B6E3FF] bg-[#DDF4FF] px-2.5 py-1 text-xs font-medium text-[#0969DA]"
                                        >
                                          <Tag size={12} />
                                          {tag}
                                          <button type="button" onClick={() => removeSkill(tag)}>
                                            <X size={12} className="hover:text-[#D1242F]" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="mt-2 text-xs text-[#57606A]">
                                      Leave empty to keep using the member's profile skills.
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs text-[#57606A]">
                                  If you do not add custom skills, TaskSphere will use this member's profile skills in the workspace.
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-[#57606A]">
                              External email invitations do not use internal profile skills yet.
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={addMember}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1677FF] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0958D9]"
                        >
                          <Plus size={16} />
                          Add member
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#D8DEE4] bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <Users size={16} className="text-[#57606A]" />
                      <p className="text-sm font-semibold text-[#24292F]">
                        Member list ({members.length})
                      </p>
                    </div>

                    {members.length > 0 ? (
                      <div className="space-y-3">
                        {members.map((member) => (
                          <div
                            key={member.email}
                            className="flex items-start gap-3 rounded-lg border border-[#D8DEE4] bg-[#F6F8FA] px-4 py-3"
                          >
                            {member.existsInSystem && member.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.avatarUrl}
                                alt={member.fullName || member.email}
                                className="h-10 w-10 shrink-0 rounded-full border border-[#D8DEE4] object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D8DEE4] bg-white text-sm font-semibold text-[#24292F]">
                                {member.existsInSystem ? (member.fullName || member.email)[0].toUpperCase() : <Mail size={16} className="text-[#57606A]" />}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#24292F]">
                                {member.existsInSystem ? member.fullName || member.email : member.email}
                              </p>
                              {member.existsInSystem ? (
                                <p className="truncate text-xs text-[#57606A]">{member.email}</p>
                              ) : (
                                <p className="truncate text-xs text-[#57606A]">
                                  External invite. Email will be sent immediately.
                                </p>
                              )}
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full border border-[#D8DEE4] bg-white px-2 py-0.5 text-xs font-medium text-[#57606A]">
                                  <Shield size={12} />
                                  {member.role}
                                </span>
                                {(member.useProfileSkills ? member.profileSkillTags : member.skillTags).map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full border border-[#B6E3FF] bg-[#DDF4FF] px-2 py-0.5 text-xs font-medium text-[#0969DA]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {member.existsInSystem && member.useProfileSkills ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-[#D8DEE4] bg-white px-2 py-0.5 text-xs font-medium text-[#57606A]">
                                    <Check size={12} />
                                    Profile skills
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMember(member.email)}
                              className="rounded-md p-1.5 text-[#57606A] transition hover:bg-white hover:text-[#D1242F]"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-[#D8DEE4] bg-[#F6F8FA] px-6 py-10 text-center">
                        <Users size={30} className="mx-auto mb-3 text-[#8C959F]" />
                        <p className="text-sm font-medium text-[#24292F]">No members added yet</p>
                        <p className="mt-1 text-sm text-[#57606A]">
                          Invite at least one member to complete workspace creation.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <div className="flex justify-end pt-2">
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push("/workspaces")}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-[#D0D7DE] bg-white px-4 text-sm font-semibold text-[#24292F] shadow-sm transition hover:bg-[#F6F8FA]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!workspaceName.trim() || !isValid || members.length === 0 || createMutation.isPending}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1677FF] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0958D9] disabled:cursor-not-allowed disabled:bg-[#91CAFF]"
                  >
                    {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                    Create workspace
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
