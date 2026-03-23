"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, LayoutGroup } from "framer-motion";
import {
  BarChart3, ShieldCheck, GitMerge, Lock, ChevronRight,
  Building2, Briefcase, PieChart, FileSearch, CheckCircle2, Clock
} from "lucide-react";

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
  return (
    <div className="min-h-screen bg-[#020617] text-gray-100 font-sans selection:bg-blue-500/30 overflow-hidden">

      {/* Ambient */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.08)_0%,rgba(0,0,0,0)_70%)] pointer-events-none z-0" />

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/images/logo.png" alt="TaskSphere" width={36} height={36}
              className="object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform duration-300" />
            <span className="text-xl font-bold tracking-tight text-white">TaskSphere</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#reporting" className="hover:text-white transition-colors">Analytics</Link>
            <Link href="#security" className="hover:text-white transition-colors">Security</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/signin" className="hidden sm:block text-sm font-medium text-gray-400 hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup">
              <button className="bg-white text-black hover:bg-gray-100 font-semibold text-sm px-5 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                Get Started
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
              <Building2 size={15} />
              Operations &amp; Project Management Platform
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl md:text-[66px] font-bold tracking-tight mb-6 leading-[1.12]">
              Ship faster.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
                Stay in control.
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Kanban boards, sprint planning, custom workflows, and real-time collaboration — all in one place.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/signup" className="w-full sm:w-auto">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.35)] text-base w-full flex items-center justify-center gap-2 group">
                  Sign Up Free <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />
                </button>
              </Link>
              <Link href="/signin" className="w-full sm:w-auto">
                <button className="bg-transparent border border-gray-700 hover:bg-white/5 text-white font-semibold px-8 py-4 rounded-lg transition-all text-base w-full">
                  Sign In
                </button>
              </Link>
            </motion.div>

            {/* Animated Kanban hero */}
            <motion.div variants={fadeUp} className="relative max-w-5xl mx-auto">
              <div className="absolute -inset-3 bg-gradient-to-r from-blue-600/20 via-violet-600/15 to-cyan-600/20 rounded-3xl blur-2xl opacity-60 pointer-events-none" />
              <AnimatedKanban />
            </motion.div>

          </motion.div>
        </section>

        {/* ── Features bento ── */}
        <section id="features" className="pt-20 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Solve core operational challenges</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">From task assignment to long-term planning — every process digitized and tightly controlled.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            <div className="md:col-span-8 p-10 rounded-[28px] bg-gradient-to-br from-[#0F172A] to-[#020617] border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-500 transition-transform duration-700 group-hover:scale-110"><GitMerge size={200} /></div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 relative z-10"><Briefcase size={24} /></div>
              <h3 className="text-2xl font-bold mb-4 relative z-10">Standardize Workflows</h3>
              <p className="text-gray-400 leading-relaxed max-w-xl mb-8 relative z-10">
                Define custom workflows with Kanban customization tailored to your department. Break down large objectives into granular sub-tasks for clear accountability.
              </p>
              <div className="flex flex-wrap gap-3 relative z-10">
                <span className="px-4 py-2 bg-white/5 rounded-lg text-sm font-medium text-gray-300 border border-white/10 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-blue-400" /> Cross-department Assignment
                </span>
                <span className="px-4 py-2 bg-white/5 rounded-lg text-sm font-medium text-gray-300 border border-white/10 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-blue-400" /> Task Dependency Management
                </span>
              </div>
            </div>

            <div className="md:col-span-4 p-10 rounded-[28px] bg-[#0F172A] border border-white/10 group hover:border-teal-500/30 transition-all">
              <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center text-teal-400 mb-6"><Clock size={24} /></div>
              <h3 className="text-xl font-bold mb-3">Resource Control</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                Monitor workload through time tracking. Compare estimated vs. actual time to assess team productivity.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400"><span>Project Time Budget</span><span>Used</span></div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "72%" }}
                    transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full"
                  />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Reporting & Security ── */}
        <section className="pt-32 px-6 max-w-7xl mx-auto space-y-24">

          {/* Reporting */}
          <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20" id="reporting">
            <div className="w-full md:w-1/2 space-y-6">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-500/20"><BarChart3 size={24} /></div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">Data-Driven Decision Making</h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Automatic aggregation from all projects gives management a complete overview of organizational health.
              </p>
              <ul className="space-y-4 pt-4">
                <li className="flex items-start gap-3 text-gray-300">
                  <PieChart className="text-cyan-500 shrink-0 mt-1" size={20} />
                  <div>
                    <strong className="block text-white">Centralized Dashboard</strong>
                    <span className="text-sm text-gray-400">Track progress, time costs, and bottlenecks in real time.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                  <FileSearch className="text-cyan-500 shrink-0 mt-1" size={20} />
                  <div>
                    <strong className="block text-white">Automated Report Export</strong>
                    <span className="text-sm text-gray-400">Export Sprint &amp; Performance reports to Excel/PDF for management meetings.</span>
                  </div>
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/2">
              <div className="aspect-[4/3] rounded-2xl bg-[#0F172A] border border-white/10 p-6 flex flex-col relative overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <h4 className="font-bold text-gray-200">Sprint Velocity</h4>
                  <span className="px-3 py-1 bg-white/5 text-gray-400 text-xs rounded-md">Export</span>
                </div>
                <div className="flex-1 flex items-end gap-3 px-2 pb-4">
                  {[35, 60, 45, 80, 55, 90, 70].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.8, delay: 0.1 * i, ease: "easeOut" }}
                      className="flex-1 bg-gradient-to-t from-cyan-500/30 to-blue-500/80 rounded-t relative group hover:opacity-80 transition-opacity"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{h}%</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-20" id="security">
            <div className="w-full md:w-1/2 space-y-6">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20"><ShieldCheck size={24} /></div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">Enterprise-Grade Security</h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Multi-layered security architecture protecting your organization&apos;s information assets with full transparency.
              </p>
              <ul className="space-y-4 pt-4">
                <li className="flex items-start gap-3 text-gray-300">
                  <Lock className="text-purple-500 shrink-0 mt-1" size={20} />
                  <div>
                    <strong className="block text-white">Multi-tier RBAC Permissions</strong>
                    <span className="text-sm text-gray-400">System roles (Admin/User) separate from Project roles (Manager/Member/Viewer).</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                  <FileSearch className="text-purple-500 shrink-0 mt-1" size={20} />
                  <div>
                    <strong className="block text-white">Immutable Audit Log</strong>
                    <span className="text-sm text-gray-400">100% tracking of all changes — who, what, when, and from which IP.</span>
                  </div>
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/2">
              <div className="aspect-[4/3] rounded-2xl bg-[#030712] border border-white/10 p-6 flex flex-col justify-center font-mono text-sm shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
                <div className="flex gap-1.5 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="space-y-2.5 opacity-80">
                  <div className="text-gray-500">[2026-03-12 10:45:01] <span className="text-blue-400">INFO</span> [AuditService]</div>
                  <div className="text-gray-300 ml-4">ACTION: UPDATE_TASK_STATUS</div>
                  <div className="text-gray-300 ml-4">USER: &quot;nguyen.tran&quot; (ID: 8492) | ROLE: PM</div>
                  <div className="text-gray-300 ml-4">TARGET: Task-102 &quot;Budget Approval&quot;</div>
                  <div className="text-yellow-400 ml-4">DATA: {`{ from: "REVIEW", to: "DONE" }`}</div>
                  <div className="text-green-400 ml-4">STATUS: PERSISTED_SUCCESSFULLY</div>
                  <p className="animate-pulse mt-3 text-white/60">_</p>
                </div>
              </div>
            </div>
          </div>

        </section>

        {/* ── CTA ── */}
        <section className="pt-32 pb-10 px-6">
          <div className="max-w-5xl mx-auto rounded-[32px] bg-[#0F172A] border border-white/10 p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-600/20 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Elevate your operations today</h2>
              <p className="text-gray-400 mb-10 text-lg max-w-2xl mx-auto">
                Fully digitize your workflows, eliminate bottlenecks, and ensure seamless information flow across your organization.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/signup" className="w-full sm:w-auto">
                  <button className="bg-white text-black hover:bg-gray-100 font-bold px-10 py-4 rounded-lg transition-all shadow-xl text-base w-full">
                    Sign Up Free
                  </button>
                </Link>
                <Link href="/signin" className="w-full sm:w-auto">
                  <button className="bg-transparent border border-white/20 hover:bg-white/5 text-white font-bold px-10 py-4 rounded-lg transition-all text-base w-full">
                    Sign In
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 bg-[#020617] py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/images/logo.png" alt="TaskSphere" width={34} height={34}
                className="object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
              <span className="font-bold text-white text-lg tracking-tight">TaskSphere</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">Comprehensive task and project management built for teams who move fast.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#features" className="hover:text-blue-400 transition-colors">Kanban Boards</Link></li>
              <li><Link href="#features" className="hover:text-blue-400 transition-colors">Sprint Planning</Link></li>
              <li><Link href="#reporting" className="hover:text-blue-400 transition-colors">Analytics</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Documentation</Link></li>
              <li><Link href="#security" className="hover:text-blue-400 transition-colors">Security</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>© 2026 TaskSphere. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-gray-300 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
