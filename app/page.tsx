"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  BarChart3,
  ShieldCheck,
  Users,
  GitMerge,
  Lock,
  ChevronRight,
  Building2,
  Briefcase,
  PieChart,
  FileSearch,
  CheckCircle2,
  Clock
} from "lucide-react";

export default function EnterpriseLandingPage() {
  // Animation Variants
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-gray-100 font-sans selection:bg-blue-500/30 overflow-hidden">

      {/* Background Ambient Effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[100%] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.08)_0%,rgba(0,0,0,0)_70%)] pointer-events-none z-0"></div>

      {/* ————————————————— HEADER ————————————————— */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 flex items-center justify-center transition-all">
              <Image
                src="/images/logo.png"
                alt="TaskSphere Logo"
                width={38}
                height={38}
                className="object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">TaskSphere</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#operations" className="hover:text-white transition-colors">Operations</Link>
            <Link href="#reporting" className="hover:text-white transition-colors">Reporting & Analytics</Link>
            <Link href="#security" className="hover:text-white transition-colors">Enterprise Security</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/signin" className="hidden sm:block text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/signup">
              <button className="bg-white text-black hover:bg-gray-200 font-semibold text-sm px-6 py-2.5 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20">

        {/* ————————————————— HERO SECTION ————————————————— */}
        <section className="px-6 text-center pt-10 pb-20">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="max-w-5xl mx-auto">

            <motion.div variants={fadeUpVariants} className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium backdrop-blur-md">
              <Building2 size={16} />
              Operations & Project Progress Management Platform
            </motion.div>

            <motion.h1 variants={fadeUpVariants} className="text-5xl md:text-[68px] font-bold tracking-tight mb-8 leading-[1.15]">
              Transparent Progress. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
                Full Resource Control.
              </span>
            </motion.h1>

            <motion.p variants={fadeUpVariants} className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto mb-12 leading-relaxed">
              Break down departmental silos with a centralized digital workspace. Tightly manage workflows, track time costs, and ensure absolute data security for your organization.
            </motion.p>

            <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link href="/signup" className="w-full sm:w-auto">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] text-base w-full flex items-center justify-center gap-2 group">
                  Sign Up Free <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />
                </button>
              </Link>
              <Link href="/signin" className="w-full sm:w-auto">
                <button className="bg-transparent border border-gray-700 hover:bg-white/5 text-white font-semibold px-8 py-4 rounded-lg transition-all text-base w-full flex items-center justify-center gap-2">
                  Sign In
                </button>
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUpVariants}
              className="relative max-w-6xl mx-auto"
            >
              {/* Glow behind image */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-2xl blur-2xl opacity-50"></div>

              {/* Image frame */}
              <div className="relative rounded-2xl border border-white/10 bg-[#0B1221]/80 p-2 lg:p-4 backdrop-blur-xl shadow-2xl">
                 <div className="w-full aspect-[16/9] lg:aspect-[21/9] overflow-hidden relative">
                    <Image
                        src="/images/page.png"
                        alt="TaskSphere Dashboard Interface"
                        fill
                        priority
                        className="object-cover object-top opacity-100"
                    />
                 </div>
              </div>
            </motion.div>

          </motion.div>

          {/* NFR Metrics */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="mt-24 pt-10 border-t border-white/5 max-w-5xl mx-auto"
          >
            <p className="text-sm text-gray-500 font-medium mb-8 uppercase tracking-widest">MEETING THE HIGHEST OPERATIONAL STANDARDS</p>
            <div className="flex flex-wrap justify-center gap-10 md:gap-20 opacity-70 grayscale">
              <div className="flex items-center gap-2 text-xl font-bold"><ShieldCheck size={24}/> GDPR Compliant</div>
              <div className="flex items-center gap-2 text-xl font-bold"><Clock size={24}/> 99.9% Uptime</div>
              <div className="flex items-center gap-2 text-xl font-bold"><Lock size={24}/> Encrypted Data</div>
              <div className="flex items-center gap-2 text-xl font-bold"><Users size={24}/> Scales to 10k+ Users</div>
            </div>
          </motion.div>
        </section>

        {/* ————————————————— BENTO GRID: OPERATIONS ————————————————— */}
        <section id="operations" className="pt-20 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Solve Core Operational Challenges</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">From the smallest task assignment to long-term strategic planning, every process is digitized and tightly controlled.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Box 1: Workflow (Kanban & Flow) */}
            <div className="md:col-span-8 p-10 rounded-[28px] bg-gradient-to-br from-[#0F172A] to-[#020617] border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-500 transition-transform duration-700 group-hover:scale-110"><GitMerge size={200} /></div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 relative z-10">
                <Briefcase size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-4 relative z-10">Standardize Workflows</h3>
              <p className="text-gray-400 leading-relaxed max-w-xl mb-8 relative z-10">
                Define custom workflows (Kanban Customization) tailored to your department structure. Break down large objectives into granular sub-tasks for clear accountability and precise assignment.
              </p>
              <div className="flex flex-wrap gap-3 relative z-10">
                <span className="px-4 py-2 bg-white/5 rounded-lg text-sm font-medium text-gray-300 border border-white/10 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-blue-400"/> Cross-department Assignment
                </span>
                <span className="px-4 py-2 bg-white/5 rounded-lg text-sm font-medium text-gray-300 border border-white/10 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-blue-400"/> Task Dependency Management
                </span>
              </div>
            </div>

            {/* Box 2: Time Tracking & Resources */}
            <div className="md:col-span-4 p-10 rounded-[28px] bg-[#0F172A] border border-white/10 group hover:border-teal-500/30 transition-all">
              <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center text-teal-400 mb-6">
                <Clock size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Resource Control</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                Monitor actual workload through Time Tracking. Compare estimated vs. actual time to assess team productivity accurately.
              </p>
              <div className="mt-auto space-y-2">
                <div className="flex justify-between text-xs text-gray-400"><span>Project Time Budget</span><span>85%</span></div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className="w-[85%] h-full bg-teal-500 rounded-full"></div></div>
              </div>
            </div>

          </div>
        </section>

        {/* ————————————————— Z-PATTERN: REPORTING & SECURITY ————————————————— */}
        <section className="pt-32 px-6 max-w-7xl mx-auto space-y-24">

          {/* Feature: Reporting (Data-Driven) */}
          <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20" id="reporting">
            <div className="w-full md:w-1/2 space-y-6">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                <BarChart3 size={24} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">Data-Driven Decision Making</h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                The system automatically aggregates data from all projects, providing management and directors with a complete overview of organizational health.
              </p>
              <ul className="space-y-4 pt-4">
                <li className="flex items-start gap-3 text-gray-300">
                  <PieChart className="text-cyan-500 shrink-0 mt-1" size={20} />
                  <div>
                    <strong className="block text-white">Centralized Management Dashboard:</strong>
                    <span className="text-sm text-gray-400">Track progress, time costs, and bottlenecks in real time.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                  <FileSearch className="text-cyan-500 shrink-0 mt-1" size={20} />
                  <div>
                    <strong className="block text-white">Automated Report Export:</strong>
                    <span className="text-sm text-gray-400">Export Sprint Reports and Performance Reports to standard formats (Excel/PDF) for management meetings.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="w-full md:w-1/2">
               <div className="aspect-[4/3] rounded-2xl bg-[#0F172A] border border-white/10 p-6 flex flex-col relative overflow-hidden shadow-2xl">
                 <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <h4 className="font-bold text-gray-200">Team Performance (This Month)</h4>
                    <span className="px-3 py-1 bg-white/5 text-gray-400 text-xs rounded-md">Export</span>
                 </div>
                 <div className="flex-1 flex items-end gap-4 px-4 pb-4">
                    {[40, 70, 45, 90, 65, 80, 55].map((height, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-cyan-500/20 to-blue-500/80 rounded-t-sm relative group transition-all duration-300 hover:opacity-80" style={{ height: `${height}%` }}>
                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{height}</div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>

          {/* Feature: Security & Compliance */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-20" id="security">
            <div className="w-full md:w-1/2 space-y-6">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">Enterprise-Grade Security & Risk Management</h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Your organization&apos;s information assets are protected under a multi-layered security architecture. Ensuring absolute integrity and transparency.
              </p>
              <ul className="space-y-4 pt-4">
                <li className="flex items-start gap-3 text-gray-300">
                  <Lock className="text-purple-500 shrink-0 mt-1" size={20} />
                  <div>
                    <strong className="block text-white">Multi-tier RBAC Permissions:</strong>
                    <span className="text-sm text-gray-400">Configure a strict permission matrix. System roles (Admin/User) are separate from Project roles (Manager/Member/Viewer). Restrict access to sensitive documents.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                  <FileSearch className="text-purple-500 shrink-0 mt-1" size={20} />
                  <div>
                    <strong className="block text-white">Immutable Audit Log:</strong>
                    <span className="text-sm text-gray-400">100% tracking of all data changes. Records exactly &quot;who did what, when, and from which IP&quot;. Prevents repudiation and supports error tracing.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="w-full md:w-1/2">
              <div className="aspect-[4/3] rounded-2xl bg-[#030712] border border-white/10 p-6 flex flex-col justify-center font-mono text-sm shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
                 <div className="flex gap-2 mb-6">
                   <div className="w-3 h-3 rounded-full bg-red-500/50"></div><div className="w-3 h-3 rounded-full bg-yellow-500/50"></div><div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                 </div>
                 <div className="space-y-3 opacity-80 overflow-hidden">
                   <div className="text-gray-500">[2026-03-12 10:45:01] <span className="text-blue-400">INFO</span> [AuditService]</div>
                   <div className="text-gray-300 ml-4">ACTION: UPDATE_TASK_STATUS</div>
                   <div className="text-gray-300 ml-4">USER: &quot;nguyen.tran&quot; (ID: 8492) | ROLE: PM</div>
                   <div className="text-gray-300 ml-4">TARGET: Task-102 &quot;Budget Approval&quot;</div>
                   <div className="text-yellow-400 ml-4">DATA: {`{ from: "REVIEW", to: "DONE" }`}</div>
                   <div className="text-green-400 ml-4">STATUS: PERSISTED_SUCCESSFULLY</div>
                   <p className="animate-pulse mt-4">_</p>
                 </div>
              </div>
            </div>
          </div>

        </section>

        {/* ————————————————— CTA SECTION ————————————————— */}
        <section className="pt-32 pb-10 px-6">
          <div className="max-w-5xl mx-auto rounded-[32px] bg-[#0F172A] border border-white/10 p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-600/20 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2"></div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Elevate Your Operations Today</h2>
              <p className="text-gray-400 mb-10 text-lg max-w-2xl mx-auto">
                Fully digitize your workflows, eliminate bottlenecks, and ensure seamless information flow across your entire organization.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/signup" className="w-full sm:w-auto">
                  <button className="bg-white text-black hover:bg-gray-200 font-bold px-10 py-4 rounded-lg transition-all shadow-xl text-lg w-full">
                    Sign Up Now
                  </button>
                </Link>
                <Link href="/signin" className="w-full sm:w-auto">
                  <button className="bg-transparent border border-white/20 hover:bg-white/5 text-white font-bold px-10 py-4 rounded-lg transition-all text-lg w-full">
                    Explore the System
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ————————————————— FOOTER ————————————————— */}
      <footer className="border-t border-white/10 bg-[#020617] py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/images/logo.png"
                alt="TaskSphere Logo"
                width={36}
                height={36}
                className="object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
              />
              <span className="font-bold text-white text-lg tracking-tight">TaskSphere Enterprise</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">Comprehensive task and project management solution with unlimited security and scalability.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Solutions</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Agile Project Management</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Resource Optimization</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Analytics & Reporting</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Resources & Compliance</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#" className="hover:text-blue-400 transition-colors">System API Docs</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Microservices Architecture</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Data Policy (GDPR)</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>© 2026 TaskSphere. Built to Enterprise software standards (Based on SRS documentation).</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-gray-300">Privacy</Link>
            <Link href="#" className="hover:text-gray-300">Terms of Use</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
