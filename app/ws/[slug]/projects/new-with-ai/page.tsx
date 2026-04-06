"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  Check,
  Send,
  Building2,
} from "lucide-react";
import { WorkspaceAiService } from "@/app/services/workspace-ai.service";
import { WorkspaceService } from "@/app/services/workspace.service";
import QuestionCard from "@/components/ai/QuestionCard";
import ProjectPlanReview from "@/components/ai/ProjectPlanReview";
import type {
  AiQuestion,
  AnalyzeDescriptionResponse,
  CollectedData,
  GenerateProjectPlanResponse,
  MemberOption,
} from "@/app/types/workspace-ai";
import { Workspace } from "@/app/types/workspace.schema";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// State machine
// ─────────────────────────────────────────────────────────────────────────────

type CreationStep =
  | "input"       // Step 0: enter description
  | "analyzing"   // Loading: AI analyzing
  | "questioning" // Step 1-3: AI questions
  | "generating"  // Loading: generating plan
  | "review"      // Step 5: PM reviews
  | "confirming"  // Loading: creating in DB
  | "success";    // Done

// ─────────────────────────────────────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────────────────────────────────────

const STEP_PROGRESS: Record<CreationStep, number> = {
  input:       0,
  analyzing:   15,
  questioning: 40,
  generating:  65,
  review:      80,
  confirming:  95,
  success:     100,
};

const STEP_LABEL: Record<CreationStep, string> = {
  input:       "Mô tả dự án",
  analyzing:   "Đang phân tích...",
  questioning: "Thu thập thông tin",
  generating:  "AI đang tạo kế hoạch...",
  review:      "Review kế hoạch",
  confirming:  "Đang tạo dự án...",
  success:     "Hoàn tất!",
};

function ProgressBar({ step }: { step: CreationStep }) {
  const progress = STEP_PROGRESS[step];
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{STEP_LABEL[step]}</span>
        <span className="text-xs font-bold text-blue-600">{progress}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AiProjectCreationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // ── Workspace + members ────────────────────────────────────────────────────
  const { data: wsData } = useQuery({
    queryKey: ["workspace", slug],
    queryFn: () => WorkspaceService.getBySlug(slug),
    staleTime: 5 * 60 * 1000,
  });
  const workspace = wsData?.data as Workspace | undefined;
  const wsId = workspace?.id ?? "";

  // ── Page state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<CreationStep>("input");
  const [description, setDescription] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeDescriptionResponse | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [collected, setCollected] = useState<CollectedData>({ description: "" });
  const [generatedPlan, setGeneratedPlan] = useState<GenerateProjectPlanResponse | null>(null);
  const [successData, setSuccessData] = useState<{ projectId: string; projectKey: string; projectUrl: string } | null>(null);

  const allMembers: MemberOption[] =
    analyzeResult?.questions.find((q) => q.type === "member-select")?.members ?? [];

  const selectedMembers: MemberOption[] = allMembers.filter((m) =>
    collected.memberIds?.includes(m.userId)
  );

  // ── Step 0: Analyze description ───────────────────────────────────────────
  const handleSubmitDescription = async () => {
    if (!description.trim() || !wsId) return;
    setStep("analyzing");
    try {
      const result = await WorkspaceAiService.analyzeDescription(wsId, description.trim());
      setAnalyzeResult(result);
      setCollected({ description: description.trim() });
      setCurrentQuestionIdx(0);
      setStep("questioning");
    } catch (err: unknown) {
      toast.error("Không thể kết nối AI. Vui lòng thử lại.");
      setStep("input");
    }
  };

  // ── Step 1-3: Answer questions ─────────────────────────────────────────────
  const handleAnswer = async (question: AiQuestion, value: string) => {
    let nextCollected = { ...collected };

    if (question.field === "techStack") {
      nextCollected.techStack = value;
    } else if (question.field === "deadline") {
      nextCollected.deadlineWeeks = parseInt(value) || 4;
    } else if (question.field === "teamMembers") {
      nextCollected.memberIds = value.split(",").filter(Boolean);
    }

    setCollected(nextCollected);

    const questions = analyzeResult?.questions ?? [];
    const nextIdx = currentQuestionIdx + 1;

    if (nextIdx < questions.length) {
      setCurrentQuestionIdx(nextIdx);
    } else {
      // All questions answered — generate plan
      await generatePlan(nextCollected);
    }
  };

  const handleSkip = async (question: AiQuestion) => {
    // Apply defaults for skipped questions
    const nextCollected = { ...collected };
    if (question.field === "deadline") nextCollected.deadlineWeeks = 4;
    setCollected(nextCollected);

    const questions = analyzeResult?.questions ?? [];
    const nextIdx = currentQuestionIdx + 1;
    if (nextIdx < questions.length) {
      setCurrentQuestionIdx(nextIdx);
    } else {
      await generatePlan(nextCollected);
    }
  };

  // ── Generate plan ──────────────────────────────────────────────────────────
  const generatePlan = async (data: CollectedData) => {
    setStep("generating");
    try {
      const plan = await WorkspaceAiService.generateProjectPlan(wsId, {
        description: data.description,
        techStack: data.techStack,
        deadlineWeeks: data.deadlineWeeks,
        memberIds: data.memberIds,
      });
      setGeneratedPlan(plan);
      setStep("review");
    } catch (err: unknown) {
      toast.error("AI không thể sinh kế hoạch. Vui lòng thử lại.");
      setStep("questioning");
    }
  };

  // ── Confirm plan ───────────────────────────────────────────────────────────
  const handleConfirm = async (finalPlan: GenerateProjectPlanResponse) => {
    if (!wsId) return;
    setStep("confirming");
    try {
      const result = await WorkspaceAiService.confirmProjectPlan(wsId, {
        plan: {
          project: finalPlan.project,
          sprints: finalPlan.sprints,
          memberIds: collected.memberIds ?? [],
        },
      });
      setSuccessData({
        projectId: result.projectId,
        projectKey: result.projectKey,
        projectUrl: result.projectUrl,
      });
      setStep("success");
      toast.success("Dự án đã được tạo thành công!");
    } catch (err: unknown) {
      toast.error("Có lỗi khi tạo dự án. Vui lòng thử lại.");
      setStep("review");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const questions = analyzeResult?.questions ?? [];
  const currentQuestion = questions[currentQuestionIdx];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push(`/ws/${slug}`)}
        className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={14} />
        Quay về Workspace
      </button>

      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow">
          <Sparkles size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tạo dự án với AI</h1>
          <p className="text-sm text-slate-400">
            {workspace ? `Workspace: ${workspace.name}` : "Đang tải..."}
          </p>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar step={step} />

      {/* ── Step 0: Input ── */}
      {step === "input" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-800">
            Mô tả dự án bạn muốn tạo
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Viết 1-2 câu, AI sẽ tự hỏi thêm những gì cần thiết.
          </p>
          <textarea
            autoFocus
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmitDescription();
            }}
            placeholder="VD: Làm app quản lý chi tiêu cá nhân cho mobile và web..."
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">Ctrl+Enter để gửi</span>
            <button
              type="button"
              onClick={handleSubmitDescription}
              disabled={!description.trim() || !wsId}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white",
                description.trim() && wsId
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "cursor-not-allowed bg-slate-300"
              )}
            >
              <Send size={15} />
              Gửi cho AI
            </button>
          </div>
        </div>
      )}

      {/* ── Analyzing ── */}
      {step === "analyzing" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <Loader2 size={36} className="mb-4 animate-spin text-blue-500" />
          <p className="font-semibold text-slate-700">AI đang phân tích mô tả...</p>
          <p className="mt-1 text-sm text-slate-400">Thường mất 5-15 giây</p>
        </div>
      )}

      {/* ── Questioning ── */}
      {step === "questioning" && currentQuestion && (
        <div className="space-y-4">
          {/* Understood summary */}
          {analyzeResult?.understood && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                AI đã hiểu
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {analyzeResult.understood.projectName}
              </p>
              {analyzeResult.understood.features.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {analyzeResult.understood.features.slice(0, 4).map((f) => (
                    <span
                      key={f}
                      className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <QuestionCard
            questionNumber={currentQuestionIdx + 1}
            totalQuestions={questions.length}
            question={currentQuestion}
            onAnswer={(value) => handleAnswer(currentQuestion, value)}
            onSkip={currentQuestion.field !== "teamMembers"
              ? () => handleSkip(currentQuestion)
              : undefined}
            onClose={() => router.push(`/ws/${slug}`)}
          />
        </div>
      )}

      {/* ── Generating ── */}
      {step === "generating" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <div className="relative mb-4">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-100 border-t-violet-500" />
            <Sparkles size={22} className="absolute inset-0 m-auto text-violet-500" />
          </div>
          <p className="font-semibold text-slate-700">AI đang tạo kế hoạch dự án...</p>
          <p className="mt-1 text-sm text-slate-400">
            Đang sinh sprints, tasks và phân công thành viên. Có thể mất 15-30 giây.
          </p>
        </div>
      )}

      {/* ── Review ── */}
      {step === "review" && generatedPlan && (
        <ProjectPlanReview
          plan={generatedPlan}
          members={selectedMembers}
          onConfirm={handleConfirm}
          onBack={() => setStep("questioning")}
          isConfirming={false}
        />
      )}

      {/* ── Confirming ── */}
      {step === "confirming" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <Loader2 size={36} className="mb-4 animate-spin text-blue-500" />
          <p className="font-semibold text-slate-700">Đang tạo dự án...</p>
          <p className="mt-1 text-sm text-slate-400">
            Tạo project, sprints và tasks trong 1 transaction
          </p>
        </div>
      )}

      {/* ── Success ── */}
      {step === "success" && successData && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 py-16 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
            <Check size={32} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Dự án đã được tạo!</h2>
          <p className="mt-1 text-sm text-slate-500">
            Project key:{" "}
            <span className="font-bold text-emerald-700">{successData.projectKey}</span>
          </p>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => router.push(successData.projectUrl)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Building2 size={15} />
              Vào dự án ngay
            </button>
            <button
              type="button"
              onClick={() => router.push(`/ws/${slug}`)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Về Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
