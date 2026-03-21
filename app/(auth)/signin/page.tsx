import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2 font-sans overflow-hidden">
            {/* Left column: Image and project info */}
            <div className="hidden lg:flex flex-col bg-[#2563eb] relative p-12 text-white overflow-hidden">
                {/* Color Bleed/Mesh Gradient effect */}
                <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-blue-400 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
                <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-blue-800 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>
                
                {/* Bleed effect with white side */}
                <div className="absolute -right-[10%] top-1/4 w-[40%] h-[50%] bg-white/20 rounded-full blur-[100px] pointer-events-none"></div>

                {/* TaskSphere Logo */}
                <Link href="/" className="z-20 flex items-center gap-2 mb-32">
                    <div className="relative w-8 h-8">
                        <Image
                            src="/images/logo.png"
                            alt="TaskSphere Logo"
                            fill
                            className="object-contain brightness-0 invert"
                            priority
                        />
                    </div>
                    <span className="text-xl font-bold tracking-tight">TaskSphere</span>
                </Link>

                {/* Content overlaid on image: Project info & Trust building */}
                <div className="flex flex-col items-center justify-center flex-grow z-20">
                    <h2 className="text-4xl font-bold mb-12 text-center">
                        Work smarter, together
                    </h2>
                    
                    <div className="relative w-full max-w-[500px] aspect-[4/3]">
                        <Image
                            src="/images/sigin.png"
                            alt="Dashboard data graphic"
                            fill
                            className="object-contain" 
                            priority
                        />
                    </div>
                </div>

                {/* (Removed old gradient overlay to let color-bleed blobs shine) */}
            </div>

            {/* Right column: Sign-in form */}
            <div className="flex flex-col items-center justify-center py-12 px-6 sm:px-12 bg-white">
                <div className="w-full max-w-[440px]">
                    <LoginForm />
                </div>
            </div>
        </div>
    );
}
