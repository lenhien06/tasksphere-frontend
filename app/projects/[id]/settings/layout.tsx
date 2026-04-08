"use client"

import React from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Settings, 
  Users, 
  GitBranch, 
  Rocket, 
  Tag, 
  Webhook,
  ChevronRight
} from "lucide-react"

export default function ProjectSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const projectId = params.id as string

  const menuItems = [
    {
      id: "general",
      label: "General",
      icon: Settings,
      path: `/projects/${projectId}/settings`,
    },
    {
      id: "members",
      label: "Members",
      icon: Users,
      path: `/projects/${projectId}?tab=members`,
    },
    {
      id: "workflow",
      label: "Workflow",
      icon: GitBranch,
      path: `/projects/${projectId}/settings/workflow`,
    },
    {
      id: "versions",
      label: "Versions",
      icon: Rocket,
      path: `/projects/${projectId}/settings/versions`,
    },
    {
      id: "custom-fields",
      label: "Custom Fields",
      icon: Tag,
      path: `/projects/${projectId}/settings/custom-fields`,
    },
    {
      id: "webhooks",
      label: "Webhooks",
      icon: Webhook,
      path: `/projects/${projectId}/settings/webhooks`,
    },
  ]

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar Settings */}
      <aside className="w-64 border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Project Settings</h2>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || (item.id === "general" && pathname === `/projects/${projectId}/settings`)
            const Icon = item.icon
            
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={cn("transition-colors", isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight size={14} />}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
