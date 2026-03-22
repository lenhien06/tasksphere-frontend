"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Plus,
  Search,
  Lock,
  Globe,
  Landmark,
  Shield,
  Info,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Loader2,
  AlertCircle,
  Calendar as CalendarIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProjectRequest, ProjectVisibilityEnum } from "@/app/types/project..schema";
import { Form, FormField, FormMessage } from "@/components/ui/form";

// ——————————————————————————————————————————————————————————————————————————————————
// SHARED UI COMPONENTS
// ——————————————————————————————————————————————————————————————————————————————————

export const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  description,
  maxWidth = "max-w-md",
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
  description?: string;
  maxWidth?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className={cn(
        "relative w-full max-h-[calc(100vh-2rem)] overflow-hidden bg-white shadow-2xl transition-all border border-gray-100 rounded-[28px] flex flex-col",
        maxWidth
      )}>
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">{title}</h3>
            {description && <p className="mt-1 text-[13px] text-gray-500 font-medium">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto min-h-0 modal-scrollbar">{children}</div>
      </div>
    </div>
  );
};

export const FieldLabel = ({ children, required, className }: { children: ReactNode; required?: boolean; className?: string }) => (
  <label className={cn("block text-[13px] font-bold text-gray-700 mb-2 px-1", className)}>
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

export const InputStyled = (props: any) => (
  <input
    {...props}
    className={cn(
      "w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50/50 text-[14px] text-gray-900 outline-none transition-all",
      "placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
      props.className
    )}
  />
);

export const PrimaryButton = ({ children, loading, className, ...props }: any) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className={cn(
      "flex h-11 items-center justify-center gap-2 rounded-xl bg-[#111827] px-6 text-[14px] font-bold text-white transition-all shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:bg-gray-800 active:scale-95 disabled:opacity-50",
      className
    )}
  >
    {loading ? <Loader2 size={18} className="animate-spin" /> : children}
  </button>
);

export const SecondaryButton = ({ children, className, ...props }: any) => (
  <button
    {...props}
    className={cn(
      "h-11 px-6 rounded-xl border border-gray-200 bg-white text-[14px] font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95",
      className
    )}
  >
    {children}
  </button>
);

// ——————————————————————————————————————————————————————————————————————————————————
// 1. CREATE PROJECT MODAL (REVERTED UI)
// ——————————————————————————————————————————————————————————————————————————————————

export const CreateProjectModal = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectRequest) => Promise<void> | void;
}) => {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false);

  const CreateProjectFormSchema = z
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

  type CreateProjectFormValues = z.infer<typeof CreateProjectFormSchema>;

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(CreateProjectFormSchema),
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

  const { control, handleSubmit, setValue, watch, reset, formState } = form;

  // Auto-generate Key when Name changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === "name") {
        const currentKey = form.getValues("projectKey");
        if (!currentKey || currentKey.length <= 3) {
          const suggestedKey = (value.name || "")
            .trim()
            .split(/\s+/)
            .map((w) => w[0] || "")
            .join("")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 10);
          setValue("projectKey", suggestedKey, { shouldValidate: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, form]);

  const onFormSubmit = async (data: CreateProjectFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: ProjectRequest = {
        name: data.name.trim(),
        projectKey: (data.projectKey || "").trim(),
        description: data.description ?? null,
        visibility: data.visibility,
        startDate: data.startDate ? `${data.startDate}T00:00:00.000Z` : null,
        endDate: data.endDate ? `${data.endDate}T00:00:00.000Z` : null,
      };
      await onSubmit(payload);
      reset();
      onClose();
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.meta?.message || error?.response?.data?.message || "";
      if (status === 409) {
        if (/key/i.test(message)) {
          form.setError("projectKey", { message });
        } else {
          form.setError("name", { message });
        }
      } else if (status === 400) {
        form.setError("projectKey", { message: message || "Project key format is invalid" });
      } else {
        toast.error(message || "Failed to create project");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('project.newProject')}
      description="Set up a professional workspace for your team."
      maxWidth="max-w-xl"
    >
      <Form {...form}>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
          {/* Project Name */}
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <div>
                <FieldLabel required>{t('project.name')}</FieldLabel>
                <InputStyled
                  {...field}
                  placeholder=""
                />
                <FormMessage className="mt-1.5 text-[11px] font-medium text-red-500 px-1" />
              </div>
            )}
          />

          {/* Project Key */}
          <FormField
            control={control}
            name="projectKey"
            render={({ field }) => (
              <div>
                <FieldLabel required>{t('project.key')}</FieldLabel>
                <InputStyled
                  {...field}
                  placeholder=""
                  onChange={(e: any) => field.onChange(e.target.value.slice(0, 10))}
                  maxLength={10}
                  className="uppercase font-bold tracking-widest"
                />
                <div className="mt-2 flex items-center gap-1.5 px-1 text-gray-400">
                  <Info size={12} />
                  <span className="text-[11px] font-medium">2–10 characters. Uppercase letters and numbers only. Used as prefix for tasks.</span>
                </div>
                <FormMessage className="mt-1.5 text-[11px] font-medium text-red-500 px-1" />
              </div>
            )}
          />

          {/* Description */}
          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <div>
                <FieldLabel>{t('project.description')} ({t('common.optional')})</FieldLabel>
                <textarea
                  {...field}
                  value={field.value || ""}
                  className="w-full min-h-[80px] p-4 rounded-xl border border-gray-200 bg-gray-50/50 text-[14px] outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none"
                  placeholder=""
                />
                <FormMessage className="mt-1.5 text-[11px] font-medium text-red-500 px-1" />
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <FormField
              control={control}
              name="startDate"
              render={({ field }) => (
                <div>
                  <FieldLabel>{t('project.startDate')} ({t('common.optional')})</FieldLabel>
                  <div className="relative">
                    <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <InputStyled
                      type="date"
                      value={field.value || ""}
                      onChange={(e: any) => field.onChange(e.target.value || null)}
                      className="pl-10"
                    />
                  </div>
                  <FormMessage className="mt-1.5 text-[11px] font-medium text-red-500 px-1" />
                </div>
              )}
            />

            {/* End Date */}
            <FormField
              control={control}
              name="endDate"
              render={({ field }) => (
                <div>
                  <FieldLabel>{t('project.endDate', { defaultValue: "Ngày kết thúc" })} ({t('common.optional')})</FieldLabel>
                  <div className="relative">
                    <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <InputStyled
                      type="date"
                      value={field.value || ""}
                      onChange={(e: any) => field.onChange(e.target.value || null)}
                      className="pl-10"
                    />
                  </div>
                  <FormMessage className="mt-1.5 text-[11px] font-medium text-red-500 px-1" />
                </div>
              )}
            />
          </div>

          {/* Visibility */}
          <div>
            <FieldLabel>{t('project.visibility')}</FieldLabel>
            <FormField
              control={control}
              name="visibility"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "private", label: t('project.visibility_private'), desc: "Members only" },
                    { id: "internal", label: t('project.visibility_internal'), desc: "Within organization" },
                    { id: "public", label: t('project.visibility_public'), desc: "Everyone" },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => field.onChange(v.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all",
                        field.value === v.id
                          ? "border-blue-500 bg-blue-50/50"
                          : "border-gray-100 bg-white hover:border-gray-200"
                      )}
                    >
                      <div className="text-center">
                        <p className={cn("text-[13px] font-bold", field.value === v.id ? "text-blue-700" : "text-gray-700")}>{v.label}</p>
                        <p className="text-[9px] font-medium text-gray-400 whitespace-nowrap">{v.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <SecondaryButton type="button" onClick={handleClose}>
              {t('common.cancel')}
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              loading={isSubmitting}
              disabled={!watch("name")?.trim() || !watch("projectKey")?.trim() || !formState.isValid}
            >
              {t('project.create')}
            </PrimaryButton>
          </div>
        </form>
      </Form>
    </Modal>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————
// 2. EDIT PROJECT MODAL
// ——————————————————————————————————————————————————————————————————————————————————

export const EditProjectModal = ({
  isOpen,
  onClose,
  project,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  onSubmit: (data: any) => void;
}) => {
  const { t } = useTranslation()
  // 1. Initialize state with lowercase default
  const [formData, setFormData] = useState({ name: "", description: "", visibility: "private" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      // 2. Convert BE data to lowercase for comparison
      const currentVis = (project.visibility || "private").toLowerCase();

      setFormData({
        name: project.name || "",
        description: project.description || "",
        visibility: currentVis // Assign cleaned value to form
      });
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payloadToSend = {
      ...formData,
      status: project.status?.toLowerCase() || "active"
    };
    
    await onSubmit(payloadToSend);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('project.edit')} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100 mb-2">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-600/20">
            {project?.key?.slice(0, 2)}
          </div>
          <div>
            <p className="text-[14px] font-bold text-gray-900">{project?.name}</p>
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">{project?.key}</p>
          </div>
        </div>

        <div>
          <FieldLabel required>{t('project.name')}</FieldLabel>
          <InputStyled
            value={formData.name}
            onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel>{t('project.description')}</FieldLabel>
          <textarea
            className="w-full min-h-[100px] p-4 rounded-xl border border-gray-200 bg-gray-50/50 text-[14px] outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            value={formData.description}
            onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel>{t('project.visibility')}</FieldLabel>
          {/* 3. HTML buttons use lowercase IDs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "private", label: t('project.visibility_private') },
              { id: "internal", label: t('project.visibility_internal') },
              { id: "public", label: t('project.visibility_public') },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setFormData({ ...formData, visibility: v.id })}
                className={cn(
                  "flex items-center justify-center h-10 rounded-xl border-2 transition-all text-[12px] font-bold",
                  formData.visibility === v.id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-100 text-gray-500 hover:border-gray-200"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <SecondaryButton type="button" onClick={onClose}>{t('common.cancel')}</SecondaryButton>
          <PrimaryButton type="submit" loading={isSubmitting}>{t('project.saveChanges')}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————
// 3. ARCHIVE PROJECT MODAL
// ——————————————————————————————————————————————————————————————————————————————————

export const ArchiveProjectModal = ({
  isOpen,
  onClose,
  project,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  onConfirm: () => void;
}) => {
  const { t } = useTranslation()
  const [confirmText, setConfirmText] = useState("");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('project.archive')} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 mb-4 border border-slate-100 shadow-sm">
          <Archive size={28} />
        </div>
        <h4 className="text-[16px] font-bold text-gray-900 mb-2">{t('project.archiveConfirmTitle', { defaultValue: 'Confirm archive project?' })}</h4>
        <p className="text-[13px] text-gray-500 leading-relaxed px-4">
          Project <span className="font-bold text-gray-900">"{project?.name}"</span> will be moved to the archive. Members can still view but cannot edit tasks until it is restored.
        </p>
      </div>

      <div className="mt-6 p-1">
        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{t('project.confirmArchiveLabel', { defaultValue: 'Enter project name to confirm:' })}</label>
        <input
          type="text"
          placeholder={project?.name}
          className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50/50 text-[14px] font-medium text-gray-900 outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
      </div>

      <div className="mt-8 flex gap-3">
        <SecondaryButton className="flex-1" onClick={onClose}>{t('common.cancel')}</SecondaryButton>
        <PrimaryButton
          className="flex-1 bg-amber-600 hover:bg-amber-700 shadow-none border border-amber-700/10"
          disabled={confirmText !== project?.name}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {t('common.archive')}
        </PrimaryButton>
      </div>
    </Modal>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————
// 4. DELETE PROJECT MODAL
// ——————————————————————————————————————————————————————————————————————————————————

export const DeleteProjectModal = ({
  isOpen,
  onClose,
  project,
  onConfirm,
  loading = false,
  error = null,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  onConfirm: (confirmName: string) => void;
  loading?: boolean;
  error?: string | null;
}) => {
  const { t } = useTranslation()
  const [confirmText, setConfirmText] = useState("");

  const isConfirmationValid = () => {
    const trimmedConfirm = confirmText.trim().toLowerCase();
    const projectName = (project?.name || "").toLowerCase();
    const projectKey = (project?.key || "").toLowerCase();
    return trimmedConfirm === projectName || trimmedConfirm === projectKey;
  };

  const handleConfirm = () => {
    if (isConfirmationValid()) {
      onConfirm(confirmText.trim());
      setConfirmText("");
    }
  };

  const handleClose = () => {
    setConfirmText("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('project.deletePermanently')} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 mb-4 border border-slate-100 shadow-sm">
          <Trash2 size={28} />
        </div>
        <h4 className="text-[16px] font-bold text-gray-900 mb-2">⚠️ {t('project.deleteWarningTitle', { defaultValue: 'This action cannot be undone!' })}</h4>
        <p className="text-[13px] text-gray-500 leading-relaxed px-4">
          Project <span className="font-bold text-gray-900">"{project?.name}"</span> will be permanently deleted along with all related data.
        </p>
      </div>

      <div className="mt-6 p-1">
        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
          {t('project.confirmDeleteLabel', { defaultValue: 'Enter project name or key to confirm:' })}
        </label>
        <input
          type="text"
          placeholder={`${project?.name} / ${project?.key}`}
          className={cn(
            "w-full h-11 px-4 rounded-xl border text-[14px] font-medium outline-none transition-all",
            error 
              ? "border-red-500 bg-red-50/30 text-red-600" 
              : "border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          )}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={loading}
        />
        <div className="mt-2 text-[10px] text-gray-400 font-medium px-1 italic">
          * {t('common.caseInsensitive', { defaultValue: 'Case insensitive' })}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <SecondaryButton className="flex-1" onClick={handleClose} disabled={loading}>
          {t('common.back')}
        </SecondaryButton>
        <PrimaryButton
          className="flex-1 bg-red-600 hover:bg-red-700 shadow-none border border-red-700/10"
          disabled={!isConfirmationValid() || loading}
          loading={loading}
          onClick={handleConfirm}
        >
          {t('project.delete')}
        </PrimaryButton>
      </div>
    </Modal>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————
// 5. RESTORE PROJECT MODAL
// ——————————————————————————————————————————————————————————————————————————————————

export const RestoreProjectModal = ({
  isOpen,
  onClose,
  project,
  onConfirm,
  loading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  onConfirm: () => void;
  loading?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('project.restoreTitle', { defaultValue: 'Khôi phục dự án' })} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center">
        <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-4 border-4 border-white shadow-xl">
          <RotateCcw size={32} />
        </div>
        <h4 className="text-[16px] font-bold text-gray-900 mb-2">
          {t('project.restoreConfirm', { defaultValue: `Khôi phục "${project?.name}"?`, name: project?.name })}
        </h4>
        <p className="text-[13px] text-gray-500 leading-relaxed px-4">
          {t('project.restoreDescription', { defaultValue: 'Dự án sẽ xuất hiện lại trong danh sách và các thành viên có thể tiếp tục làm việc.' })}
        </p>
      </div>

      <div className="mt-8 flex gap-3">
        <SecondaryButton className="flex-1" onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </SecondaryButton>
        <PrimaryButton
          className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-blue-600/30"
          disabled={loading}
          loading={loading}
          onClick={() => {
            onConfirm();
          }}
        >
          {t('common.restore', { defaultValue: 'Khôi phục' })}
        </PrimaryButton>
      </div>
    </Modal>
  );
};
