"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import NotificationPreferences from "@/components/settings/NotificationPreferences"
import { useTranslation } from "react-i18next"

type Tab = "account" | "notifications" | "security"

export default function UserSettingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>("notifications")

  const tabs: { id: Tab; label: string }[] = [
    { id: "account",       label: `👤 ${t('settings.account')}` },
    { id: "notifications", label: `🔔 ${t('settings.notifications')}` },
    { id: "security",      label: `🔒 ${t('settings.security')}` },
  ]

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-gray-900">{t('settings.personal')}</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-800",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "account" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 text-sm py-12">
            {t('settings.accountInfo')}
          </div>
        )}
        {tab === "notifications" && <NotificationPreferences />}
        {tab === "security" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 text-sm py-12">
            {t('settings.securityInfo')}
          </div>
        )}
      </div>
    </div>
  )
}
