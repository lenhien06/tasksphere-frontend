"use client"

import React from "react"
import NotificationPreferences from "@/components/settings/NotificationPreferences"
import { useTranslation } from "react-i18next"

export default function UserSettingsPage() {
  useTranslation()

  return (
    <div className="min-h-screen bg-[#F8F9FA] px-4 py-6 md:px-6">
      <div className="max-w-5xl mx-auto">
        <NotificationPreferences />
      </div>
    </div>
  )
}
