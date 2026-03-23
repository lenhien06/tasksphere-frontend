"use client"

import React from "react"
import { useParams } from "next/navigation"

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">General Settings</h1>
        <p className="text-gray-500 mt-1">Configure basic project information and visibility.</p>
      </div>
      
      <div className="p-20 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900">Coming Soon</h3>
        <p className="text-gray-500 max-w-xs mt-2">
          The General Settings page is currently under development. Please check back later!
        </p>
      </div>
    </div>
  )
}
