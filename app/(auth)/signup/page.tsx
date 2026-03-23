import Image from "next/image";
import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
    return (
        <div className="w-full min-h-screen flex font-sans overflow-hidden">

            {/* Left panel */}
            <div className="hidden lg:flex relative w-[42%] flex-shrink-0 flex-col justify-between bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 overflow-hidden p-12">
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
                        <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-4">Get Started Free</p>
                        <h2 className="text-white text-[40px] font-bold leading-[1.1] mb-3">
                            Your team's<br />command center<br />starts here.
                        </h2>
                        <p className="text-blue-100/70 text-sm leading-relaxed max-w-[280px]">
                            From backlog to deployment — manage everything in one place.
                        </p>
                    </div>

                    {/* Feature list */}
                    <div className="flex flex-col gap-2.5">
                        {[
                            {
                                icon: (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                    </svg>
                                ),
                                title: "Kanban & Sprint Boards",
                                desc: "Visualize work across every stage of your workflow.",
                            },
                            {
                                icon: (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                ),
                                title: "Real-time Collaboration",
                                desc: "Assign tasks, comment, and stay in sync instantly.",
                            },
                            {
                                icon: (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                    </svg>
                                ),
                                title: "Custom Fields & Workflows",
                                desc: "Tailor every project to match how your team works.",
                            },
                            {
                                icon: (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                ),
                                title: "Webhooks & Integrations",
                                desc: "Connect your tools and automate across your stack.",
                            },
                        ].map((f) => (
                            <div key={f.title} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3">
                                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-white">
                                    {f.icon}
                                </div>
                                <div>
                                    <p className="text-white text-sm font-semibold">{f.title}</p>
                                    <p className="text-blue-100/60 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 pt-4 border-t border-white/10">
                    <p className="text-blue-200/50 text-xs">No setup fees. No credit card required.</p>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 bg-white flex flex-col items-center justify-center py-10 px-8 sm:px-16 overflow-y-auto">
                <Link href="/" className="lg:hidden flex items-center gap-2 mb-10">
                    <div className="relative w-8 h-8">
                        <Image src="/images/logo.png" alt="TaskSphere" fill className="object-contain" priority />
                    </div>
                    <span className="text-gray-900 text-xl font-bold tracking-tight">TaskSphere</span>
                </Link>
                <div className="w-full max-w-[560px]">
                    <SignupForm />
                </div>
            </div>
        </div>
    );
}
