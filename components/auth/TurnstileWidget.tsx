"use client";

import { useEffect, useRef } from "react";
import Turnstile, { type BoundTurnstileObject } from "react-turnstile";

type TurnstileWidgetProps = {
    siteKey?: string;
    token: string | null;
    onTokenChange: (token: string | null) => void;
    resetSignal?: number;
    className?: string;
};

export function TurnstileWidget({
    siteKey,
    token,
    onTokenChange,
    resetSignal = 0,
    className,
}: TurnstileWidgetProps) {
    const widgetRef = useRef<BoundTurnstileObject | null>(null);

    useEffect(() => {
        if (!resetSignal || !widgetRef.current) return;
        widgetRef.current.reset();
        onTokenChange(null);
    }, [onTokenChange, resetSignal]);

    if (!siteKey) {
        return null;
    }

    return (
        <div className={className}>
            <Turnstile
                sitekey={siteKey}
                theme="light"
                size="flexible"
                appearance="always"
                refreshExpired="auto"
                retry="auto"
                fixedSize={false}
                onLoad={(_, bound) => {
                    widgetRef.current = bound;
                }}
                onVerify={(nextToken, bound) => {
                    widgetRef.current = bound;
                    onTokenChange(nextToken);
                }}
                onExpire={() => {
                    onTokenChange(null);
                }}
                onError={() => {
                    onTokenChange(null);
                }}
            />
            <p className="mt-2 text-xs text-gray-500">
                {token
                    ? "Security verification completed."
                    : "Complete the security verification to continue."}
            </p>
        </div>
    );
}
