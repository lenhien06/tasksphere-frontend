'use client'

import { useRef, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { useTheme } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { ToastContainer } from 'react-toastify'
import { GoogleOAuthProvider } from '@react-oauth/google'

import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn } from '@/lib/utils'
import { ProjectService } from '@/app/services/ProjectService'
import I18nProvider from '@/components/providers/I18nProvider'
import { AIProjectCreationModal } from '@/components/projects/AIProjectCreationModal'
import { useAIModalStore } from '@/stores/useAIModalStore'
import { AISkillAllocationModal } from '@/components/projects/AISkillAllocationModal'
import { useAISkillModalStore } from '@/stores/useAISkillModalStore'
import { NotificationRealtimeBootstrap } from '@/components/notifications/NotificationRealtimeBootstrap'
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext'
import WorkspaceBreadcrumb from '@/components/layout/WorkspaceBreadcrumb'

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAuthPage = pathname === '/' || pathname?.startsWith('/signin') || pathname?.startsWith('/signup') || pathname?.startsWith('/forgot-password')
  const projectReservedRoutes = new Set(['all', 'new', 'new-with-ai'])
  const isHeaderOnlyPage =
    pathname === '/projects/new' ||
    pathname === '/projects/new-with-ai' ||
    pathname === '/workspaces/new'
  const { setTheme } = useTheme()

  const { data: currentUser } = useCurrentUser({ enabled: !isAuthPage })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Theme enforcement per route:
  //   /           → allow user to toggle dark/light (ThemeToggle on landing)
  //   all others  → force light, remove dark class
  useEffect(() => {
    const html = document.documentElement
    if (pathname === '/') {
      // Landing page: let ThemeToggle / stored preference control .dark class
      html.style.colorScheme = ''
    } else {
      html.classList.remove('dark')
      html.style.colorScheme = 'light'
      setTheme('light')
    }
  }, [pathname, setTheme])

  // Only render after mounted on the client to avoid Hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!sidebarOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [sidebarOpen])

  // Automatically detect the current project from the URL
  const pathParts = pathname?.split('/') || []
  const projectSegment = pathParts[2]
  const isProjectDetail =
    pathParts[1] === 'projects' &&
    !!projectSegment &&
    !projectReservedRoutes.has(projectSegment)
  const urlProjectId = isProjectDetail ? pathParts[2] : null

  const { data: projectDetail } = useQuery({
    queryKey: ["project-mini", urlProjectId],
    queryFn: () => ProjectService.getById(urlProjectId!),
    enabled: !!urlProjectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  const currentProject = isProjectDetail ? {
    id: urlProjectId!,
    name: (projectDetail as any)?.data?.name || "Loading...",
    key: (projectDetail as any)?.data?.projectKey || "PRJ"
  } : undefined

  // Automatically detect pages that need a full-height layout (Board, Sprints, Backlog, Calendar)
  const isFullHeightPage = ['/board', '/sprints', '/sprint', '/backlog', '/calendar', '/reports'].some(p => pathname?.endsWith(p))

  if (!mounted) return null

  if (isAuthPage) {
    return (
      <main className="w-full" suppressHydrationWarning>
        {children}
      </main>
    )
  }

  if (isHeaderOnlyPage) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#F6F8FA]" suppressHydrationWarning>
        <Header
          currentUser={currentUser || undefined}
          showSidebarToggle={false}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <AIModalGlobal />
        <AISkillModalGlobal />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#F9FAFB] font-sans overflow-hidden" suppressHydrationWarning>
      <Sidebar
        currentUser={currentUser || undefined}
        currentProject={currentProject}
        activeItem={pathname || '/'}
        onNavigate={(path) => { router.push(path); setSidebarOpen(false) }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <div className={cn(
        "flex flex-col flex-1 overflow-hidden transition-[margin] duration-300 ease-in-out",
        isCollapsed ? "lg:ml-[68px]" : "lg:ml-[240px]"
      )}>
        <Header
          onMenuToggle={() => {
            if (window.innerWidth >= 1024) {
              setIsCollapsed(!isCollapsed);
            } else {
              setSidebarOpen(prev => !prev);
            }
          }}
          currentUser={currentUser || undefined}
        />
        <WorkspaceBreadcrumb currentProject={currentProject} />
        <main className={`flex-1 bg-[#F9FAFB] ${isFullHeightPage ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
          {isFullHeightPage ? (
            children
          ) : (
            <div className={cn(
              "mx-auto w-full pb-2"
            )}>
              {children}
            </div>
          )}
        </main>
      </div>

      {/* Global AI Project Creation Modal — accessible from anywhere via useAIModalStore */}
      <AIModalGlobal />
      {/* Global AI Skill Allocation Modal — accessible from anywhere via useAISkillModalStore */}
      <AISkillModalGlobal />
    </div>
  )
}

function AIModalGlobal() {
  const { isOpen, close } = useAIModalStore();
  return (
    <AIProjectCreationModal
      isOpen={isOpen}
      onClose={close}
      onGenerate={async (data) => {
        // TODO: wire to backend AI project generation API
        console.log('[AI Project Generation] payload:', data);
      }}
    />
  );
}

function AISkillModalGlobal() {
  const { isOpen, projectId, canEdit, onConfirm, close } = useAISkillModalStore();
  return (
    <AISkillAllocationModal
      isOpen={isOpen}
      onClose={close}
      projectId={projectId}
      canEdit={canEdit}
      onConfirm={(updated) => {
        onConfirm?.(updated);
        console.log('[AI Skill Allocation] confirmed:', updated);
      }}
    />
  );
}

export default function LayoutClient({ children }: Readonly<{ children: React.ReactNode }>) {
  const queryClientRef = useRef<QueryClient>()
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 0
        }
      }
    })
  }

  return (
    <I18nProvider>
      <QueryClientProvider client={queryClientRef.current}>
        <ThemeProvider attribute='class' defaultTheme='light' enableSystem={false} disableTransitionOnChange>
          {googleClientId ? (
            <GoogleOAuthProvider clientId={googleClientId}>
              <ToastContainer
                position='top-right'
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme='colored'
              />

              <WorkspaceProvider>
                <LayoutContent>{children}</LayoutContent>
              </WorkspaceProvider>
              <NotificationRealtimeBootstrap />

              <Toaster position='top-right' />
            </GoogleOAuthProvider>
          ) : (
            <>
              <ToastContainer
                position='top-right'
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme='colored'
              />

              <WorkspaceProvider>
                <LayoutContent>{children}</LayoutContent>
              </WorkspaceProvider>
              <NotificationRealtimeBootstrap />

              <Toaster position='top-right' />
            </>
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </I18nProvider>
  )
}
