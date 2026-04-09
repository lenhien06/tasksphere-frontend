"use client";

import Turnstile from "react-turnstile";

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
    if (!siteKey) {
        return null;
    }

    return (
        <div className={className}>
            <Turnstile
                key={resetSignal}
                sitekey={siteKey}
                theme="light"
                size="flexible"
                appearance="always"
                refreshExpired="auto"
                retry="auto"
                fixedSize={false}
                onVerify={(nextToken) => {
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
