import Image from "next/image";
import Link from "next/link";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function ForgotPasswordPage() {
    return (
        <div className="w-full min-h-screen flex font-sans overflow-hidden">

            {/* Left panel */}
            <div className="hidden lg:flex relative w-1/2 flex-col justify-between bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 overflow-hidden p-12">
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
                <div className="relative z-10 flex flex-col gap-9">
                    <div>
                        <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-4">Account Security</p>
                        <h2 className="text-white text-[42px] font-bold leading-[1.1] mb-3">
                            Lost access?<br />We'll get you<br />back in.
                        </h2>
                        <p className="text-blue-100/70 text-sm leading-relaxed max-w-[280px]">
                            A 6-digit code sent to your inbox is all it takes to regain full access.
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="flex flex-col gap-3">
                        {[
                            {
                                step: "01",
                                title: "Enter your email",
                                desc: "We'll look up your account and send a reset code.",
                            },
                            {
                                step: "02",
                                title: "Check your inbox",
                                desc: "A 6-digit code will arrive within a few seconds.",
                            },
                            {
                                step: "03",
                                title: "Set a new password",
                                desc: "Enter the code and choose a strong new password.",
                            },
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-4 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3.5">
                                <span className="text-white/40 text-xs font-bold font-mono w-6 flex-shrink-0 mt-0.5">{item.step}</span>
                                <div>
                                    <p className="text-white text-sm font-semibold">{item.title}</p>
                                    <p className="text-blue-100/60 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 pt-4 border-t border-white/10">
                    <p className="text-blue-200/50 text-xs">Your account security is our priority.</p>
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
                    <ResetPasswordForm />
                </div>
            </div>
        </div>
    );
}
