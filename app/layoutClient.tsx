'use client'

import { useRef, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { useTheme } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { ToastContainer } from 'react-toastify'

import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn } from '@/lib/utils'
import { ProjectService } from '@/app/services/ProjectService'
import I18nProvider from '@/components/providers/I18nProvider'

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAuthPage = pathname === '/' || pathname?.startsWith('/signin') || pathname?.startsWith('/signup') || pathname?.startsWith('/forgot-password')
  const { setTheme } = useTheme()

  const { data: currentUser } = useCurrentUser({ enabled: !isAuthPage })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Force light mode on app pages; restore freedom on landing/auth pages
  useEffect(() => {
    const html = document.documentElement
    if (!isAuthPage) {
      html.classList.remove('dark')
      html.style.colorScheme = 'light'
      setTheme('light')
    } else {
      html.style.colorScheme = ''
    }
  }, [isAuthPage, setTheme])

  // Only render after mounted on the client to avoid Hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  // Automatically detect the current project from the URL
  const pathParts = pathname?.split('/') || []
  const isProjectDetail = pathParts[1] === 'projects' && pathParts[2] && pathParts[2] !== 'all'
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
      <main className="w-full">
        {children}
      </main>
    )
  }

  return (
    <div className="flex h-screen bg-[#F9FAFB] font-sans overflow-hidden">
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
    </div>
  )
}

export default function LayoutClient({ children }: Readonly<{ children: React.ReactNode }>) {
  const queryClientRef = useRef<QueryClient>()

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

        <LayoutContent>{children}</LayoutContent>

        <Toaster position='top-right' />
      </ThemeProvider>
    </QueryClientProvider>
    </I18nProvider>
  )
}
