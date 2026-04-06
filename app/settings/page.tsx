"use client"

import React from "react"
import NotificationPreferences from "@/components/settings/NotificationPreferences"
import { useTranslation } from "react-i18next"

export default function UserSettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {t('settings.notifications')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('settings.manageNotifications', { defaultValue: 'Quản lý cách bạn nhận thông báo.' })}
          </p>
        </div>

        <NotificationPreferences />
      </div>
    </div>
  )
}
