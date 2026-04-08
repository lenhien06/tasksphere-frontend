"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Check,
  Send,
  Building2,
  Briefcase,
} from "lucide-react";
import { WorkspaceAiService } from "@/app/services/workspace-ai.service";
import QuestionCard from "@/components/ai/QuestionCard";
import ProjectPlanReview from "@/components/ai/ProjectPlanReview";
import type {
  AiQuestion,
  AnalyzeDescriptionResponse,
  CollectedData,
  GenerateProjectPlanResponse,
  MemberOption,
} from "@/app/types/workspace-ai";
import { cn } from "@/lib/utils";

type CreationStep =
  | "input"
  | "analyzing"
  | "questioning"
  | "generating"
  | "review"
  | "confirming"
  | "success";

const STEP_PROGRESS: Record<CreationStep, number> = {
  input: 0,
  analyzing: 15,
  questioning: 40,
  generating: 65,
  review: 80,
  confirming: 95,
  success: 100,
};

const STEP_LABEL: Record<CreationStep, string> = {
  input: "Project brief",
  analyzing: "Reviewing request",
  questioning: "Clarifying details",
  generating: "Preparing project plan",
  review: "Plan review",
  confirming: "Creating project",
  success: "Completed",
};

function ProgressBar({ step }: { step: CreationStep }) {
  const progress = STEP_PROGRESS[step];
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{STEP_LABEL[step]}</span>
        <span className="text-xs font-bold text-slate-700">{progress}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface WorkspaceAiProjectCreationFlowProps {
  workspaceId?: string;
  workspaceName?: string | null;
  backHref: string;
  backLabel: string;
}

export default function WorkspaceAiProjectCreationFlow({
  workspaceId,
  workspaceName,
  backHref,
  backLabel,
}: WorkspaceAiProjectCreationFlowProps) {
  const router = useRouter();
  const wsId = workspaceId ?? "";

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

  const handleSubmitDescription = async () => {
    if (!description.trim() || !wsId) return;
    setStep("analyzing");
    try {
      const result = await WorkspaceAiService.analyzeDescription(wsId, description.trim());
      setAnalyzeResult(result);
      setCollected({ description: description.trim() });
      setCurrentQuestionIdx(0);
      setStep("questioning");
    } catch {
      toast.error("Unable to analyze the request right now. Please try again.");
      setStep("input");
    }
  };

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
    } catch {
      toast.error("Unable to prepare the project plan. Please try again.");
      setStep("questioning");
    }
  };

  const handleAnswer = async (question: AiQuestion, value: string) => {
    const nextCollected = { ...collected };

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
      await generatePlan(nextCollected);
    }
  };

  const handleSkip = async (question: AiQuestion) => {
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
      toast.success("Project created successfully.");
    } catch {
      toast.error("Unable to create the project. Please try again.");
      setStep("review");
    }
  };

  const questions = analyzeResult?.questions ?? [];
  const currentQuestion = questions[currentQuestionIdx];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <button
        type="button"
        onClick={() => router.push(backHref)}
        className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={14} />
        {backLabel}
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-blue-600 shadow-sm">
          <Briefcase size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Project planning assistant</h1>
          <p className="text-sm text-slate-400">
            {workspaceName ? `Workspace: ${workspaceName}` : "Loading workspace..."}
          </p>
        </div>
      </div>

      <ProgressBar step={step} />

      {step === "input" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-900">
            Describe the project brief
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Provide a concise summary. The assistant will ask for any missing details.
          </p>
          <textarea
            autoFocus
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmitDescription();
            }}
            placeholder="Example: Build a personal finance platform for web and mobile with budgeting, reports, and approval workflows."
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">Press Ctrl+Enter to submit</span>
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
              Submit brief
            </button>
          </div>
        </div>
      )}

      {step === "analyzing" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <Loader2 size={36} className="mb-4 animate-spin text-slate-700" />
          <p className="font-semibold text-slate-800">Reviewing the project brief...</p>
          <p className="mt-1 text-sm text-slate-500">This usually takes 5-15 seconds.</p>
        </div>
      )}

      {step === "questioning" && currentQuestion && (
        <div className="space-y-4">
          {analyzeResult?.understood && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Request summary
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {analyzeResult.understood.projectName}
              </p>
              {analyzeResult.understood.features.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {analyzeResult.understood.features.slice(0, 4).map((f) => (
                    <span
                      key={f}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700"
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
            onSkip={currentQuestion.field !== "teamMembers" ? () => handleSkip(currentQuestion) : undefined}
            onClose={() => router.push(backHref)}
          />
        </div>
      )}

      {step === "generating" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <div className="relative mb-4">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-100 border-t-slate-800" />
          </div>
          <p className="font-semibold text-slate-800">Preparing the project plan...</p>
          <p className="mt-1 text-sm text-slate-400">
            Building sprint structure, work items, and staffing recommendations. This can take 15-30 seconds.
          </p>
        </div>
      )}

      {step === "review" && generatedPlan && (
        <ProjectPlanReview
          plan={generatedPlan}
          members={selectedMembers}
          onConfirm={handleConfirm}
          onBack={() => setStep("questioning")}
          isConfirming={false}
        />
      )}

      {step === "confirming" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <Loader2 size={36} className="mb-4 animate-spin text-slate-700" />
          <p className="font-semibold text-slate-800">Creating the project...</p>
          <p className="mt-1 text-sm text-slate-400">
            Saving the project, sprints, and tasks in a single transaction.
          </p>
        </div>
      )}

      {step === "success" && successData && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 py-16 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 shadow-lg">
            <Check size={32} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Project created successfully</h2>
          <p className="mt-1 text-sm text-slate-500">
            Project key: <span className="font-bold text-slate-900">{successData.projectKey}</span>
          </p>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => router.push(successData.projectUrl)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Building2 size={15} />
              Open project
            </button>
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Return
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
