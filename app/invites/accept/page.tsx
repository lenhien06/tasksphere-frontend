"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle, Users, Calendar, ArrowRight, XCircle } from "lucide-react";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { VerifyInviteResponse } from "@/app/types/member.schema";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

function AcceptInviteContent() {
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");
    const { accessToken } = useAuthStore();

    const [status, setStatus] = useState<"verifying" | "verified" | "accepting" | "declining" | "success" | "declined" | "error">("verifying");
    const [inviteData, setInviteData] = useState<VerifyInviteResponse | null>(null);
    const [message, setMessage] = useState(t('invite.verifying'));

    // 1. Verify Token on Load
    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage(t('invite.invalidLink'));
            return;
        }

        const verifyToken = async () => {
            try {
                const data = await ProjectMemberService.verifyInviteToken(token);
                setInviteData(data);
                setStatus("verified");
            } catch (error: any) {
                setStatus("error");
                setMessage(error.response?.data?.meta?.message || t('invite.invalidToken'));
            }
        };

        verifyToken();
    }, [token]);

    // 2. Handle Accept
    const handleAccept = async () => {
        if (!accessToken) {
            // Not logged in — redirect to Signup with token
            toast.info(t('invite.signupRequired'));
            router.push(`/signup?inviteToken=${token}&email=${inviteData?.inviteeEmail}`);
            return;
        }

        setStatus("accepting");
        try {
            const res = await ProjectMemberService.acceptInvite(token!);
            setStatus("success");
            setMessage(res.message);
            setTimeout(() => {
                router.push(`/projects/${res.projectId}`);
            }, 2000);
        } catch (error: any) {
            setStatus("error");
            setMessage(error.response?.data?.meta?.message || t('invite.acceptError'));
        }
    };

    // 3. Handle Decline
    const handleDecline = async () => {
        if (!window.confirm(t('invite.declineConfirm'))) return;

        setStatus("declining");
        try {
            const res = await ProjectMemberService.declineInvite(token!);
            setStatus("declined");
            setMessage(res.message || t('invite.declineSuccess'));
        } catch (error: any) {
            setStatus("error");
            setMessage(error.response?.data?.meta?.message || t('invite.declineError'));
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] p-4">
            <div className="w-full max-w-[480px] rounded-3xl bg-white p-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] text-center border border-[#E8EAED] animate-in fade-in zoom-in duration-500">

                {status === "verifying" && (
                    <div className="flex flex-col items-center py-10">
                        <Loader2 className="h-12 w-12 animate-spin text-[#1A73E8] mb-6" />
                        <h2 className="text-[20px] font-bold text-gray-900 mb-2">{t('invite.checking')}</h2>
                        <p className="text-[14px] text-[#5F6368]">{message}</p>
                    </div>
                )}

                {status === "verified" && inviteData && (
                    <div className="flex flex-col items-center">
                        <div className="h-20 w-20 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 shadow-inner">
                            <Users size={40} />
                        </div>
                        <h2 className="text-[24px] font-black text-gray-900 mb-2 leading-tight">
                            {t('invite.title')}
                        </h2>
                        <p className="text-[15px] text-[#5F6368] mb-8 px-4"
                            dangerouslySetInnerHTML={{
                                __html: t('invite.invitedBy', {
                                    name: inviteData.inviterName,
                                    project: inviteData.projectName,
                                    role: inviteData.role,
                                    interpolation: { escapeValue: false },
                                })
                            }}
                        />

                        <div className="w-full space-y-3 mb-10 bg-gray-50 p-5 rounded-2xl border border-gray-100 text-left">
                            <div className="flex items-center gap-3 text-[13px] text-[#5F6368]">
                                <Calendar size={16} className="text-gray-400" />
                                <span>{t('invite.expires')}: <span className="font-bold text-gray-900">{new Date(inviteData.expiresAt).toLocaleDateString('en-US')}</span></span>
                            </div>
                            <div className="flex items-center gap-3 text-[13px] text-[#5F6368]">
                                <CheckCircle2 size={16} className="text-gray-400" />
                                <span>{t('invite.invitedEmail')}: <span className="font-bold text-gray-900">{inviteData.inviteeEmail}</span></span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button
                                onClick={handleDecline}
                                className="h-12 rounded-xl border border-[#DADCE0] bg-white text-[14px] font-bold text-[#5F6368] hover:bg-[#F8F9FA] transition-all active:scale-95"
                            >
                                {t('invite.decline')}
                            </button>
                            <button
                                onClick={handleAccept}
                                className="h-12 rounded-xl bg-[#1A73E8] text-[14px] font-bold text-white shadow-lg shadow-blue-200 hover:bg-[#1557B0] transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                {accessToken ? t('invite.acceptNow') : t('invite.signupToJoin')}
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {(status === "accepting" || status === "declining") && (
                    <div className="flex flex-col items-center py-10">
                        <Loader2 className="h-12 w-12 animate-spin text-[#1A73E8] mb-6" />
                        <h2 className="text-[20px] font-bold text-gray-900 mb-2">{t('invite.processing')}</h2>
                        <p className="text-[14px] text-[#5F6368]">{t('invite.pleaseWait')}</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="flex flex-col items-center py-6">
                        <div className="rounded-full bg-green-50 p-4 mb-6 ring-8 ring-green-50/50">
                            <CheckCircle2 className="h-14 w-14 text-green-500" />
                        </div>
                        <h2 className="text-[24px] font-black text-gray-900 mb-2">{t('invite.welcome')}</h2>
                        <p className="text-[15px] text-[#5F6368] mb-8">{message}</p>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 animate-progress origin-left" />
                        </div>
                    </div>
                )}

                {status === "declined" && (
                    <div className="flex flex-col items-center py-6">
                        <div className="rounded-full bg-gray-50 p-4 mb-6 ring-8 ring-gray-50/50">
                            <XCircle className="h-14 w-14 text-gray-400" />
                        </div>
                        <h2 className="text-[24px] font-black text-gray-900 mb-2">{t('invite.declined')}</h2>
                        <p className="text-[15px] text-[#5F6368] mb-10">{message}</p>
                        <button
                            onClick={() => router.push("/")}
                            className="w-full h-12 rounded-xl bg-gray-900 text-[14px] font-bold text-white hover:bg-black transition-all"
                        >
                            {t('invite.backToHome')}
                        </button>
                    </div>
                )}

                {status === "error" && (
                    <div className="flex flex-col items-center py-6">
                        <div className="rounded-full bg-red-50 p-4 mb-6 ring-8 ring-red-50/50">
                            <AlertTriangle className="h-14 w-14 text-red-500" />
                        </div>
                        <h2 className="text-[24px] font-black text-gray-900 mb-2">{t('invite.verificationError')}</h2>
                        <p className="text-[14px] text-[#5F6368] mb-10 px-6">{message}</p>
                        <button
                            onClick={() => router.push("/")}
                            className="w-full h-12 rounded-xl border border-[#DADCE0] bg-white text-[14px] font-bold text-[#5F6368] hover:bg-[#F8F9FA] transition-all"
                        >
                            {t('invite.backToHome')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AcceptInvitePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#1A73E8]" /></div>}>
            <AcceptInviteContent />
        </Suspense>
    );
}
