import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
    return (
        <div className="w-full min-h-screen flex font-sans overflow-hidden">

            {/* Left panel */}
            <div className="hidden lg:flex relative w-[45%] flex-shrink-0 flex-col justify-between bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 overflow-hidden p-12">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="520" cy="80" r="260" fill="rgba(255,255,255,0.06)" />
                    <circle cx="560" cy="120" r="180" fill="rgba(255,255,255,0.05)" />
                    <circle cx="-60" cy="780" r="300" fill="rgba(255,255,255,0.05)" />
                    <path d="M-100 600 C 80 555, 260 620, 420 585 S 560 540, 700 562 L 700 900 L -100 900 Z" fill="rgba(255,255,255,0.06)" />
                    <path d="M-100 680 C 100 645, 280 700, 440 668 S 580 628, 700 648 L 700 900 L -100 900 Z" fill="rgba(255,255,255,0.05)" />
                </svg>

                {/* Logo */}
                <Link href="/" className="relative z-10 flex items-center gap-2.5">
                    <div className="relative w-8 h-8">
                        <Image src="/images/logo.png" alt="TaskSphere" fill className="object-contain brightness-0 invert" priority />
                    </div>
                    <span className="text-white text-xl font-bold tracking-tight">TaskSphere</span>
                </Link>

                {/* Main content */}
                <div className="relative z-10 flex flex-col gap-8">
                    <div>
                        <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-4">Project Management Platform</p>
                        <h2 className="text-white text-[42px] font-bold leading-[1.1] mb-3">
                            One workspace.<br />Every project.
                        </h2>
                        <p className="text-blue-100/70 text-sm leading-relaxed max-w-[300px]">
                            Plan sprints, track tasks, and ship together — without the chaos.
                        </p>
                    </div>

                    {/* Kanban board mockup */}
                    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl overflow-hidden">
                        {/* Board header */}
                        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-sm bg-white/60" />
                                <span className="text-white/80 text-xs font-semibold">Q1 Sprint Board</span>
                            </div>
                            <div className="flex -space-x-1.5">
                                {[
                                    { initials: "KL", bg: "bg-blue-300" },
                                    { initials: "AM", bg: "bg-violet-300" },
                                    { initials: "JD", bg: "bg-emerald-300" },
                                ].map((a) => (
                                    <div key={a.initials} className={`w-5 h-5 rounded-full ${a.bg} border border-blue-600 flex items-center justify-center text-blue-900 text-[7px] font-bold`}>
                                        {a.initials}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Columns */}
                        <div className="grid grid-cols-3 divide-x divide-white/10">
                            {/* Todo */}
                            <div className="p-3 flex flex-col gap-2">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                    <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">Todo</span>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
                                    <p className="text-white/85 text-[11px] font-medium leading-snug">User auth flow</p>
                                    <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded bg-blue-300/20 text-blue-100 font-medium">Feature</span>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
                                    <p className="text-white/85 text-[11px] font-medium leading-snug">Dashboard v2</p>
                                    <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-300/20 text-amber-100 font-medium">Design</span>
                                </div>
                            </div>

                            {/* In Progress */}
                            <div className="p-3 flex flex-col gap-2">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                                    <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">Active</span>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2.5 border border-white/20">
                                    <p className="text-white/85 text-[11px] font-medium leading-snug">API integration</p>
                                    <div className="mt-2 space-y-1">
                                        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                            <div className="h-full w-[65%] bg-white/70 rounded-full" />
                                        </div>
                                        <p className="text-white/40 text-[9px]">65% complete</p>
                                    </div>
                                </div>
                            </div>

                            {/* Done */}
                            <div className="p-3 flex flex-col gap-2">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                                    <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">Done</span>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
                                    <p className="text-white/50 text-[11px] font-medium leading-snug line-through">Setup CI/CD</p>
                                    <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-300/20 text-emerald-100 font-medium">Merged</span>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
                                    <p className="text-white/50 text-[11px] font-medium leading-snug line-through">DB schema</p>
                                    <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-300/20 text-emerald-100 font-medium">Merged</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 pt-4 border-t border-white/10">
                    <p className="text-blue-200/50 text-xs">Built for teams who move fast.</p>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 bg-white flex flex-col items-center justify-center py-12 px-8 sm:px-16">
                <Link href="/" className="lg:hidden flex items-center gap-2 mb-10">
                    <div className="relative w-8 h-8">
                        <Image src="/images/logo.png" alt="TaskSphere" fill className="object-contain" priority />
                    </div>
                    <span className="text-gray-900 text-xl font-bold tracking-tight">TaskSphere</span>
                </Link>
                <div className="w-full max-w-[400px]">
                    <LoginForm />
                </div>
            </div>
        </div>
    );
}
