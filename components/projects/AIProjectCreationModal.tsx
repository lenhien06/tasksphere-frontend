"use client";

import React, { useState, useRef, useCallback } from "react";
import { X, Sparkles, Upload, CheckCircle2, AlertCircle, MessageSquare, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface RequirementCheck {
    id: "projectName" | "projectDescription" | "deadline";
    label: string;
    met: boolean;
}

interface UploadedFile {
    id: string;
    name: string;
    size: number;
}

interface AIChatMessage {
    role: "assistant" | "user";
    content: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function parseRequirements(prompt: string): RequirementCheck[] {
    const lower = prompt.toLowerCase();
    return [
        {
            id: "projectName",
            label: "Project Name",
            met:
                /project\s*(name|title)\s*[:\-]?\s*\S+/.test(lower) ||
                /name\s*[:\-]\s*\S+/.test(lower),
        },
        {
            id: "projectDescription",
            label: "Project Description",
            met:
                prompt.split(/\s+/).length >= 12 &&
                (/description\s*[:\-]/.test(lower) || prompt.length >= 60),
        },
        {
            id: "deadline",
            label: "Deadline",
            met: /deadline\s*[:\-]?\s*\d{4}/.test(lower) || /\d{4}-\d{2}-\d{2}/.test(prompt),
        },
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function RequirementItem({ label, met }: { label: string; met: boolean }) {
    return (
        <div className="flex items-center gap-2 py-1.5">
            {met ? (
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            ) : (
                <span className="text-[11px] font-black text-red-500 shrink-0 flex items-center justify-center w-3.5 h-3.5">[X]</span>
            )}
            <span className={cn("text-[13px] font-medium", met ? "text-slate-700" : "text-slate-500")}>
                {label}
            </span>
        </div>
    );
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
                enabled ? "bg-purple-600" : "bg-slate-200"
            )}
            role="switch"
            aria-checked={enabled}
        >
            <span
                className={cn(
                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform duration-200",
                    enabled ? "translate-x-4" : "translate-x-1"
                )}
            />
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface AIProjectCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Placeholder: called when Generate & Create Project is clicked */
    onGenerate?: (data: {
        prompt: string;
        files: UploadedFile[];
        handleFallbacks: boolean;
    }) => void | Promise<void>;
}

export function AIProjectCreationModal({
    isOpen,
    onClose,
    onGenerate,
}: AIProjectCreationModalProps) {
    // ── State ──────────────────────────────────────────────────────────────
    const [prompt, setPrompt] = useState("");
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [handleFallbacks, setHandleFallbacks] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
        { role: "assistant", content: "AI Assistant: Analyze prompt.." },
        { role: "assistant", content: "Waiting for details." },
    ]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Derived State ──────────────────────────────────────────────────────
    const requirements = parseRequirements(prompt);
    const allRequirementsMet = requirements.every((r) => r.met);

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newFiles: UploadedFile[] = files.map((f) => ({
            id: `${f.name}-${Date.now()}`,
            name: f.name,
            size: f.size,
        }));
        setUploadedFiles((prev) => [...prev, ...newFiles]);
        // Reset file input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const handleRemoveFile = useCallback((id: string) => {
        setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!allRequirementsMet || isGenerating) return;
        setIsGenerating(true);
        setChatMessages((prev) => [
            ...prev,
            { role: "assistant", content: "AI Assistant: Processing your requirements..." },
        ]);
        try {
            // Placeholder – wire real API here
            await onGenerate?.({ prompt, files: uploadedFiles, handleFallbacks });
            toast.success("Project đã được tạo thành công bởi AI!");
            onClose();
        } catch (err: any) {
            toast.error(err?.message || "Lỗi khi tạo dự án bằng AI.");
            setChatMessages((prev) => [
                ...prev,
                { role: "assistant", content: "AI Assistant: An error occurred. Please try again." },
            ]);
        } finally {
            setIsGenerating(false);
        }
    }, [allRequirementsMet, isGenerating, onGenerate, prompt, uploadedFiles, handleFallbacks, onClose]);

    const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setPrompt(val);
        // Live feedback in chat area
        if (val.trim().length > 10) {
            setChatMessages([
                { role: "assistant", content: "AI Assistant: Analyzing your prompt in real-time..." },
                { role: "assistant", content: `Detected ${val.split(/\s+/).filter(Boolean).length} words. Keep adding details.` },
            ]);
        } else {
            setChatMessages([
                { role: "assistant", content: "AI Assistant: Analyze prompt.." },
                { role: "assistant", content: "Waiting for details." },
            ]);
        }
    }, []);

    // ── Backdrop click handler ─────────────────────────────────────────────
    const handleBackdropClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose]
    );

    if (!isOpen) return null;

    return (
        /* ── Backdrop ── */
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={handleBackdropClick}
        >
            {/* ── Modal Panel ── */}
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center shadow-md shadow-purple-500/20">
                            <Sparkles size={14} className="text-white" />
                        </div>
                        <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
                            AI-Powered Project Creation
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="flex flex-col gap-4 p-6 overflow-y-auto max-h-[70vh]">

                    {/* ── Top two-column section ── */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

                        {/* ── Left: Prompt textarea (3/5) ── */}
                        <div className="md:col-span-3 flex flex-col gap-1.5">
                            <label className="text-[12px] font-bold text-slate-700">
                                Describe your project or paste requirements{" "}
                                <span className="text-slate-400 font-normal">(Prompt for AI)</span>
                            </label>
                            <textarea
                                id="ai-project-prompt"
                                value={prompt}
                                onChange={handlePromptChange}
                                placeholder={
                                    "Example: Scrum workflow for e-commerce backend.\nProject Name: Alpha.\nDeadline: 2026-06-30."
                                }
                                rows={8}
                                className="w-full resize-none rounded-xl border border-blue-200 bg-white px-3.5 py-3 text-[13px] text-slate-700 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all leading-relaxed shadow-sm"
                            />
                        </div>

                        {/* ── Right: Requirements checklist (2/5) ── */}
                        <div className="md:col-span-2 flex flex-col gap-2">
                            <label className="text-[12px] font-bold text-slate-700">
                                Required Project Requirements Status
                            </label>
                            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 flex flex-col gap-0.5">
                                {requirements.map((req) => (
                                    <RequirementItem key={req.id} label={req.label} met={req.met} />
                                ))}
                                {allRequirementsMet && (
                                    <p className="mt-2 text-[11px] font-bold text-emerald-600">
                                        ✓ All requirements met!
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── AI Chat Feedback Area ── */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                            <MessageSquare size={12} className="text-slate-400" />
                            <label className="text-[12px] font-bold text-slate-700">
                                AI Chat Feedback Area
                            </label>
                        </div>
                        <div
                            id="ai-chat-feedback"
                            aria-readonly="true"
                            className="w-full min-h-[88px] rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-[13px] text-slate-600 leading-relaxed space-y-1 select-none"
                        >
                            {chatMessages.map((msg, idx) => (
                                <p key={idx} className={cn("font-medium", msg.role === "assistant" ? "text-slate-500" : "text-blue-600")}>
                                    {msg.content}
                                </p>
                            ))}
                            {isGenerating && (
                                <p className="flex items-center gap-1.5 text-purple-600 font-semibold animate-pulse">
                                    <Loader2 size={12} className="animate-spin" />
                                    Generating your project...
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Bottom Action Bar ── */}
                <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex-wrap">

                    {/* Upload */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                            ref={fileInputRef}
                            type="file"
                            id="ai-project-file-upload"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                            accept=".pdf,.doc,.docx,.txt,.md"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 text-[12px] font-bold hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap"
                        >
                            <Upload size={13} />
                            Upload Files (Tải tệp lên)
                        </button>
                    </div>

                    {/* File chips */}
                    <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                        {uploadedFiles.map((file) => (
                            <span
                                key={file.id}
                                className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-600 whitespace-nowrap"
                            >
                                {file.name}
                                <button
                                    onClick={() => handleRemoveFile(file.id)}
                                    className="ml-0.5 h-4 w-4 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    aria-label={`Remove ${file.name}`}
                                >
                                    <X size={9} strokeWidth={3} />
                                </button>
                            </span>
                        ))}
                    </div>

                    {/* Fallback toggle */}
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <span className="text-[12px] font-bold text-slate-600 whitespace-nowrap">
                            Handle Fallbacks automatically?
                        </span>
                        <ToggleSwitch
                            enabled={handleFallbacks}
                            onToggle={() => setHandleFallbacks((v) => !v)}
                        />
                    </div>

                    {/* Generate button — full width in its own row */}
                    <div className="w-full flex justify-end mt-0.5">
                        <button
                            id="ai-generate-project-btn"
                            disabled={!allRequirementsMet || isGenerating}
                            onClick={handleGenerate}
                            className={cn(
                                "flex items-center gap-2 h-9 px-5 rounded-xl text-[13px] font-bold transition-all",
                                allRequirementsMet && !isGenerating
                                    ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/25 active:scale-95"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-70"
                            )}
                        >
                            {isGenerating && <Loader2 size={14} className="animate-spin" />}
                            Generate &amp; Create Project (Tạo và Bắt đầu dự án)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER BUTTON (standalone, reusable)
// ─────────────────────────────────────────────────────────────────────────────

interface AIProjectTriggerButtonProps {
    onClick: () => void;
    className?: string;
}

export function AIProjectTriggerButton({ onClick, className }: AIProjectTriggerButtonProps) {
    return (
        <div className={className}>
            <button
                id="ai-create-project-trigger"
                onClick={onClick}
                className="flex items-center gap-2 h-[38px] px-4 bg-white border-2 border-purple-400 text-purple-700 rounded-xl text-[13px] font-bold hover:bg-purple-50 hover:border-purple-500 transition-all shadow-sm shadow-purple-200 active:scale-95 whitespace-nowrap"
            >
                <Sparkles size={15} className="text-purple-500" />
                Tạo dự án mới với AI
            </button>
        </div>
    );
}
