"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Calendar as CalendarIcon,
  Plus,
  ClipboardList,
  X,
  CheckCircle2,
  AlertCircle,
  User,
  ListFilter,
  Search,
  Users,
  Tag,
  Layers,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TaskService } from '@/app/services/TaskService'
import type { CalendarApiTask, TaskPriority, TaskStatus, ProjectRole } from '@/app/types/task.schema'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// ════════════════════════════════════════
// CONFIGS
// ════════════════════════════════════════

const PRIORITY_CONFIG: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-red-200',   text: 'text-red-800',   border: 'border-red-400' },
  HIGH:     { bg: 'bg-red-100',   text: 'text-red-700',   border: 'border-red-300' },
  MEDIUM:   { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  LOW:      { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
}

const STATUS_DOT: Record<TaskStatus, string> = {
  TODO:        'bg-gray-400',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW:   'bg-purple-500',
  DONE:        'bg-green-500',
  CANCELLED:   'bg-gray-300',
}

// ════════════════════════════════════════
// COMPONENTS
// ════════════════════════════════════════

function Chip({ active, label, icon, onClick }: { active?: boolean; label: string; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg px-3 text-xs border transition-all whitespace-nowrap inline-flex items-center gap-1.5 font-bold tracking-tight shadow-sm",
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-white text-gray-600 hover:text-gray-800 hover:border-gray-300"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function FilterMenu({
  label,
  active,
  children,
  icon
}: {
  label: string;
  active?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "h-9 rounded-lg px-3 text-xs border inline-flex items-center gap-1.5 transition-all outline-none font-bold tracking-tight shadow-sm",
            active
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-gray-600 hover:text-gray-800 hover:border-gray-300"
          )}
        >
          {icon}
          {label}
          <ChevronDown size={13} className="opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[180px] p-2 rounded-xl shadow-xl border-gray-200 bg-white z-[9999]">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function DraggableTaskCard({
  task,
  onClick,
  disabled
}: {
  task: CalendarApiTask
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { type: 'task', task },
    disabled
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const pc = PRIORITY_CONFIG[task.priority]
  const isDone = task.taskStatus === 'DONE'

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'w-full text-left px-2 py-1 rounded-[4px] text-[10px] font-semibold truncate border shadow-sm flex items-center gap-1.5 hover:shadow-md transition group relative',
        isDragging ? 'opacity-50 z-50 ring-2 ring-blue-500' : 'z-10',
        pc.bg, pc.text,
        task.isOverdue && !isDone && 'border border-red-400 ring-1 ring-red-200',
        isDone && 'opacity-75'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', pc.text.replace('text', 'bg'))} />
      {task.isOverdue && !isDone && <span className="text-red-600" title="Overdue">⚠</span>}
      {isDone && <CheckCircle2 size={10} className="text-green-600 shrink-0" />}
      <span className="font-mono text-[9px] opacity-70">{task.taskCode}</span>
      <span className={cn('truncate flex-1', isDone && 'line-through decoration-1')}>{task.title}</span>
      {task.assignee && (
        <div className="shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
           <UserAvatar name={task.assignee.fullName} src={task.assignee.avatarUrl ?? undefined} size={14} />
        </div>
      )}
    </button>
  )
}

function DroppableDay({
  dateStr,
  isToday,
  isCurrentMonth,
  isDaySelected,
  onClick,
  children,
  taskCount
}: {
  dateStr: string
  isToday: boolean
  isCurrentMonth: boolean
  isDaySelected: boolean
  onClick: () => void
  children: React.ReactNode
  taskCount: number
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    data: { type: 'day', dateStr }
  })

  const { t } = useTranslation()

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'min-h-[130px] border-r border-b border-gray-100 p-2 flex flex-col gap-1 transition-all cursor-pointer relative',
        !isCurrentMonth && 'bg-gray-50/30 opacity-40',
        isDaySelected ? 'bg-blue-50/20 ring-2 ring-inset ring-blue-500/10 z-[5]' : 'hover:bg-gray-50/40',
        isOver && 'bg-blue-100/50 ring-2 ring-blue-500 z-[6]'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={cn(
          'text-[13px] font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200',
          isToday ? 'bg-blue-600 text-white shadow-md scale-110' :
          isDaySelected ? 'bg-[#111827] text-white scale-110 shadow-sm' : 'text-gray-700 font-extrabold'
        )}>
          {parseInt(dateStr.split('-')[2])}
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex flex-col gap-1">
          {children}
          {taskCount > 3 && (
            <div className="text-[9px] font-bold text-gray-500 ml-1 flex items-center gap-1">
              <Plus size={8} /> {taskCount - 3} {t('common.more')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)
  const startDow = (firstDay.getDay() + 6) % 7
  const days: { date: Date; isCurrentMonth: boolean }[] = []
  for (let i = startDow; i > 0; i--) {
    days.push({ date: new Date(year, month - 1, 1 - i), isCurrentMonth: false })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month - 1, d), isCurrentMonth: true })
  }
  while (days.length < 42) {
    const last = days[days.length - 1].date
    const next = new Date(last)
    next.setDate(next.getDate() + 1)
    days.push({ date: next, isCurrentMonth: false })
  }
  return days
}

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════

export default function CalendarView({
  projectId,
  onTaskClick,
  onViewChange,
  currentView = 'calendar',
  currentUserRole = 'VIEWER',
}: {
  projectId?: string
  onTaskClick: (id: string) => void
  onViewChange: (v: any) => void
  currentView?: string
  currentUserRole?: ProjectRole | string
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const STATUS_LABEL: Record<TaskStatus, string> = {
    TODO:        t('task.status_TODO'),
    IN_PROGRESS: t('task.status_IN_PROGRESS'),
    IN_REVIEW:   t('task.status_IN_REVIEW'),
    DONE:        t('task.status_DONE'),
    CANCELLED:   t('task.status_CANCELLED'),
  }
  const now = new Date()
  const [currentYear,  setCurrentYear]  = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<CalendarApiTask | null>(null)

  const [filters, setFilters] = useState({
    search: '',
    assigneeId: '',
    priority: '' as '' | TaskPriority,
    status: '' as '' | TaskStatus,
    sprint: '',
    onlyMy: false,
  })

  const isReadOnly = currentUserRole === 'VIEWER' || currentUserRole === 'ROLE_VIEWER'

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['calendar', projectId, currentYear, currentMonth],
    queryFn:  () => TaskService.getCalendar(projectId!, currentYear, currentMonth),
    staleTime: 60_000,
    enabled: !!projectId,
    placeholderData: (prev) => prev,
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, dueDate }: { taskId: string; dueDate: string }) => 
      TaskService.updateTask(projectId!, taskId, { dueDate }),
    onMutate: async ({ taskId, dueDate }) => {
      await queryClient.cancelQueries({ queryKey: ['calendar', projectId, currentYear, currentMonth] })
      const previousData = queryClient.getQueryData(['calendar', projectId, currentYear, currentMonth])
      queryClient.setQueryData(['calendar', projectId, currentYear, currentMonth], (old: any) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map((t: any) => 
            t.id === taskId ? { ...t, dueDate } : t
          )
        }
      })
      return { previousData }
    },
    onError: (err: any, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['calendar', projectId, currentYear, currentMonth],
          context.previousData
        )
      }
      toast.error(err?.response?.data?.message || t('calendar.taskMovedError'))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', projectId] })
    },
    onSuccess: () => {
      toast.success(t('calendar.taskMovedSuccess'))
    },
  })

  const tasks: CalendarApiTask[] = data?.tasks ?? []

  const derivedFilters = useMemo(() => {
    const assignees = Array.from(
      new Map(
        tasks
          .filter((t): t is CalendarApiTask & { assignee: NonNullable<CalendarApiTask['assignee']> } => !!t.assignee)
          .map(t => [t.assignee.id, t.assignee])
      ).values()
    )
    const sprints = Array.from(new Set(tasks.map(t => t.sprint?.id).filter(Boolean))).map(id => ({
      id: id as string,
      name: tasks.find(t => t.sprint?.id === id)?.sprint?.name ?? 'Sprint'
    }))
    return { assignees, sprints }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase()
    return tasks.filter(t => {
      if (filters.assigneeId && t.assignee?.id !== filters.assigneeId) return false
      if (filters.priority && t.priority !== filters.priority) return false
      if (filters.status && t.taskStatus !== filters.status) return false
      if (filters.sprint && t.sprint?.id !== filters.sprint) return false
      if (keyword && !(t.title.toLowerCase().includes(keyword) || t.taskCode.toLowerCase().includes(keyword))) return false
      return true
    })
  }, [tasks, filters])

  const tasksByDate = useMemo(() => {
    const map: Record<string, CalendarApiTask[]> = {}
    filteredTasks.forEach(t => {
      if (!map[t.dueDate]) map[t.dueDate] = []
      map[t.dueDate].push(t)
    })
    return map
  }, [filteredTasks])

  const selectedTasks = useMemo(
    () => (selectedDate ? tasksByDate[selectedDate] ?? [] : []),
    [selectedDate, tasksByDate]
  )

  const overdueCount   = filteredTasks.filter(t => t.isOverdue && t.taskStatus !== 'DONE').length
  const completedCount = filteredTasks.filter(t => t.taskStatus === 'DONE').length

  const days = useMemo(
    () => buildCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  )

  const goPrev = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const goNext = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }
  const goToday = () => {
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth() + 1)
    setSelectedDate(toDateStr(now))
    setIsSidebarOpen(true)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const data = active.data.current as { type?: string; task?: CalendarApiTask } | undefined
    if (data?.type === 'task' && data.task) {
      setActiveTask(data.task)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return
    const activeData = active.data.current as { type?: string; task?: CalendarApiTask } | undefined
    const overData = over.data.current as { type?: string; dateStr?: string } | undefined
    if (activeData?.type === 'task' && overData?.type === 'day') {
      const taskId = activeData.task?.id
      const newDate = overData.dateStr
      if (taskId && newDate && activeData.task?.dueDate !== newDate) {
        updateTaskMutation.mutate({ taskId, dueDate: newDate })
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col min-h-full bg-slate-50/30">

        {/* ── TOOLBAR ── */}
        <div className="mb-4 sticky top-14 z-20">
          <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible rounded-xl border border-gray-200 bg-white p-2 shadow-sm hide-scrollbar">
            
            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder={t('kanban.searchTasks', { defaultValue: "Tìm kiếm task..." })}
                className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1.5 px-1.5 border-r border-gray-100 mr-1.5">
              <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100">
                <button onClick={goPrev} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all">
                  <ChevronLeft size={16} />
                </button>
                <div className="px-3 font-bold text-xs min-w-[120px] text-center text-gray-900 uppercase tracking-tight">
                  {new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
                <button onClick={goNext} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                onClick={goToday}
                className="h-9 px-4 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
              >
                {t('calendar.today')}
              </button>
            </div>

            {/* Filters */}
            <Chip
              active={filters.onlyMy}
              icon={<User size={13} />}
              label={t('backlog.me', { defaultValue: "Tôi" })}
              onClick={() => setFilters(f => ({ ...f, onlyMy: !f.onlyMy }))}
            />

            <FilterMenu
              label={t('common.assignee')}
              active={!!filters.assigneeId}
              icon={<Users size={13} />}
            >
              <button
                onClick={() => setFilters(f => ({ ...f, assigneeId: '' }))}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors font-medium",
                  !filters.assigneeId ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {t('common.all')} {t('common.assignee')}
              </button>
              {derivedFilters.assignees.map(a => (
                <button
                  key={a.id}
                  onClick={() => setFilters(f => ({ ...f, assigneeId: a.id }))}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors font-medium",
                    filters.assigneeId === a.id ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {a.fullName}
                </button>
              ))}
            </FilterMenu>

            <FilterMenu
              label="Priority"
              active={!!filters.priority}
              icon={<Tag size={13} />}
            >
              <button
                onClick={() => setFilters(f => ({ ...f, priority: '' }))}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors font-medium",
                  !filters.priority ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                All Priorities
              </button>
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setFilters(f => ({ ...f, priority: p }))}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors font-medium",
                    filters.priority === p ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {p}
                </button>
              ))}
            </FilterMenu>

            <FilterMenu
              label="Status"
              active={!!filters.status}
              icon={<ListFilter size={13} />}
            >
              <button
                onClick={() => setFilters(f => ({ ...f, status: '' }))}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors font-medium",
                  !filters.status ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                All Statuses
              </button>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFilters(f => ({ ...f, status: k as TaskStatus }))}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors font-medium",
                    filters.status === k ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {v}
                </button>
              ))}
            </FilterMenu>

            <FilterMenu
              label="Sprint"
              active={!!filters.sprint}
              icon={<Layers size={13} />}
            >
              <button
                onClick={() => setFilters(f => ({ ...f, sprint: '' }))}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors font-medium",
                  !filters.sprint ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                All Sprints
              </button>
              {derivedFilters.sprints.map(s => (
                <button
                  key={s.id}
                  onClick={() => setFilters(f => ({ ...f, sprint: s.id }))}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors font-medium",
                    filters.sprint === s.id ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {s.name}
                </button>
              ))}
            </FilterMenu>

            <div className="ml-auto flex items-center gap-2">
              {!isReadOnly && (
                <button
                  className="h-8 px-4 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 inline-flex items-center gap-2 shrink-0 active:scale-95"
                >
                  <Plus size={14} strokeWidth={3} />
                  {t('kanban.addTask', { defaultValue: "Thêm công việc" })}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── SUMMARY ROW ── */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 md:gap-6 overflow-x-auto hide-scrollbar shrink-0">
          <div className="flex-1 min-w-[180px] bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 shrink-0">
              <ClipboardList size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">{t('report.totalTasks')}</div>
              <div className="text-[16px] font-bold text-gray-900 leading-tight">
                {isLoading ? '...' : (data?.totalTasks ?? 0)} {t('nav.tasks').toLowerCase()}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-[180px] bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shadow-sm border border-red-100 shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">{t('task.overdue')}</div>
              <div className="text-[16px] font-bold text-gray-900 leading-tight">
                {isLoading ? '...' : overdueCount} {t('nav.tasks').toLowerCase()}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-[180px] bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">{t('sprint.status_COMPLETED')}</div>
              <div className="text-[16px] font-bold text-gray-900 leading-tight">
                {isLoading ? '...' : completedCount} {t('nav.tasks').toLowerCase()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-start pb-6">

          {/* ── CALENDAR GRID ── */}
          <div className="flex-1 min-w-0 rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">

            {/* Loading skeleton */}
            {isLoading && (
              <div className="grid grid-cols-7 auto-rows-[130px]">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div key={i} className="border-r border-b border-gray-100 p-2">
                    <div className="h-4 w-6 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse mb-1" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {isError && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <AlertCircle size={32} className="mb-3 text-red-400" />
                <p className="text-sm font-medium mb-3">{t('calendar.loadError')}</p>
                <button
                  onClick={() => refetch()}
                  className="text-sm text-blue-500 underline hover:text-blue-700"
                >
                  {t('common.retry')}
                </button>
              </div>
            )}

            {/* Calendar */}
            {!isLoading && !isError && (
              <div className="flex flex-col w-full">
                {/* Weekdays header */}
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
                  {[t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat'), t('calendar.sun')].map(day => (
                    <div key={day} className="py-3 text-center text-[11px] font-bold text-gray-600 uppercase tracking-widest">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 auto-rows-fr">
                  {days.map((dayObj, idx) => {
                    const dateStr    = toDateStr(dayObj.date)
                    const isDaySelected = selectedDate === dateStr
                    const dayTasks   = tasksByDate[dateStr] ?? []
                    const isToday    = toDateStr(new Date()) === dateStr

                    return (
                      <DroppableDay
                        key={idx}
                        dateStr={dateStr}
                        isToday={isToday}
                        isCurrentMonth={dayObj.isCurrentMonth}
                        isDaySelected={isDaySelected}
                        taskCount={dayTasks.length}
                        onClick={() => { setSelectedDate(dateStr); setIsSidebarOpen(true) }}
                      >
                        {dayTasks.slice(0, 3).map(task => (
                          <DraggableTaskCard
                            key={task.id}
                            task={task}
                            disabled={isReadOnly}
                            onClick={(e) => { e.stopPropagation(); onTaskClick(task.id) }}
                          />
                        ))}
                      </DroppableDay>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          {isSidebarOpen && selectedDate && (
            <div className="w-[320px] bg-white border border-gray-200 rounded-2xl flex flex-col shrink-0 overflow-hidden shadow-sm sticky top-5 h-fit max-h-[calc(100vh-40px)]">
              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 bg-white">
                <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">
                  {new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).format(
                    new Date(selectedDate + 'T00:00:00')
                  )}
                </h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-3 flex items-center justify-between bg-white shrink-0 border-b border-gray-50">
                <h3 className="text-[14px] font-bold text-gray-700">{selectedTasks.length} {t('nav.tasks').toLowerCase()}</h3>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3 space-y-3 bg-white custom-scrollbar">
                {selectedTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <ClipboardList size={36} strokeWidth={1} className="mb-3 opacity-20" />
                    <p className="text-xs font-medium italic">{t('task.noTasks')}</p>
                  </div>
                ) : (
                  selectedTasks.map(task => {
                    const pc = PRIORITY_CONFIG[task.priority]
                    const isDone = task.taskStatus === 'DONE'
                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task.id)}
                        className={cn(
                          'group relative bg-white border rounded-[10px] p-3.5 cursor-pointer transition-shadow hover:shadow-md',
                          task.isOverdue && !isDone ? 'border-red-200' : 'border-gray-200',
                          isDone && 'bg-gray-50/50'
                        )}
                      >
                        {/* Priority stripe */}
                        <div className={cn(
                          'absolute left-0 top-3 bottom-3 w-[4px] rounded-r-full',
                          task.priority === 'CRITICAL' || task.priority === 'HIGH' ? 'bg-red-500'
                            : task.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500'
                        )} />

                        <div className="flex items-center gap-2 mb-2 pl-1">
                          <span className="bg-[#EFF6FF] text-[#1677FF] text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                            {task.taskCode}
                          </span>
                          <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full', pc.bg, pc.text)}>
                            {task.priority === 'CRITICAL' ? `⇈ ${t('task.priority_CRITICAL')}` : task.priority === 'HIGH' ? `↑ ${t('task.priority_HIGH')}` : task.priority === 'MEDIUM' ? `→ ${t('task.priority_MEDIUM')}` : `↓ ${t('task.priority_LOW')}`}
                          </span>
                          {task.isOverdue && !isDone && (
                            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">
                              ⚠ {t('task.overdue')}
                            </span>
                          )}
                          {isDone && (
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                              ✓ {t('task.status_DONE')}
                            </span>
                          )}
                        </div>

                        <h4 className={cn('text-[13px] font-bold text-gray-900 leading-snug mb-2 pl-1 line-clamp-2', isDone && 'line-through text-gray-500')}>
                          {task.title}
                        </h4>

                        <div className="flex items-center justify-between pl-1">
                          <div className="flex items-center gap-1.5">
                            <div className={cn('w-2 h-2 rounded-full', STATUS_DOT[task.taskStatus])} />
                            <span className="text-[11px] text-gray-500 font-medium">{STATUS_LABEL[task.taskStatus]}</span>
                          </div>
                          {task.assignee ? (
                            <UserAvatar name={task.assignee.fullName} src={task.assignee.avatarUrl ?? undefined} size={22} className="border-2 border-white shadow-sm" />
                          ) : (
                            <div className="w-[22px] h-[22px] rounded-full bg-gray-100 flex items-center justify-center">
                              <User size={12} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeTask ? (
            <div className={cn(
              'w-[180px] text-left px-2 py-1 rounded-[4px] text-[10px] font-semibold truncate border shadow-xl bg-white flex items-center gap-1.5 ring-2 ring-blue-500 opacity-90',
              PRIORITY_CONFIG[activeTask.priority].text
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_CONFIG[activeTask.priority].text.replace('text', 'bg'))} />
              <span className="font-mono text-[9px]">{activeTask.taskCode}</span>
              <span className="truncate">{activeTask.title}</span>
            </div>
          ) : null}
        </DragOverlay>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 5px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    </DndContext>
  )
}
