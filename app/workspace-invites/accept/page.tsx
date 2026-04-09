"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/useAuthStore";
import { WorkspaceService } from "@/app/services/workspace.service";
import type { VerifyWorkspaceInviteResponse } from "@/app/types/workspace.schema";
import { getBeErrorMessage } from "@/lib/axios";

function WorkspaceInviteAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const shouldAutoAccept = searchParams.get("autoAccept") === "1";
  const { accessToken, userDetail, logout } = useAuthStore() as any;
  const currentUserEmail = userDetail?.email;

  const [status, setStatus] = useState<"verifying" | "verified" | "accepting" | "declining" | "success" | "declined" | "error" | "mismatch">("verifying");
  const [inviteData, setInviteData] = useState<VerifyWorkspaceInviteResponse | null>(null);
  const [message, setMessage] = useState("Verifying your workspace invite...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This workspace invite link is invalid.");
      return;
    }

    const verifyToken = async () => {
      try {
        const data = await WorkspaceService.verifyInviteToken(token);
        setInviteData(data);
        setStatus("verified");
      } catch (error: any) {
        setStatus("error");
        setMessage(getBeErrorMessage(error) || "This workspace invite is no longer available.");
      }
    };

    void verifyToken();
  }, [token]);

  useEffect(() => {
    if (!accessToken || !shouldAutoAccept || status !== "verified" || !token) return;
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", `/workspace-invites/accept?token=${encodeURIComponent(token)}`);
    }
    void handleAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, shouldAutoAccept, status, token]);

  const rememberRedirect = () => {
    if (typeof window === "undefined" || !token) return;
    sessionStorage.setItem("redirectAfterLogin", `/workspace-invites/accept?token=${encodeURIComponent(token)}&autoAccept=1`);
  };

  const handleAccept = async () => {
    if (!token || !accessToken) return;
    setStatus("accepting");
    try {
      const res = await WorkspaceService.acceptInvite(token);
      setStatus("success");
      setMessage(res.message || "You have joined the workspace.");
      setTimeout(() => {
        router.push(`/ws/${res.workspace.slug}`);
      }, 1500);
    } catch (error: any) {
      const nextMessage = getBeErrorMessage(error) || "Unable to accept this workspace invite.";
      if (nextMessage.toLowerCase().includes("khớp")) {
        setStatus("mismatch");
      } else {
        setStatus("error");
      }
      setMessage(nextMessage);
    }
  };

  const handleDecline = async () => {
    if (!token || !accessToken) return;
    setStatus("declining");
    try {
      const res = await WorkspaceService.declineInvite(token);
      setStatus("declined");
      setMessage(res.message || "The workspace invite was declined.");
    } catch (error: any) {
      setStatus("error");
      setMessage(getBeErrorMessage(error) || "Unable to decline this workspace invite.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-4 py-10">
      <div className="w-full max-w-[520px] rounded-3xl border border-[#e6ebf2] bg-white p-10 shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
        {status === "verifying" && (
          <div className="flex flex-col items-center py-8 text-center">
            <Loader2 className="mb-5 h-11 w-11 animate-spin text-[#4f6bed]" />
            <h2 className="text-2xl font-bold text-[#0f172a]">Checking your invite</h2>
            <p className="mt-2 text-sm text-[#667085]">{message}</p>
          </div>
        )}

        {status === "verified" && inviteData && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#4f6bed]">
              <Users size={36} />
            </div>
            <h2 className="text-[28px] font-extrabold text-[#0f172a]">Join workspace</h2>
            <p className="mt-3 text-sm leading-6 text-[#667085]">
              <span className="font-semibold text-[#0f172a]">{inviteData.inviterName}</span> invited you to join{" "}
              <span className="font-semibold text-[#0f172a]">{inviteData.workspaceName}</span> as{" "}
              <span className="font-semibold text-[#0f172a]">{inviteData.role}</span>.
            </p>

            <div className="mt-8 rounded-2xl border border-[#e6ebf2] bg-[#f8fafc] p-5 text-left text-sm text-[#475467]">
              <div>Email: <span className="font-semibold text-[#0f172a]">{inviteData.inviteeEmail}</span></div>
              <div className="mt-2">Workspace: <span className="font-semibold text-[#0f172a]">/{inviteData.workspaceSlug}</span></div>
              <div className="mt-2">Expires: <span className="font-semibold text-[#0f172a]">{new Date(inviteData.expiresAt).toLocaleString("en-GB")}</span></div>
            </div>

            {accessToken ? (
              <div className="mt-8 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => void handleDecline()}
                  className="h-12 rounded-xl border border-[#d0d7de] bg-white text-sm font-semibold text-[#475467] transition hover:bg-[#f8fafc]"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => void handleAccept()}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#4f6bed] text-sm font-semibold text-white transition hover:bg-[#4057d6]"
                >
                  Accept invite
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    rememberRedirect();
                    router.push(`/signin?callbackUrl=${encodeURIComponent(`/workspace-invites/accept?token=${encodeURIComponent(token || "")}&autoAccept=1`)}`);
                  }}
                  className="h-12 rounded-xl border border-[#d0d7de] bg-white text-sm font-semibold text-[#475467] transition hover:bg-[#f8fafc]"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    rememberRedirect();
                    router.push(`/signup?inviteToken=${encodeURIComponent(token || "")}&email=${encodeURIComponent(inviteData.inviteeEmail || "")}&callbackUrl=${encodeURIComponent(`/workspace-invites/accept?token=${encodeURIComponent(token || "")}&autoAccept=1`)}`);
                  }}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#4f6bed] text-sm font-semibold text-white transition hover:bg-[#4057d6]"
                >
                  Create account
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {(status === "accepting" || status === "declining") && (
          <div className="flex flex-col items-center py-8 text-center">
            <Loader2 className="mb-5 h-11 w-11 animate-spin text-[#4f6bed]" />
            <h2 className="text-2xl font-bold text-[#0f172a]">Processing your response</h2>
            <p className="mt-2 text-sm text-[#667085]">Please wait a moment.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-5 rounded-full bg-green-50 p-4 text-green-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-bold text-[#0f172a]">Invitation accepted</h2>
            <p className="mt-2 text-sm text-[#667085]">{message}</p>
          </div>
        )}

        {status === "declined" && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-5 rounded-full bg-slate-100 p-4 text-slate-500">
              <XCircle className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-bold text-[#0f172a]">Invitation declined</h2>
            <p className="mt-2 text-sm text-[#667085]">{message}</p>
          </div>
        )}

        {(status === "error" || status === "mismatch") && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-5 rounded-full bg-red-50 p-4 text-red-500">
              <AlertTriangle className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-bold text-[#0f172a]">
              {status === "mismatch" ? "Wrong account" : "Invitation unavailable"}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#667085]">{message}</p>
            {status === "mismatch" && accessToken && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/signin");
                }}
                className="mt-6 h-12 rounded-xl bg-[#111827] px-5 text-sm font-semibold text-white transition hover:bg-black"
              >
                Sign out and try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkspaceInviteAcceptPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#4f6bed]" /></div>}>
      <WorkspaceInviteAcceptContent />
    </Suspense>
  );
}
