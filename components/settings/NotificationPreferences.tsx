"use client"

import React, { useCallback, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { NotificationPreferences } from "@/app/types/task.schema"

// ── Helpers ───────────────────────────────────────────────────

function Toggle({
    checked,
    onChange,
}: {
    checked: boolean
    onChange: (v: boolean) => void
}) {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
            />
            <div className="w-10 h-6 bg-gray-200 peer-checked:bg-blue-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
        </label>
    )
}

// ── Main Component ─────────────────────────────────────────────

export default function NotificationPreferencesPanel() {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const qKey = ["notif-prefs"] as const

    // ── Notification types config (uses t(), must be inside component) ──
    const NOTIF_TYPES = [
        { key: "TASK_ASSIGNED",    label: t('notif.type_TASK_ASSIGNED'),    desc: t('notif.desc_TASK_ASSIGNED') },
        { key: "TASK_COMMENTED",   label: t('notif.type_TASK_COMMENTED'),   desc: t('notif.desc_TASK_COMMENTED') },
        { key: "TASK_MENTIONED",   label: t('notif.type_TASK_MENTIONED'),   desc: t('notif.desc_TASK_MENTIONED') },
        { key: "TASK_DUE_SOON",    label: t('notif.type_TASK_DUE_SOON'),    desc: t('notif.desc_TASK_DUE_SOON') },
        { key: "SPRINT_STARTED",   label: t('notif.type_SPRINT_STARTED'),   desc: t('notif.desc_SPRINT_STARTED') },
        { key: "SPRINT_COMPLETED", label: t('notif.type_SPRINT_COMPLETED'), desc: t('notif.desc_SPRINT_COMPLETED') },
        { key: "PROJECT_INVITED",  label: t('notif.type_PROJECT_INVITED'),  desc: t('notif.desc_PROJECT_INVITED') },
    ]

    const { data: prefs, isLoading } = useQuery({
        queryKey: qKey,
        queryFn:  () => TaskService.getNotifPreferences(),
    })

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const updateMutation = useMutation({
        mutationFn: (data: Partial<NotificationPreferences>) =>
            TaskService.updateNotifPreferences(data),

        onMutate: async (newPrefs) => {
            await queryClient.cancelQueries({ queryKey: qKey })
            const prev = queryClient.getQueryData<NotificationPreferences>(qKey)
            queryClient.setQueryData<NotificationPreferences>(qKey, (old) => ({
                ...old!,
                ...newPrefs,
                typePreferences: { ...old?.typePreferences, ...newPrefs.typePreferences },
            }))
            return { prev }
        },

        onSuccess: () => toast.success(t('settings.saveSuccess')),

        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(qKey, ctx.prev)
            toast.error(t('notif.saveError'))
        },
    })

    const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
        updateMutation.mutate({ [key]: value })
    }

    const handleTypeToggle = useCallback((type: string, value: boolean) => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
            updateMutation.mutate({
                typePreferences: { ...prefs?.typePreferences, [type]: value },
            })
        }, 500)
    }, [prefs?.typePreferences, updateMutation])

    const handleTimezone = (tz: string) => {
        updateMutation.mutate({ timezone: tz })
    }

    if (isLoading || !prefs) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="space-y-4 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-gray-100 rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    // Timezones grouped by region
    const timezones = typeof Intl !== "undefined" && "supportedValuesOf" in Intl
        ? (Intl as any).supportedValuesOf("timeZone") as string[]
        : ["Asia/Ho_Chi_Minh", "Asia/Tokyo", "America/New_York", "Europe/London", "UTC"]

    const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-8">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('settings.notifications')}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{t('notif.manageDesc')}</p>
            </div>

            {/* Section 1 — Email Digest */}
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="font-semibold text-gray-800">{t('notif.dailyDigest')}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {t('notif.dailyDigestDesc')}
                        </p>
                    </div>
                    <Toggle
                        checked={prefs.emailDailyDigest}
                        onChange={v => handleToggle("emailDailyDigest", v)}
                    />
                </div>

                {prefs.emailDailyDigest && (
                    <div className="ml-4 pl-4 border-l-2 border-blue-100 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-700">{t('notif.weekdaysOnly')}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {t('notif.weekdaysOnlyDesc')}
                            </p>
                        </div>
                        <Toggle
                            checked={prefs.weekdaysOnly}
                            onChange={v => handleToggle("weekdaysOnly", v)}
                        />
                    </div>
                )}
            </div>

            <div className="border-t border-gray-100" />

            {/* Section 2 — Timezone */}
            <div>
                <p className="font-semibold text-gray-800 mb-0.5">{t('notif.timezone')}</p>
                <p className="text-sm text-gray-500 mb-3">
                    {t('notif.timezoneDesc')}
                </p>
                <select
                    value={prefs.timezone}
                    onChange={e => handleTimezone(e.target.value)}
                    className="w-full max-w-xs h-10 px-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 bg-white"
                >
                    {timezones.map(tz => (
                        <option key={tz} value={tz}>
                            {tz === detectedTz ? `${tz} (${t('notif.current')})` : tz}
                        </option>
                    ))}
                </select>
            </div>

            <div className="border-t border-gray-100" />

            {/* Section 3 — Per-type toggles */}
            <div>
                <p className="font-semibold text-gray-800 mb-1">{t('notif.types')}</p>
                <p className="text-sm text-gray-500 mb-4">{t('notif.typesDesc')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {NOTIF_TYPES.map(({ key, label, desc }) => {
                        const enabled = prefs.typePreferences?.[key] !== false
                        return (
                            <div
                                key={key}
                                className="flex items-start justify-between gap-4 p-4 border border-gray-200 rounded-xl"
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{label}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                                </div>
                                <Toggle
                                    checked={enabled}
                                    onChange={v => handleTypeToggle(key, v)}
                                />
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
