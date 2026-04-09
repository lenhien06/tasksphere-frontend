"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ForbiddenPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Access denied
            </h2>
            <p className="text-gray-500 mb-6">
                This project is private. You need an invitation to view it.
            </p>
            <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
            >
                Go back
            </button>
        </div>
    );
}
