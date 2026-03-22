"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InviteTokenRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  useEffect(() => {
    if (!token) return;
    router.replace(`/invites/accept?token=${encodeURIComponent(token)}`);
  }, [router, token]);

  return null;
}
