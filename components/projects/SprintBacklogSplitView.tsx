"use client"

import React, { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { useProjectSprints } from "@/hooks/useProjectSprints"
import { useTaskList } from "@/hooks/useTaskQueries"
import { TaskResponse, TaskPriority, TaskType, TaskStatus } from "@/app/types/task.schema"
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable"
import { Progress } from "@/components/ui/progress"
import { 
  Plus, 
  GripVertical, 
  Filter, 
  ChevronRight, 
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Search,
  User as UserIcon,
  Trash2,
  Edit2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/common/UserAvatar"
import { cn } from "@/lib/utils"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"

// ── Types ─────────────────────────────────────────────────────

interface SprintBacklogSplitViewProps {
  projectId: string
  myRole?: string
}

// ── Components ────────────────────────────────────────────────

const TaskPriorityBadge = ({ priority }: { priority: TaskPriority }) => {
  const configs: Record<TaskPriority, { label: string; className: string }> = {
    CRITICAL: { label: "Critical", className: "bg-red-100 text-red-700 border-red-200" },
    HIGH: { label: "High", className: "bg-orange-100 text-orange-700 border-orange-200" },
    MEDIUM: { label: "Medium", className: "bg-blue-100 text-blue-700 border-blue-200" },
    LOW: { label: "Low", className: "bg-slate-100 text-slate-700 border-slate-200" },
  }
  const config = configs[priority] || configs.MEDIUM
  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold px-1.5 py-0 h-5", config.className)}>
      {config.label}
    </Badge>
  )
}

const TaskTypeIcon = ({ type }: { type: TaskType }) => {
  const configs: Record<TaskType, { icon: React.ReactNode; color: string }> = {
    BUG: { icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-red-500" },
    FEATURE: { icon: <Plus className="w-3.5 h-3.5" />, color: "text-blue-500" },
    TASK: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-slate-500" },
    STORY: { icon: <Clock className="w-3.5 h-3.5" />, color: "text-orange-500" },
    EPIC: { icon: <GripVertical className="w-3.5 h-3.5" />, color: "text-purple-500" },
    SUB_TASK: { icon: <ChevronRight className="w-3.5 h-3.5" />, color: "text-slate-400" },
  }
  const config = configs[type] || configs.TASK
  return <div className={cn(config.color)}>{config.icon}</div>
}

const BacklogTaskCard = ({ task, isSelected, onSelect }: { task: TaskResponse, isSelected: boolean, onSelect: (id: string) => void }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all mb-2 cursor-pointer",
        isSelected && "border-blue-500 bg-blue-50/30"
      )}
      onClick={() => onSelect(task.id)}
    >
      <div className="flex items-center gap-2 shrink-0">
        <button className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
          <GripVertical size={16} />
        </button>
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => onSelect(task.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{task.taskCode}</span>
          <TaskTypeIcon type={task.type} />
        </div>
        <h4 className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{task.title}</h4>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <TaskPriorityBadge priority={task.priority} />
        <UserAvatar 
          name={task.assignee?.fullName || "Unassigned"} 
          src={task.assignee?.avatarUrl || undefined} 
          size={24} 
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem><Edit2 className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

const MiniKanbanColumn = ({ title, status, tasks }: { title: string, status: TaskStatus, tasks: TaskResponse[] }) => {
  return (
    <div className="flex flex-col flex-1 bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-200 bg-white flex items-center justify-between">
        <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{title}</h5>
        <Badge variant="secondary" className="bg-slate-200 text-slate-600 h-5 px-1.5 text-[10px]">{tasks.length}</Badge>
      </div>
      <ScrollArea className="flex-1 p-2">
        {tasks.map(task => (
          <div key={task.id} className="p-2 bg-white border border-slate-200 rounded-lg mb-2 shadow-sm hover:border-blue-300 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{task.taskCode}</span>
              <TaskTypeIcon type={task.type} />
            </div>
            <p className="text-[12px] font-medium text-slate-700 leading-tight mb-2 line-clamp-2">{task.title}</p>
            <div className="flex items-center justify-between">
              <TaskPriorityBadge priority={task.priority} />
              <UserAvatar 
                name={task.assignee?.fullName || "Unassigned"} 
                src={task.assignee?.avatarUrl || undefined} 
                size={20} 
              />
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-xl opacity-40">
            <span className="text-[10px] font-medium text-slate-500">Drop tasks here</span>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────

export default function SprintBacklogSplitView({ projectId, myRole = "viewer" }: SprintBacklogSplitViewProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const isPM = myRole === "project_manager" || myRole === "system_admin"

  // Fetch Sprints
  const { data: sprints, isLoading: sprintsLoading } = useProjectSprints(projectId)
  const activeSprint = useMemo(() => sprints?.find(s => s.status === "ACTIVE"), [sprints])

  // Fetch Backlog Tasks
  const { data: backlogTasks, isLoading: backlogLoading } = useTaskList(projectId, { sprintId: "backlog" })
  
  // Fetch Active Sprint Tasks
  const { data: sprintTasks, isLoading: sprintTasksLoading } = useTaskList(projectId, { sprintId: activeSprint?.id })

  const handleSelectTask = (id: string) => {
    setSelectedTasks(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const handleSelectAllBacklog = () => {
    if (selectedTasks.length === (backlogTasks?.content.length || 0)) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(backlogTasks?.content.map(t => t.id) || [])
    }
  }

  const completionPercentage = useMemo(() => {
    if (!sprintTasks?.content.length) return 0
    const doneTasks = sprintTasks.content.filter(t => t.taskStatus === "DONE").length
    return Math.round((doneTasks / sprintTasks.content.length) * 100)
  }, [sprintTasks])

  const todoTasks = useMemo(() => sprintTasks?.content.filter(t => t.taskStatus === "TODO") || [], [sprintTasks])
  const inProgressTasks = useMemo(() => sprintTasks?.content.filter(t => t.taskStatus === "IN_PROGRESS" || t.taskStatus === "IN_REVIEW") || [], [sprintTasks])
  const doneTasks = useMemo(() => sprintTasks?.content.filter(t => t.taskStatus === "DONE") || [], [sprintTasks])

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* LEFT PANE: ACTIVE SPRINT */}
        <ResizablePanel defaultSize={45} minSize={30}>
          <div className="flex flex-col h-full border-r border-slate-200">
            {activeSprint ? (
              <>
                {/* Sprint Header */}
                <div className="p-5 bg-gradient-to-br from-white to-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">{activeSprint.name}</h2>
                      <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                        <CalendarIcon size={14} />
                        {activeSprint.startDate || "N/A"} - {activeSprint.endDate || "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block mb-1">Status: Active</span>
                      <div className="flex items-center gap-2 text-[13px] font-bold text-slate-700">
                        <span className="text-blue-600">{completionPercentage}%</span>
                        <span>Complete</span>
                      </div>
                    </div>
                  </div>
                  
                  <Progress value={completionPercentage} className="h-2 mb-4 bg-slate-200" />
                  
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Goal</span>
                      <p className="text-[12px] text-slate-600 italic font-medium">Deliver MVP features for the new dashboard...</p>
                    </div>
                  </div>
                </div>

                {/* Mini Kanban */}
                <div className="flex-1 p-4 flex gap-3 overflow-hidden">
                  <MiniKanbanColumn title="To Do" status="TODO" tasks={todoTasks} />
                  <MiniKanbanColumn title="In Progress" status="IN_PROGRESS" tasks={inProgressTasks} />
                  <MiniKanbanColumn title="Done" status="DONE" tasks={doneTasks} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                <div className="w-48 h-48 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                   <Clock size={64} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">No Active Sprint</h3>
                <p className="text-sm text-slate-500 max-w-[280px] leading-relaxed mb-6">
                  There is currently no active sprint. Start a new sprint from the backlog to track progress.
                </p>
                {isPM && (
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95">
                    <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Create New Sprint
                  </Button>
                )}
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* RIGHT PANE: BACKLOG */}
        <ResizablePanel defaultSize={55} minSize={35}>
          <div className="flex flex-col h-full bg-slate-50/30">
            {/* Backlog Toolbar */}
            <div className="p-5 bg-white border-b border-slate-200 shadow-sm z-10">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Project Backlog</h2>
                  <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">{backlogTasks?.totalElements || 0} tasks</Badge>
                </div>
                <div className="flex items-center gap-2">
                   {isPM && (
                     <Button className="bg-[#111827] hover:bg-slate-800 text-white font-bold h-10 px-5 rounded-xl shadow-sm transition-all active:scale-95">
                        <Plus className="mr-2 h-5 w-5" /> Create Sprint
                     </Button>
                   )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search backlog..." 
                    className="w-full h-10 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-10 px-4 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all">
                        <Filter className="mr-2 h-4 w-4" /> Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem>Priority: All</DropdownMenuItem>
                      <DropdownMenuItem>Task Type: All</DropdownMenuItem>
                      <DropdownMenuItem>Assignee: All</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="w-[1px] h-6 bg-slate-200 mx-1" />

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-10 w-10 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50", selectedTasks.length > 0 && "text-blue-600 bg-blue-50")}
                    onClick={handleSelectAllBacklog}
                  >
                    <CheckCircle2 size={20} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Backlog List */}
            <ScrollArea className="flex-1 p-5">
              <div className="mb-4 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2">
                <span>Task Details</span>
                <span>Actions</span>
              </div>
              
              {backlogLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-16 w-full bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="relative">
                  {/* Visual Indicator for Dragging */}
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400/0 via-blue-400/20 to-blue-400/0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  {backlogTasks?.content.map(task => (
                    <BacklogTaskCard 
                      key={task.id} 
                      task={task} 
                      isSelected={selectedTasks.includes(task.id)}
                      onSelect={handleSelectTask}
                    />
                  ))}

                  {backlogTasks?.content.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                        <Clock size={32} className="text-slate-200" />
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Backlog is empty</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Batch Actions Bar */}
              <AnimatePresence>
                {selectedTasks.length > 0 && (
                  <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#111827] text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-6 border border-slate-700/50 backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[12px] font-bold">{selectedTasks.length}</span>
                      <span className="text-sm font-bold text-slate-300">tasks selected</span>
                    </div>
                    <div className="w-[1px] h-6 bg-slate-700" />
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800 font-bold rounded-lg">
                        <UserIcon className="mr-2 h-4 w-4" /> Assign
                      </Button>
                      <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800 font-bold rounded-lg">
                        <Edit2 className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 font-bold rounded-lg">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTasks([])} className="text-slate-500 hover:text-white font-bold">Cancel</Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
