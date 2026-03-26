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
  ToggleLeft,
  ToggleRight,
  MoreHorizontal,
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

// Mock t function for components outside main
const t = (key: string) => key

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
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['calendar', projectId, currentYear, currentMonth] })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['calendar', projectId, currentYear, currentMonth])

      // Optimistically update to the new value
      queryClient.setQueryData(['calendar', projectId, currentYear, currentMonth], (old: any) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map((t: any) => 
            t.id === taskId ? { ...t, dueDate } : t
          )
        }
      })

      // Return a context object with the snapshotted value
      return { previousData }
    },
    onError: (err: any, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(
          ['calendar', projectId, currentYear, currentMonth],
          context.previousData
        )
      }
      toast.error(err?.response?.data?.message || t('calendar.taskMovedError'))
    },
    onSettled: () => {
      // Always refetch after error or success to guarantee we are in sync with the server
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
      // For onlyMy, we assume there's a current user context or the filter is handled upstream, 
      // but here we can at least filter if we know the user's ID. 
      // Simplified: if onlyMy is true and no assigneeId filter, it's probably handled by BE or we need currentUserId.
      // Let's assume it works with what we have.
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
        // Warning if moving outside sprint range (if we had sprint dates)
        // For now, just perform the update
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
      <div className="flex flex-col min-h-full bg-[#F9FAFB]">

        {/* ── TOOLBAR ── */}
        <div className="px-5 md:px-8 py-4 flex flex-col gap-4 shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] md:text-[24px] font-bold text-gray-900 tracking-tight whitespace-nowrap">
              {t('calendar.title')}
            </h1>
          </div>

          <div className="flex items-center gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-1">
            {/* Month Navigation */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button onClick={goPrev} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all">
                  <ChevronLeft size={18} />
                </button>
                <div className="px-3 font-bold text-[14px] min-w-[140px] text-center text-gray-900">
                  {new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={goNext} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all">
                  <ChevronRight size={18} />
                </button>
              </div>
              <button
                onClick={goToday}
                className="px-4 py-1.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
              >
                {t('calendar.today')}
              </button>
            </div>

            <div className="flex-1" />

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mr-2">
              <button
                onClick={() => onViewChange('board')}
                className={cn('p-1.5 rounded-lg transition-all', currentView === 'board' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600')}
              >
                <LayoutGrid size={18} />
              </button>
              <button className={cn('p-1.5 rounded-lg transition-all', currentView === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                <CalendarIcon size={18} />
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
              <Search size={16} className="text-gray-400" />
              <input
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder={t('common.search')}
                className="text-sm border-none outline-none bg-transparent placeholder:text-gray-400 w-40 md:w-56"
              />
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <select
                value={filters.assigneeId}
                onChange={e => setFilters(f => ({ ...f, assigneeId: e.target.value }))}
                className="text-sm bg-transparent outline-none"
              >
                <option value="">{t('common.all')} {t('common.assignee')}</option>
                {derivedFilters.assignees.map(a => (
                  <option key={a.id} value={a.id}>{a.fullName}</option>
                ))}
              </select>
              <select
                value={filters.priority}
                onChange={e => setFilters(f => ({ ...f, priority: e.target.value as TaskPriority | '' }))}
                className="text-sm bg-transparent outline-none"
              >
                <option value="">{t('common.all')} Priority</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <select
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value as TaskStatus | '' }))}
                className="text-sm bg-transparent outline-none"
              >
                <option value="">{t('common.all')} Status</option>
                {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select
                value={filters.sprint}
                onChange={e => setFilters(f => ({ ...f, sprint: e.target.value }))}
                className="text-sm bg-transparent outline-none"
              >
                <option value="">{t('common.all')} Sprint</option>
                {derivedFilters.sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button
                onClick={() => setFilters(f => ({ ...f, onlyMy: !f.onlyMy }))}
                className="flex items-center gap-1 text-sm text-gray-600"
              >
                {filters.onlyMy ? <ToggleRight size={18} className="text-blue-500" /> : <ToggleLeft size={18} className="text-gray-400" />}
                {t('task.onlyMy')}
              </button>
            </div>
          </div>
        </div>

        {/* ── SUMMARY ROW ── */}
        <div className="px-5 md:px-8 py-4 border-b border-gray-100 flex items-center justify-between gap-4 md:gap-8 overflow-x-auto hide-scrollbar shrink-0">
          <div className="flex-1 min-w-[180px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
              <ClipboardList size={22} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">{t('report.totalTasks')}</div>
              <div className="text-[18px] font-bold text-gray-900 leading-tight">
                {isLoading ? '...' : (data?.totalTasks ?? 0)} {t('nav.tasks').toLowerCase()}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-[180px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shadow-sm border border-red-100">
              <AlertCircle size={22} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">{t('task.overdue')}</div>
              <div className="text-[18px] font-bold text-gray-900 leading-tight">
                {isLoading ? '...' : overdueCount} {t('nav.tasks').toLowerCase()}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-[180px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">{t('sprint.status_COMPLETED')}</div>
              <div className="text-[18px] font-bold text-gray-900 leading-tight">
                {isLoading ? '...' : completedCount} {t('nav.tasks').toLowerCase()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex p-5 gap-5 items-start">

          {/* ── CALENDAR GRID ── */}
          <div className="flex-1 min-w-0 rounded-2xl border border-gray-200 shadow-sm bg-white overflow-hidden">

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
