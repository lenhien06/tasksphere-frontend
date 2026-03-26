"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import NotificationPreferences from "@/components/settings/NotificationPreferences"
import AccountSettings from "@/components/settings/AccountSettings"
import { useTranslation } from "react-i18next"

type Tab = "account" | "notifications" | "security"

export default function UserSettingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>("account")

  const tabs: { id: Tab; label: string }[] = [
    { id: "account",       label: `👤 ${t('settings.account')}` },
    { id: "notifications", label: `🔔 ${t('settings.notifications')}` },
    { id: "security",      label: `🔒 ${t('settings.security')}` },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Personal Settings</h1>

        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-2xl w-fit backdrop-blur-sm border border-gray-200/50">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-800 hover:bg-white/50",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "account" && <AccountSettings />}
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
