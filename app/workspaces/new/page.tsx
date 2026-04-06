"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  X,
  Loader2,
  Building2,
  Users,
  Mail,
  Tag,
  ChevronRight,
} from "lucide-react";
import { WorkspaceService } from "@/app/services/workspace.service";
import { WorkspaceRole } from "@/app/types/workspace.schema";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const Step1Schema = z.object({
  name: z
    .string()
    .min(1, "Tên workspace không được để trống")
    .max(255, "Tối đa 255 ký tự"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, "Chỉ cho phép chữ thường, số và dấu gạch ngang")
    .optional()
    .or(z.literal("")),
  description: z.string().optional(),
});

type Step1Values = z.infer<typeof Step1Schema>;

interface PendingMember {
  email: string;
  role: WorkspaceRole;
  skillTags: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: auto-generate slug from name
// ─────────────────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 }) {
  const steps = [
    { num: 1, label: "Thông tin Workspace" },
    { num: 2, label: "Mời thành viên" },
  ];
  return (
    <div className="mb-8 flex items-center gap-3">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
              current === step.num
                ? "bg-blue-600 text-white"
                : current > step.num
                ? "bg-green-500 text-white"
                : "border-2 border-slate-200 text-slate-400"
            )}
          >
            {current > step.num ? <Check size={14} /> : step.num}
          </div>
          <span
            className={cn(
              "text-sm font-medium",
              current === step.num ? "text-slate-800" : "text-slate-400"
            )}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <ChevronRight size={16} className="text-slate-300" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Workspace Info
// ─────────────────────────────────────────────────────────────────────────────

function Step1Form({
  onNext,
}: {
  onNext: (values: Step1Values) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1Values>({ resolver: zodResolver(Step1Schema) });

  const name = watch("name") ?? "";
  const slug = watch("slug") ?? "";

  // Auto-generate slug as user types name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue("name", value);
    setValue("slug", generateSlug(value));
  };

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {/* Name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Tên Workspace <span className="text-red-500">*</span>
        </label>
        <input
          {...register("name")}
          onChange={handleNameChange}
          placeholder="VD: Engineering Team"
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Slug */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          URL Slug
        </label>
        <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <span className="select-none border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
            /ws/
          </span>
          <input
            {...register("slug")}
            placeholder="engineering-team"
            className="flex-1 bg-white px-3 py-2.5 text-sm outline-none"
          />
        </div>
        {slug && (
          <p className="mt-1 text-xs text-slate-400">
            URL của workspace:{" "}
            <span className="font-medium text-slate-600">/ws/{slug || generateSlug(name)}</span>
          </p>
        )}
        {errors.slug && (
          <p className="mt-1 text-xs text-red-500">{errors.slug.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Mô tả
        </label>
        <textarea
          {...register("description")}
          rows={3}
          placeholder="Mô tả ngắn về workspace này..."
          className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Tiếp theo
          <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Invite Members (required — at least 1)
// ─────────────────────────────────────────────────────────────────────────────

function Step2Form({
  onBack,
  onSubmit,
  isSubmitting,
}: {
  onBack: () => void;
  onSubmit: (members: PendingMember[]) => void;
  isSubmitting: boolean;
}) {
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [emailError, setEmailError] = useState("");

  const addSkill = () => {
    const tag = skillInput.trim();
    if (tag && !skills.includes(tag)) {
      setSkills([...skills, tag]);
      setSkillInput("");
    }
  };

  const removeSkill = (tag: string) => {
    setSkills(skills.filter((s) => s !== tag));
  };

  const addMember = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Email không hợp lệ");
      return;
    }
    if (members.some((m) => m.email === trimmedEmail)) {
      setEmailError("Email này đã được thêm");
      return;
    }
    setMembers([...members, { email: trimmedEmail, role, skillTags: skills }]);
    setEmail("");
    setSkills([]);
    setSkillInput("");
    setEmailError("");
  };

  const removeMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (members.length === 0) {
      toast.error("Cần mời ít nhất 1 thành viên để tiếp tục");
      return;
    }
    onSubmit(members);
  };

  return (
    <div className="space-y-6">
      {/* Add member form */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Thêm thành viên
        </h3>

        {/* Email */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
            onKeyDown={(e) => e.key === "Enter" && addMember()}
            placeholder="colleague@company.com"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          {emailError && (
            <p className="mt-1 text-xs text-red-500">{emailError}</p>
          )}
        </div>

        {/* Role */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Vai trò
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {/* Skill tags */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Kỹ năng (tùy chọn)
          </label>
          <div className="flex gap-2">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              placeholder="React, Java, ..."
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={addSkill}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Thêm
            </button>
          </div>
          {skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                >
                  <Tag size={9} />
                  {tag}
                  <button type="button" onClick={() => removeSkill(tag)}>
                    <X size={9} className="ml-0.5 cursor-pointer hover:text-red-500" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={addMember}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={13} />
          Thêm vào danh sách
        </button>
      </div>

      {/* Member list */}
      {members.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Danh sách thành viên ({members.length})
          </p>
          {members.map((m, idx) => (
            <div
              key={m.email}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-xs font-bold text-white">
                {m.email[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{m.email}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">{m.role}</span>
                  {m.skillTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeMember(idx)}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center">
          <Users size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Chưa có thành viên nào</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Bắt buộc mời ít nhất 1 thành viên để tạo workspace
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || members.length === 0}
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white",
            members.length > 0
              ? "bg-blue-600 hover:bg-blue-700"
              : "cursor-not-allowed bg-slate-300"
          )}
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          Hoàn thành → Vào Workspace
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function WorkspaceCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [step1Values, setStep1Values] = useState<Step1Values | null>(null);

  const createMutation = useMutation({
    mutationFn: async ({
      info,
      members,
    }: {
      info: Step1Values;
      members: PendingMember[];
    }) => {
      const wsRes = await WorkspaceService.create({
        name: info.name,
        slug: info.slug || undefined,
        description: info.description,
      });
      const workspace = wsRes.data;
      if (!workspace) throw new Error("Không thể tạo workspace");

      // Invite members in parallel
      await Promise.allSettled(
        members.map((m) =>
          WorkspaceService.inviteMember(workspace.id, {
            email: m.email,
            role: m.role as "ADMIN" | "MEMBER",
            skillTags: m.skillTags,
          })
        )
      );

      return workspace;
    },
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ["my-workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-workspaces"] });
      toast.success("Workspace đã được tạo thành công!");
      router.push(`/ws/${workspace.slug}`);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo workspace";
      toast.error(msg);
    },
  });

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      {/* Back link */}
      <button
        type="button"
        onClick={() => (step === 2 ? setStep(1) : router.push("/workspaces"))}
        className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={14} />
        {step === 2 ? "Quay lại bước 1" : "Danh sách Workspace"}
      </button>

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-sm">
          <Building2 size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tạo Workspace mới</h1>
          <p className="text-sm text-slate-400">
            Không gian làm việc chung cho cả team
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step content */}
      {step === 1 && (
        <Step1Form
          onNext={(values) => {
            setStep1Values(values);
            setStep(2);
          }}
        />
      )}

      {step === 2 && step1Values && (
        <Step2Form
          onBack={() => setStep(1)}
          onSubmit={(members) =>
            createMutation.mutate({ info: step1Values, members })
          }
          isSubmitting={createMutation.isPending}
        />
      )}
    </div>
  );
}
