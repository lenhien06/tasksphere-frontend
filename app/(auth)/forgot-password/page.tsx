import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-white font-sans overflow-hidden px-6 z-50">
            
            {/* Logo at top left corner */}
            <div className="absolute top-8 left-8 sm:top-12 sm:left-12 z-[60] flex items-center gap-3">
                <Link href="/" className="flex items-center gap-2">
                    <div className="relative w-8 h-8">
                        <Image
                            src="/images/logo.png"
                            alt="TaskSphere Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-gray-900">TaskSphere</span>
                </Link>
            </div>

            {/* Form Container centered */}
            <div className="relative z-[60] w-full flex justify-center">
                <ResetPasswordForm />
            </div>

            {/* Small footer */}
            <div className="absolute bottom-8 text-center w-full text-gray-400 text-xs">
                © 2026 TaskSphere. All rights reserved.
            </div>
        </div>
    );
}
