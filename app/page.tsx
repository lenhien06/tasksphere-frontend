"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, LayoutGroup } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import {
  Buildings,
  Briefcase,
  ChartBar,
  CheckCircle,
  Clock,
  Eye,
  FileMagnifyingGlass,
  GearSix,
  GitBranch,
  CaretRight,
  LockKey,
  ShieldCheck,
  UserGear,
  UsersThree
} from "@phosphor-icons/react";

// ─── Types ─────────────────────────────────────────────────────────────────

type ColId = "backlog" | "progress" | "review" | "done";

interface Task {
  id: string;
  title: string;
  tag: string;
  tagClass: string;
  dot: string;
  avatar: string;
  avatarGrad: string;
  priority?: "high" | "medium" | "low";
}

// ─── Data ──────────────────────────────────────────────────────────────────

const TASKS: Record<string, Task> = {
  t1: { id: "t1", title: "Design system audit",    tag: "Design",  tagClass: "bg-violet-500/20 text-violet-300", dot: "bg-violet-400", avatar: "KL", avatarGrad: "from-violet-500 to-purple-600",  priority: "high" },
  t2: { id: "t2", title: "API integration sprint", tag: "Backend", tagClass: "bg-blue-500/20 text-blue-300",     dot: "bg-blue-400",   avatar: "AM", avatarGrad: "from-blue-500 to-blue-600",      priority: "medium" },
  t3: { id: "t3", title: "Mobile wireframes",      tag: "UI/UX",   tagClass: "bg-pink-500/20 text-pink-300",     dot: "bg-pink-400",   avatar: "JD", avatarGrad: "from-pink-500 to-rose-600",     priority: "low" },
  t4: { id: "t4", title: "Deploy v2.4 to prod",    tag: "DevOps",  tagClass: "bg-amber-500/20 text-amber-300",   dot: "bg-amber-400",  avatar: "KL", avatarGrad: "from-amber-500 to-orange-600",  priority: "high" },
  t5: { id: "t5", title: "Write unit tests",       tag: "QA",      tagClass: "bg-emerald-500/20 text-emerald-300", dot: "bg-emerald-400", avatar: "JD", avatarGrad: "from-emerald-500 to-teal-600", priority: "medium" },
  t6: { id: "t6", title: "Database migration",     tag: "Backend", tagClass: "bg-blue-500/20 text-blue-300",     dot: "bg-blue-400",   avatar: "AM", avatarGrad: "from-blue-500 to-cyan-600",     priority: "high" },
};

const INITIAL_COLS: Record<ColId, string[]> = {
  backlog:  ["t1", "t3", "t5"],
  progress: ["t2", "t6"],
  review:   [],
  done:     ["t4"],
};

const MOVE_SEQUENCE: [string, ColId, ColId][] = [
  ["t1", "backlog",  "progress"],
  ["t2", "progress", "review"],
  ["t6", "progress", "review"],
  ["t3", "backlog",  "progress"],
  ["t2", "review",   "done"],
  ["t6", "review",   "done"],
  ["t5", "backlog",  "progress"],
  ["t3", "progress", "review"],
];

const COL_CONFIG: { id: ColId; label: string; dot: string; dotColor: string }[] = [
  { id: "backlog",  label: "Backlog",     dot: "bg-white/25",    dotColor: "border-white/10" },
  { id: "progress", label: "In Progress", dot: "bg-blue-400",    dotColor: "border-blue-400/30" },
  { id: "review",   label: "In Review",   dot: "bg-violet-400",  dotColor: "border-violet-400/30" },
  { id: "done",     label: "Done",        dot: "bg-emerald-400", dotColor: "border-emerald-400/30" },
];

const PRIORITY_DOT: Record<string, string> = {
  high:   "bg-red-400",
  medium: "bg-amber-400",
  low:    "bg-green-400",
};

// ─── Animated Kanban Component ─────────────────────────────────────────────

function AnimatedKanban() {
  const [cols, setCols]       = useState<Record<ColId, string[]>>(INITIAL_COLS);
  const [dragging, setDragging]   = useState<string | null>(null);
  const [highlight, setHighlight] = useState<ColId | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stepIndex  = 0;

    const runNext = () => {
      if (cancelled) return;

      if (stepIndex >= MOVE_SEQUENCE.length) {
        // pause then reset
        setTimeout(() => {
          if (cancelled) return;
          setCols(INITIAL_COLS);
          setDragging(null);
          setHighlight(null);
          stepIndex = 0;
          setTimeout(runNext, 2000);
        }, 1200);
        return;
      }

      const [taskId, fromCol, toCol] = MOVE_SEQUENCE[stepIndex];

      // pick up
      setDragging(taskId);
      setHighlight(toCol);

      setTimeout(() => {
        if (cancelled) return;
        // drop
        setCols(prev => {
          const n = { ...prev };
          n[fromCol] = n[fromCol].filter(id => id !== taskId);
          n[toCol]   = [...n[toCol], taskId];
          return n;
        });
        setTimeout(() => {
          if (cancelled) return;
          setDragging(null);
          setHighlight(null);
          stepIndex++;
          setTimeout(runNext, 1100);
        }, 350);
      }, 850);
    };

    const t = setTimeout(runNext, 1800);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#080f1e] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
      {/* Glow behind board */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-blue-600/10 via-transparent to-violet-600/10 pointer-events-none" />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
          </div>
          <div className="w-px h-4 bg-white/10" />
          <span className="text-white/55 text-xs font-semibold">Sprint 4 · Kanban Board</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {["from-violet-500 to-purple-600","from-blue-500 to-blue-600","from-emerald-500 to-teal-600"].map((g, i) => (
              <div key={i} className={`w-6 h-6 rounded-full bg-gradient-to-br ${g} border-2 border-[#080f1e] flex items-center justify-center text-white text-[8px] font-bold`}>
                {["K","A","J"][i]}
              </div>
            ))}
          </div>
          <span className="text-white/25 text-[11px]">6 tasks</span>
        </div>
      </div>

      {/* Columns */}
      <LayoutGroup>
        <div className="grid grid-cols-4 divide-x divide-white/[0.06] min-h-[300px] p-1">
          {COL_CONFIG.map(col => {
            const isTarget = highlight === col.id;
            return (
              <motion.div
                key={col.id}
                animate={{ backgroundColor: isTarget ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0)" }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col gap-2 p-3 rounded-xl transition-all ${isTarget ? `ring-1 ring-inset ${col.dotColor}` : ""}`}
              >
                {/* Column header */}
                <div className="flex items-center gap-1.5 px-0.5 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                  <span className="text-white/35 text-[9px] font-bold uppercase tracking-widest">{col.label}</span>
                  <span className="ml-auto text-white/20 text-[9px]">{cols[col.id].length}</span>
                </div>

                {/* Drop zone indicator */}
                {isTarget && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 40 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg border border-dashed border-white/20 flex items-center justify-center flex-shrink-0"
                  >
                    <span className="text-white/20 text-[10px]">Drop here</span>
                  </motion.div>
                )}

                {/* Cards */}
                {cols[col.id].map(taskId => {
                  const task    = TASKS[taskId];
                  const isDragging = dragging === taskId;

                  return (
                    <motion.div
                      key={taskId}
                      layoutId={taskId}
                      layout="position"
                      animate={{
                        scale:     isDragging ? 1.05  : 1,
                        rotate:    isDragging ? -2    : 0,
                        zIndex:    isDragging ? 100   : 1,
                        boxShadow: isDragging
                          ? "0 24px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.4)"
                          : "0 1px 4px rgba(0,0,0,0.4)",
                      }}
                      transition={{
                        layout:    { type: "spring", stiffness: 280, damping: 30 },
                        scale:     { duration: 0.18 },
                        rotate:    { duration: 0.18 },
                      }}
                      className={`relative rounded-xl p-3 border select-none cursor-grab ${
                        isDragging
                          ? "bg-[#141e38] border-indigo-400/50"
                          : col.id === "done"
                            ? "bg-white/[0.025] border-white/[0.05] opacity-50"
                            : "bg-white/[0.05] border-white/[0.08]"
                      }`}
                    >
                      {/* Cursor indicator */}
                      {isDragging && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute -top-2.5 -right-2.5 z-10 drop-shadow-lg"
                        >
                          <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                            <path d="M1 1L1 17L5 13L8 20L10.5 19L7.5 12H13L1 1Z" fill="white" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinejoin="round"/>
                          </svg>
                        </motion.div>
                      )}

                      {/* Title row */}
                      <div className="flex items-start gap-2 mb-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[3px] ${task.dot}`} />
                        <p className={`text-[11px] font-medium leading-snug flex-1 ${col.id === "done" ? "line-through text-white/35" : "text-white/80"}`}>
                          {task.title}
                        </p>
                      </div>

                      {/* Footer row */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${task.tagClass}`}>{task.tag}</span>
                          {task.priority && (
                            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} title={task.priority} />
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${task.avatarGrad} flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0`}>
                          {task.avatar}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.13 } },
};

export default function LandingPage() {
  const { i18n } = useTranslation();
  const isVi = (i18n.resolvedLanguage || i18n.language || "en").startsWith("vi");
  const tr = (en: string, _vi: string) => en;

  const switchLanguage = (lang: "en" | "vi") => {
    i18n.changeLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("tasksphere_language", lang);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-[#020617] dark:text-gray-100 font-sans selection:bg-blue-500/30 overflow-hidden [&_h1]:break-words [&_h2]:break-words [&_h3]:break-words [&_p]:break-words [&_h1]:leading-[1.14] [&_h2]:leading-[1.2] [&_h3]:leading-[1.25]">

      {/* Ambient */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.08)_0%,rgba(0,0,0,0)_70%)] pointer-events-none z-0" />

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200/60 bg-white/80 dark:border-white/5 dark:bg-[#020617]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/images/logo.png" alt="TaskSphere" width={36} height={36}
              className="object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform duration-300" />
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">TaskSphere</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400">
            <Link href="#solution" className="hover:text-gray-900 dark:hover:text-white transition-colors">{tr("Solution", "Giải pháp")}</Link>
            <Link href="#security" className="hover:text-gray-900 dark:hover:text-white transition-colors">{tr("Security", "Bảo mật")}</Link>
            <Link href="/signin" className="hover:text-gray-900 dark:hover:text-white transition-colors">{tr("Sign In", "Đăng nhập")}</Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center rounded-md border border-gray-200/60 bg-gray-100/70 dark:border-white/15 dark:bg-white/5 p-0.5">
              <button
                onClick={() => switchLanguage("en")}
                className={`inline-flex h-8 items-center px-2 text-xs rounded ${!isVi ? "bg-white text-black" : "text-gray-600 dark:text-gray-300"}`}
              >
                EN
              </button>
              <button
                onClick={() => switchLanguage("vi")}
                className={`inline-flex h-8 items-center px-2 text-xs rounded ${isVi ? "bg-white text-black" : "text-gray-600 dark:text-gray-300"}`}
              >
                VI
              </button>
            </div>
            <ThemeToggle />
            <Link href="/signup">
              <button className="bg-blue-600 text-white hover:bg-blue-700 font-semibold text-sm px-5 py-2.5 rounded-lg transition-all shadow-[0_8px_20px_rgba(37,99,235,0.35)]">
                {tr("Get Started Free", "Bắt đầu miễn phí")}
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20">

        {/* ── Hero ── */}
        <section className="px-6 text-center pt-10 pb-24">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-5xl mx-auto">

            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium backdrop-blur-md">
              <Buildings size={15} weight="duotone" />
              {tr("Agile solution for businesses", "Giải pháp Agile cho doanh nghiệp")}
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-[54px] lg:text-[58px] font-bold tracking-tight mb-6 leading-[1.12]">
              {tr("Comprehensive Project", "Giải Pháp Quản Lý Dự Án")}<br className="hidden sm:block" />
              <span className="sm:hidden"> </span>{tr("Management Solution —", "Toàn Diện —")}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
                {tr("Optimize Team Performance from Day One", "Tối Ưu Hóa Hiệu Suất Ngay Từ Ngày Đầu Tiên")}
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-gray-600 dark:text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              {tr(
                "TaskSphere is an Agile-based work and project management platform for growing businesses. Align workflows and boost team efficiency from day one.",
                "TaskSphere là nền tảng quản trị công việc và dự án theo chuẩn Agile cho doanh nghiệp vừa và nhỏ. Giúp đội ngũ đồng bộ quy trình và bứt phá hiệu suất ngay từ ngày đầu."
              )}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link href="/signup" className="w-full sm:w-auto">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.35)] text-base w-full flex items-center justify-center gap-2 group">
                  {tr("Start Free Trial", "Bắt Đầu Trải Nghiệm Miễn Phí")} <CaretRight className="group-hover:translate-x-1 transition-transform" size={18} weight="bold" />
                </button>
              </Link>
              <Link href="/signup?demo=1" className="w-full sm:w-auto">
                <button className="bg-transparent border border-gray-300 hover:bg-gray-100/70 dark:border-gray-700 dark:hover:bg-white/5 text-gray-900 dark:text-white font-semibold px-8 py-4 rounded-lg transition-all text-base w-full">
                  {tr("Request Product Demo", "Yêu Cầu Demo Sản Phẩm")}
                </button>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
              <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <span className="text-blue-400">🚀</span> {tr("Trusted by thousands of professionals", "Đồng hành cùng hàng ngàn nhân sự")}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <span className="text-blue-400">⚡</span> {tr("99.5% uptime commitment", "Cam kết thời gian hoạt động 99.5%")}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <span className="text-blue-400">⏱️</span> {tr("Smooth operations, instant response", "Vận hành mượt mà, phản hồi tức thì")}
              </span>
            </motion.div>

            {/* Animated Kanban hero */}
            <motion.div variants={fadeUp} className="relative max-w-5xl mx-auto">
              <div className="absolute -inset-3 bg-gradient-to-r from-blue-600/20 via-violet-600/15 to-cyan-600/20 rounded-3xl blur-2xl opacity-60 pointer-events-none" />
              <AnimatedKanban />
            </motion.div>

          </motion.div>
        </section>

        {/* ── SECTION 1: Vấn đề doanh nghiệp ── */}
        <section id="problems" className="pt-20 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 p-10 rounded-[28px] bg-gradient-to-br from-white to-blue-100 dark:from-[#0F172A] dark:to-[#020617] border border-gray-300/80 dark:border-white/10 shadow-[0_10px_28px_rgba(2,6,23,0.10)]">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6">
                <Briefcase size={24} weight="duotone" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-5">
                {tr("Is your business facing these challenges?", "Doanh nghiệp của bạn có đang đối mặt với những thách thức này?")}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {tr("When information is fragmented and execution lacks control, progress slows down and teams lose time.", "Khi thông tin phân tán và quy trình thiếu kiểm soát, tiến độ dễ chệch hướng và đội ngũ phải trả giá bằng thời gian.")}
              </p>
            </div>

            <div className="lg:col-span-7 rounded-[28px] bg-white dark:bg-[#0F172A] border border-gray-300/80 dark:border-white/10 p-8 md:p-10 shadow-[0_10px_28px_rgba(2,6,23,0.10)]">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0"><Clock size={18} weight="duotone" /></div>
                  <div>
                    <h3 className="font-semibold text-xl mb-1">{tr("Lack of progress visibility", "Thiếu minh bạch tiến độ")}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{tr("Work is assigned but hard to track, causing delays and blurred accountability.", "Đã giao việc nhưng khó theo dõi, dẫn đến chậm trễ và đùn đẩy trách nhiệm.")}</p>
                  </div>
                </div>
                <div className="h-px bg-gray-200 dark:bg-white/10" />
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0"><GitBranch size={18} weight="duotone" /></div>
                  <div>
                    <h3 className="font-semibold text-xl mb-1">{tr("Misaligned execution plans", "Kế hoạch thiếu đồng bộ")}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{tr("Plenty of planning meetings, but inconsistent execution and poor outcome control.", "Họp chiến lược nhiều nhưng thực thi thiếu nhịp, khó kiểm soát kết quả.")}</p>
                  </div>
                </div>
                <div className="h-px bg-gray-200 dark:bg-white/10" />
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0"><FileMagnifyingGlass size={18} weight="duotone" /></div>
                  <div>
                    <h3 className="font-semibold text-xl mb-1">{tr("Fragmented data", "Dữ liệu bị phân mảnh")}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{tr("Documents spread across channels make lookup and reporting slow.", "Tài liệu nằm rải rác qua nhiều kênh, mất thời gian tra cứu và tổng hợp.")}</p>
                  </div>
                </div>
                <div className="h-px bg-gray-200 dark:bg-white/10" />
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0"><Buildings size={18} weight="duotone" /></div>
                  <div>
                    <h3 className="font-semibold text-xl mb-1">{tr("Tools that do not fit", "Công cụ chưa phù hợp")}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{tr("Either too heavy or too basic to support real management needs.", "Quá cồng kềnh hoặc quá sơ sài, không đáp ứng nhu cầu quản trị thực tế.")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: Giải pháp cốt lõi ── */}
        <section id="solution" className="pt-20 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{tr("Centralized Management — Every Essential Tool in One Platform", "Quản Trị Tập Trung — Mọi Công Cụ Doanh Nghiệp Cần Trên Một Nền Tảng")}</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              {tr("Optimize execution flow from assignment to reporting in one unified system.", "Tối ưu luồng vận hành từ giao việc đến báo cáo trong một hệ thống thống nhất.")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-10 rounded-[28px] bg-gradient-to-br from-white to-blue-100 dark:from-[#0F172A] dark:to-[#020617] border border-gray-300/80 dark:border-white/10 shadow-[0_10px_28px_rgba(2,6,23,0.10)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center"><Briefcase size={20} weight="duotone" /></div>
                <h3 className="text-2xl font-bold">{tr("Core Operating Toolkit", "Bộ công cụ vận hành cốt lõi")}</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-5 text-gray-700 dark:text-gray-300">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">{tr("Visual Kanban", "Kanban trực quan")}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tr("Track work status in real time.", "Theo dõi trạng thái công việc theo thời gian thực.")}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">{tr("Structured Sprint Planning", "Sprint bài bản")}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tr("Split phases, allocate resources, and keep execution pace.", "Chia giai đoạn, phân bổ nguồn lực và duy trì nhịp độ.")}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">{tr("Detailed Task Control", "Quản trị chi tiết")}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tr("Clear deadlines, priorities, and recurring automation.", "Rõ deadline, rõ ưu tiên, tự động hóa việc lặp lại.")}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">{tr("Centralized Communication", "Giao tiếp tập trung")}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tr("Mentions, discussions, and files inside each work item.", "Gắn thẻ, trao đổi, đính kèm ngay trong từng hạng mục.")}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 p-10 rounded-[28px] bg-white dark:bg-[#0F172A] border border-gray-300/80 dark:border-white/10 shadow-[0_10px_28px_rgba(2,6,23,0.10)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center"><ChartBar size={20} weight="duotone" /></div>
                <h3 className="text-2xl font-bold">{tr("Reporting & Customization", "Báo cáo & tùy biến")}</h3>
              </div>
              <ul className="space-y-4 text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-cyan-400 shrink-0 mt-1" size={16} weight="duotone" />
                  <span>{tr("Visualize progress and performance on dashboards.", "Trực quan tiến độ và hiệu suất theo dashboard.")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-cyan-400 shrink-0 mt-1" size={16} weight="duotone" />
                  <span>{tr("Export PDF/Excel reports for management meetings.", "Xuất báo cáo PDF/Excel cho họp quản trị.")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-cyan-400 shrink-0 mt-1" size={16} weight="duotone" />
                  <span>{tr("Customize fields by each department's workflow.", "Tùy chỉnh trường dữ liệu theo đặc thù từng phòng ban.")}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: Phân quyền hệ thống ── */}
        <section id="roles" className="pt-20 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{tr("Designed for Every Role in Your Organization", "Thiết Kế Dành Riêng Cho Từng Vai Trò Trong Tổ Chức")}</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              {tr("Clear role-based permissions improve security and accountability.", "Mô hình phân quyền rõ ràng giúp bảo mật tốt hơn và tập trung đúng trách nhiệm.")}
            </p>
          </div>

          <div className="rounded-[28px] bg-white dark:bg-[#0F172A] border border-gray-300/80 dark:border-white/10 p-8 md:p-10 shadow-[0_10px_28px_rgba(2,6,23,0.10)]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-300/80 dark:border-white/10 p-4 text-center shadow-sm">
                <div className="mb-2 flex justify-center text-blue-500 dark:text-blue-300">
                  <UserGear size={24} weight="duotone" />
                </div>
                <div className="text-sm font-semibold">{tr("Leadership / Managers", "Quản lý / Lãnh đạo")}</div>
              </div>
              <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-300/80 dark:border-white/10 p-4 text-center shadow-sm">
                <div className="mb-2 flex justify-center text-violet-500 dark:text-violet-300">
                  <UsersThree size={24} weight="duotone" />
                </div>
                <div className="text-sm font-semibold">{tr("Execution Team", "Đội ngũ thực thi")}</div>
              </div>
              <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-300/80 dark:border-white/10 p-4 text-center shadow-sm">
                <div className="mb-2 flex justify-center text-cyan-500 dark:text-cyan-300">
                  <Eye size={24} weight="duotone" />
                </div>
                <div className="text-sm font-semibold">{tr("Clients / Partners", "Khách hàng / Đối tác")}</div>
              </div>
              <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-300/80 dark:border-white/10 p-4 text-center shadow-sm">
                <div className="mb-2 flex justify-center text-emerald-500 dark:text-emerald-300">
                  <GearSix size={24} weight="duotone" />
                </div>
                <div className="text-sm font-semibold">{tr("System Admin", "Quản trị hệ thống")}</div>
              </div>
            </div>

            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-3"><CheckCircle className="text-blue-400 shrink-0 mt-1" size={16} weight="duotone" /><span>{tr("Leaders plan strategy, approve progress, and monitor performance.", "Lãnh đạo hoạch định chiến lược, phê duyệt tiến độ và theo dõi báo cáo tổng thể.")}</span></div>
              <div className="flex items-start gap-3"><CheckCircle className="text-blue-400 shrink-0 mt-1" size={16} weight="duotone" /><span>{tr("Execution teams receive clear tasks and update progress quickly.", "Đội thực thi nhận việc rõ ràng, cập nhật tiến độ nhanh và tập trung mục tiêu.")}</span></div>
              <div className="flex items-start gap-3"><CheckCircle className="text-blue-400 shrink-0 mt-1" size={16} weight="duotone" /><span>{tr("Clients follow progress transparently with view-only access.", "Khách hàng theo dõi minh bạch với quyền chỉ xem, tăng độ tin cậy dự án.")}</span></div>
              <div className="flex items-start gap-3"><CheckCircle className="text-blue-400 shrink-0 mt-1" size={16} weight="duotone" /><span>{tr("Admins control configuration, permissions, and shared resources.", "Admin kiểm soát cấu hình, phân quyền bảo mật và tài nguyên chung.")}</span></div>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: Điểm khác biệt ── */}
        <section id="differentiators" className="pt-20 px-6 max-w-7xl mx-auto">
          <div className="rounded-[28px] bg-gradient-to-br from-white to-blue-100 dark:from-[#0F172A] dark:to-[#020617] border border-gray-300/80 dark:border-white/10 p-8 md:p-10 shadow-[0_10px_28px_rgba(2,6,23,0.10)]">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-3">{tr("TaskSphere Competitive Advantage", "Lợi Thế Cạnh Tranh Của TaskSphere")}</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl">{tr("Powerful enough for management, simple enough for daily execution.", "Đủ sâu cho quản trị, đủ gọn cho đội ngũ vận hành hằng ngày.")}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <CheckCircle size={16} weight="duotone" /> {tr("Optimized for growing businesses", "Tối ưu triển khai cho doanh nghiệp tăng trưởng")}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-300/80 dark:border-white/10 p-5 shadow-sm">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">99.5%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tr("Uptime commitment", "Cam kết thời gian hoạt động")}</div>
              </div>
              <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-300/80 dark:border-white/10 p-5 shadow-sm">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">&lt;10p</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tr("Workspace setup", "Khởi tạo không gian làm việc")}</div>
              </div>
              <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-300/80 dark:border-white/10 p-5 shadow-sm">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">Realtime</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tr("System-wide realtime sync", "Đồng bộ dữ liệu toàn hệ thống")}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-3"><CheckCircle className="text-blue-400 shrink-0 mt-1" size={16} weight="duotone" /><span>{tr("Fast rollout with low training cost.", "Triển khai nhanh, chi phí đào tạo thấp.")}</span></div>
              <div className="flex items-start gap-3"><CheckCircle className="text-blue-400 shrink-0 mt-1" size={16} weight="duotone" /><span>{tr("Realtime sync, always consistent information.", "Đồng bộ tức thì, thông tin luôn nhất quán.")}</span></div>
              <div className="flex items-start gap-3"><CheckCircle className="text-blue-400 shrink-0 mt-1" size={16} weight="duotone" /><span>{tr("Optimized investment for growth-stage businesses.", "Tối ưu đầu tư cho doanh nghiệp tăng trưởng.")}</span></div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: Hạ tầng & Bảo mật ── */}
        <section id="security" className="pt-20 px-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-20">
            <div className="w-full md:w-1/2 space-y-6">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20">
                <ShieldCheck size={24} weight="duotone" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">{tr("Advanced Technology Platform — Security & Reliability", "Nền Tảng Công Nghệ Tiên Tiến — Bảo Mật & Ổn Định")}</h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                {tr("Protect business data with strict governance and stable performance under high load.", "Bảo vệ dữ liệu doanh nghiệp với chuẩn quản trị rõ ràng, sẵn sàng vận hành ổn định khi tải cao.")}
              </p>

              <ul className="space-y-4 pt-4">
                <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                  <LockKey className="text-purple-500 shrink-0 mt-1" size={20} weight="duotone" />
                  <div>
                    <strong className="block text-gray-900 dark:text-white">{tr("High-standard data protection", "Bảo vệ dữ liệu tiêu chuẩn cao")}</strong>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{tr("Modern encryption and multi-layer authentication.", "Mã hóa hiện đại và xác thực đa lớp.")}</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                  <FileMagnifyingGlass className="text-purple-500 shrink-0 mt-1" size={20} weight="duotone" />
                  <div>
                    <strong className="block text-gray-900 dark:text-white">{tr("Integrity control", "Kiểm soát tính toàn vẹn")}</strong>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{tr("Audit Trail logs preserve data integrity.", "Lưu vết thao tác (Audit Trail) để bảo toàn tính toàn vẹn.")}</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                  <ShieldCheck className="text-purple-500 shrink-0 mt-1" size={20} weight="duotone" />
                  <div>
                    <strong className="block text-gray-900 dark:text-white">{tr("Always available", "Sẵn sàng phục vụ")}</strong>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{tr("Stable operations for concurrent team access.", "Đảm bảo vận hành ổn định khi nhiều nhóm cùng truy cập.")}</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                  <ChartBar className="text-purple-500 shrink-0 mt-1" size={20} weight="duotone" />
                  <div>
                    <strong className="block text-gray-900 dark:text-white">{tr("Proactive reminders", "Nhắc việc chủ động")}</strong>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{tr("Automatically send daily report digests via email.", "Tự động tổng hợp và gửi báo cáo hằng ngày qua email.")}</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="w-full md:w-1/2">
              <div className="aspect-[4/3] rounded-2xl bg-[#030712] border border-white/10 p-6 flex flex-col justify-center shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500" />

                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3 min-w-0">
                    <ShieldCheck className="text-purple-400" size={24} weight="duotone" />
                    <div className="min-w-0">
                      <div className="text-white font-semibold text-sm leading-tight">{tr("Security & Audit", "Security & Audit")}</div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs leading-tight">{tr("Encryption, multi-layer, audit logs", "Mã hóa, đa lớp, lưu vết thao tác")}</div>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <LockKey className="text-blue-400" size={18} weight="duotone" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <LockKey className="text-blue-400 mx-auto" size={18} weight="duotone" />
                    <div className="mt-2 text-[11px] text-gray-300">{tr("Encryption", "Mã hóa")}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <CheckCircle className="text-emerald-400 mx-auto" size={18} weight="duotone" />
                    <div className="mt-2 text-[11px] text-gray-300">{tr("Authentication", "Xác thực")}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <FileMagnifyingGlass className="text-cyan-400 mx-auto" size={18} weight="duotone" />
                    <div className="mt-2 text-[11px] text-gray-300">Audit Trail</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-white/60">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  {tr("Data integrity, stable operations", "Toàn vẹn dữ liệu, vận hành ổn định")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 6: CTA cuối trang ── */}
        <section className="pt-32 pb-10 px-6">
          <div className="max-w-5xl mx-auto rounded-[32px] bg-white border border-gray-300/80 dark:bg-[#0F172A] dark:border-white/10 p-12 md:p-20 text-center relative overflow-hidden shadow-[0_10px_28px_rgba(2,6,23,0.10)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-600/20 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">{tr("Boost Operational Performance Today", "Bứt Phá Hiệu Suất Quản Trị Ngay Hôm Nay")}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-10 text-lg max-w-2xl mx-auto">
                {tr("Set up your digital workspace in under 10 minutes. Start completely free.", "Thiết lập không gian làm việc số trong chưa đầy 10 phút. Bắt đầu hoàn toàn miễn phí.")}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/signup" className="w-full sm:w-auto">
                  <button className="bg-white text-black hover:bg-gray-100 font-bold px-10 py-4 rounded-lg transition-all shadow-xl text-base w-full">
                    {tr("Create New Workspace", "Tạo Không Gian Làm Việc Mới")}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200/60 bg-white py-12 px-6 dark:border-white/10 dark:bg-[#020617]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/images/logo.png" alt="TaskSphere" width={34} height={34}
                className="object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
              <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">TaskSphere</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">{tr("TaskSphere — comprehensive management, streamlined execution.", "TaskSphere — Giải pháp quản trị toàn diện, vận hành tinh gọn.")}</p>
          </div>

          <div>
            <h4 className="text-gray-900 dark:text-white font-semibold mb-4">{tr("Features", "Tính Năng")}</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#solution" className="hover:text-blue-400 transition-colors">{tr("Solutions", "Tính Năng")}</Link></li>
              <li><Link href="#security" className="hover:text-blue-400 transition-colors">{tr("Security", "Bảo Mật")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 dark:text-white font-semibold mb-4">{tr("Information", "Thông Tin")}</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#" className="hover:text-blue-400 transition-colors">{tr("Documentation", "Tài Liệu Hướng Dẫn")}</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">{tr("Contact", "Liên Hệ")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>© 2026 TaskSphere. All rights reserved.</p>
          <div className="flex gap-4 text-gray-500">
            <Link href="#" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
