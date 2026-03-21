"use client";

import React, { useState, useEffect } from "react";
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis,
} from "recharts";
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { 
  Plus, 
  CheckSquare, 
  Clock, 
  CheckCircle, 
  Bell, 
  LayoutGrid,
  List as ListIcon,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CreateProjectModal } from "@/components/projects/ProjectModals";
import { ProjectService } from "@/app/services/ProjectService";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Project } from "@/app/types/project..schema";

// ——————————————————————————————————————————————————————————————————————————————————
// HELPERS
// ——————————————————————————————————————————————————————————————————————————————————

const getProjectColor = (id: string) => {
  const colors = ["bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-orange-500", "bg-pink-500", "bg-indigo-500"];
  const charSum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
};

// ——————————————————————————————————————————————————————————————————————————————————
// COMPONENTS
// ——————————————————————————————————————————————————————————————————————————————————

const chartData = [
  { day: "Mon", tasks: 4 },
  { day: "Tue", tasks: 7 },
  { day: "Wed", tasks: 5 },
  { day: "Thu", tasks: 8 },
  { day: "Fri", tasks: 12 },
  { day: "Sat", tasks: 9 },
  { day: "Sun", tasks: 3 },
];

const chartConfig = {
  tasks: {
    label: "Tasks completed",
    color: "#1A73E8",
  },
} satisfies ChartConfig;

const DashboardActivityChart = () => {
  return (
    <Card className="p-5 flex flex-col h-full bg-white border border-[#E8EAED] rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-[15px] text-gray-900 flex items-center gap-2">
          📊 This Week's Performance
        </h2>
        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
          +12% vs last week
        </span>
      </div>
      <div className="flex-1 min-h-[180px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
          <BarChart accessibilityLayer data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="day"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
              fontSize={11}
              fontWeight={600}
              stroke="#9CA3AF"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="tasks" fill="var(--color-tasks)" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ChartContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-green-500" />
            <span className="text-[11px] font-bold text-gray-500">Steady growth</span>
         </div>
         <span className="text-[10px] font-bold text-gray-400">Updated: Just now</span>
      </div>
    </Card>
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white border border-[#E8EAED] rounded-xl shadow-sm", className)}>
    {children}
  </div>
);

const PriorityBadge = ({ priority }: { priority: string }) => {
  const styles: Record<string, string> = {
    HIGH: "bg-[#FAD2CF] text-[#D93025]",
    MEDIUM: "bg-[#FEEFC3] text-[#F9AB00]",
    LOW: "bg-[#E6F4EA] text-[#1E8E3E]",
  };
  
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold uppercase", styles[priority] || "bg-gray-100 text-gray-600")}>
      {priority}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    IN_PROGRESS: "bg-[#E8F0FE] text-[#1967D2] border border-[#ADCCF9]",
    TODO: "bg-[#F1F3F4] text-[#5F6368] border border-[#DADCE0]",
    DONE: "bg-[#E6F4EA] text-[#1E8E3E] border border-[#CEEAD6]",
    ACTIVE: "bg-[#E6F4EA] text-[#1E8E3E] border border-[#CEEAD6]",
    COMPLETED: "bg-[#E8F0FE] text-[#1967D2] border border-[#ADCCF9]",
  };

  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold uppercase border", styles[status] || "bg-gray-100 text-gray-600")}>
      {status === "IN_PROGRESS" ? "In Progress" : status === "TODO" ? "To Do" : status === "DONE" ? "Done" : status}
    </span>
  );
};

const EmptyState = ({ title, subtitle, description, onClick }: { title: string; subtitle?: string; description: string; onClick?: () => void }) => (
  <div 
    className={cn(
      "flex flex-col items-center justify-center py-10 px-4 text-center bg-gray-50/30 rounded-xl border border-dashed border-gray-200 transition-all",
      onClick && "cursor-pointer"
    )}
    onClick={onClick}
  >
    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
      <div className="w-9 h-9 bg-gray-50 rounded-full flex items-center justify-center">
        <Image src="/images/project_is_empty.png" alt="Empty" width={24} height={24} />
      </div>
    </div>
    <h3 className="text-[15px] font-bold text-black mb-0.5">{title}</h3>
    {subtitle && <p className="text-[13px] font-bold text-black mb-1.5">{subtitle}</p>}
    <p className="text-[12px] text-black max-w-[280px] leading-relaxed opacity-70">{description}</p>
    {onClick && (
        <div className="mt-4 text-[12px] font-bold text-black underline underline-offset-4">
            Create a project now
        </div>
    )}
  </div>
);

const InviteCard = ({ invite, onAccept, onDecline, isProcessing }: any) => (
  <div className="p-3 border border-[#F1F3F4] rounded-lg bg-[#F8F9FA] hover:bg-white hover:shadow-sm transition-all group">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-gray-600 leading-snug">
          <span className="font-bold text-gray-900">{invite.inviterName}</span> invited you to <span className="font-bold text-[#1A73E8]">"{invite.projectName}"</span>
        </p>
        <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">{invite.role}</span>
            <span className="text-[10px] text-gray-400 font-medium italic">Expires in {invite.daysLeft} days</span>
        </div>
      </div>
    </div>
    <div className="flex gap-2 mt-3">
      <button 
        disabled={isProcessing}
        onClick={() => onAccept(invite.token)}
        className="flex-1 h-8 rounded-lg bg-[#1A73E8] text-white text-[11px] font-bold hover:bg-[#1557B0] transition-colors disabled:opacity-50"
      >
        Accept
      </button>
      <button
        disabled={isProcessing}
        onClick={() => onDecline(invite.token)}
        className="flex-1 h-8 rounded-lg bg-white border border-[#E8EAED] text-gray-600 text-[11px] font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  </div>
);

// ——————————————————————————————————————————————————————————————————————————————————
// MAIN DASHBOARD
// ——————————————————————————————————————————————————————————————————————————————————

export default function HomeDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [taskView, setTaskView] = useState<'list' | 'grid'>('list');
  const [showCreate, setShowCreate] = useState(false);

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["projects", { status: "active", size: 6 }],
    queryFn: () => ProjectService.search({ status: "active", size: 6 }),
  });

  const { data: myInvites, isLoading: isLoadingInvites } = useQuery({
    queryKey: ["my-invites"],
    queryFn: () => ProjectMemberService.getMyInvites(),
  });

  const projects = projectsData?.data?.content || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: ProjectService.create,
    onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        setShowCreate(false);
        toast.success(`Project "${res.data.name}" created successfully!`);
    },
    onError: (error: any) => {
        toast.error(error.response?.data?.message || "Unable to create project.");
    }
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (token: string) => ProjectMemberService.acceptInvite(token),
    onSuccess: (res) => {
        toast.success(res.message || "Invitation accepted successfully!");
        queryClient.invalidateQueries({ queryKey: ["my-invites"] });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        router.push(`/projects/${res.projectId}`);
    },
    onError: (error: any) => {
        toast.error(error.response?.data?.meta?.message || "Unable to accept invitation.");
    }
  });

  const declineInviteMutation = useMutation({
    mutationFn: (token: string) => ProjectMemberService.declineInvite(token),
    onSuccess: () => {
        toast.success("Invitation declined.");
        queryClient.invalidateQueries({ queryKey: ["my-invites"] });
    },
    onError: (error: any) => {
        toast.error(error.response?.data?.meta?.message || "Unable to decline invitation.");
    }
  });

  function handleCreate(data: any) {
    createMutation.mutate({
        name: data.name,
        projectKey: data.key,
        description: data.description,
        visibility: data.visibility,
    });
  }

  // Static/Mock State (keeping the lively dashboard feel)
  const stats = [
    { id: 1, label: "Today's Tasks", value: "8", sub: "3 in progress", icon: CheckSquare, iconColor: "#1A73E8", bgColor: "#E8F0FE", trend: "+2", trendColor: "text-blue-600" },
    { id: 2, label: "Upcoming Deadlines", value: "2", sub: "Within 3 days", icon: Clock, iconColor: "#F9AB00", bgColor: "#FEEFC3", trend: "!", trendColor: "text-orange-600" },
    { id: 3, label: "Completed This Week", value: "12", sub: "+15% vs last week", icon: CheckCircle, iconColor: "#1E8E3E", bgColor: "#E6F4EA", trend: "↑", trendColor: "text-green-600" },
    { id: 4, label: "New Notifications", value: "5", sub: "Updates from 3 projects", icon: Bell, iconColor: "#A142F4", bgColor: "#F3E8FD", trend: "New", trendColor: "text-purple-600" },
  ];

  const myTasks = [
    { id: "1", title: "UI/UX Design for Landing Page", project: "E-Commerce Web", priority: "HIGH", status: "IN_PROGRESS", dueDate: "2024-03-20", progress: 65 },
    { id: "2", title: "API Integration for Auth Module", project: "TaskSphere App", priority: "MEDIUM", status: "TODO", dueDate: "2024-03-22", progress: 0 },
    { id: "3", title: "Write Unit Tests for Service Layer", project: "Banking System", priority: "LOW", status: "DONE", dueDate: "2024-03-15", progress: 100 },
    { id: "4", title: "Refactor Code Base", project: "Internal Tool", priority: "HIGH", status: "IN_PROGRESS", dueDate: "2024-03-18", progress: 40 },
  ];

  const activities = [
    { id: "1", user: "Alice Johnson", action: "completed task", target: "Setup Database", time: "10 minutes ago", type: "task" },
    { id: "2", user: "Bob Smith", action: "added a comment to", target: "UI Design", time: "30 minutes ago", type: "comment" },
    { id: "3", user: "Charlie Lee", action: "changed status of", target: "API Specs", time: "2 hours ago", type: "status" },
    { id: "4", user: "Diana Park", action: "created new project", target: "Marketing Q2", time: "5 hours ago", type: "project" },
  ];

  const today = new Date();
  const dateString = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      {/* SECTION 1 — GREETING HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">
            Good morning, {user?.fullName || "Member"} 👋
          </h1>
          <p className="text-[13px] text-[#5F6368] mt-1">{dateString}</p>
        </div>
        <Link href="/projects">
          <Button className="bg-[#1A73E8] hover:bg-[#1557B0] text-white h-9 px-4 rounded-lg flex items-center gap-2 text-[13px] font-bold transition-all shadow-sm border-0">
            <Plus size={15} strokeWidth={2.5} />
            Start New Project
          </Button>
        </Link>
      </div>

      {/* SECTION 2 — STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((card) => (
          <Card key={card.id} className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-default group">
            <div 
              className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border border-black/5 group-hover:scale-110 transition-transform"
              style={{ backgroundColor: card.bgColor }}
            >
              <card.icon size={20} style={{ color: card.iconColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="text-[24px] font-bold leading-tight text-gray-900">
                    {card.value}
                </div>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", card.trendColor, "bg-gray-50 border border-black/5")}>
                    {card.trend}
                </span>
              </div>
              <div className="text-[11px] font-bold text-gray-900 uppercase tracking-tight">{card.label}</div>
              <div className="text-[10px] font-semibold opacity-80 text-[#5F6368] truncate">{card.sub}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* SECTION 3 — CONTENT */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN */}
        <div className="flex-[3] flex flex-col gap-4">
          {/* CARD: My Tasks */}
          <Card className="p-5 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <h2 className="font-bold text-[15px] text-gray-900 flex items-center gap-2">
                📋 My Tasks
              </h2>

              <div className="flex items-center gap-3">
                <div className="flex bg-[#F1F3F4] p-1 rounded-lg border border-[#E8EAED]">
                  <button onClick={() => setTaskView('list')} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all", taskView === 'list' ? "bg-white text-[#1A73E8] shadow-sm" : "text-[#5F6368] hover:bg-gray-50")}><ListIcon size={13} /><span>List</span></button>
                  <button onClick={() => setTaskView('grid')} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all", taskView === 'grid' ? "bg-white text-[#1A73E8] shadow-sm" : "text-[#5F6368] hover:bg-gray-50")}><LayoutGrid size={13} /><span>Grid</span></button>
                </div>
              </div>
            </div>

            {myTasks.length > 0 ? (
              <div className={cn(
                "grid gap-3",
                taskView === 'grid' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
              )}>
                {myTasks.map((task) => (
                  <div key={task.id} className="flex flex-col p-3 border border-[#F1F3F4] rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          task.status === 'DONE' ? "bg-green-500" : task.status === 'IN_PROGRESS' ? "bg-blue-500" : "bg-gray-300"
                        )} />
                        <div>
                          <div className="text-[13px] font-bold text-gray-900 group-hover:text-[#1A73E8] transition-colors line-clamp-1">{task.title}</div>
                          <div className="text-[10px] text-gray-500 font-medium">{task.project}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 mt-2">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className={cn("h-full transition-all duration-500", task.status === 'DONE' ? "bg-green-500" : "bg-blue-500")}
                                style={{ width: `${task.progress}%` }} 
                            />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 w-8 text-right">{task.progress}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-gray-400 font-medium">Due: {task.dueDate}</span>
                        <StatusBadge status={task.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No tasks yet"
                description="Tasks assigned to you will appear here. Start by joining a project."
              />
            )}
          </Card>

          {/* CARD: My Projects */}
          <Card className="p-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-[15px] text-gray-900 flex items-center gap-2">
                📁 Active Projects
              </h2>
              <Link href="/projects" className="text-[12px] font-bold text-[#1A73E8] hover:underline">View all →</Link>
            </div>

            {isLoadingProjects ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />)}
              </div>
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {projects.map((project: Project) => {
                  const projectColor = getProjectColor(project.id);
                  return (
                    <Link href={`/projects/${project.id}`} key={project.id}>
                      <div className="p-4 border border-[#F1F3F4] rounded-xl hover:shadow-md transition-all h-full flex flex-col relative overflow-hidden group">
                        {project.taskStats?.overdue > 0 && (
                          <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-2 py-0.5 font-bold uppercase rounded-bl-lg animate-pulse z-10">
                            {project.taskStats.overdue} Overdue
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0", projectColor)}>
                            {project.projectKey}
                          </div>
                          <div className="text-[13px] font-bold text-gray-900 truncate group-hover:text-[#1A73E8] transition-colors">{project.name}</div>
                        </div>
                        
                        <div className="mt-auto">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-500", projectColor.replace('bg-', 'bg-opacity-80 bg-'))} 
                              style={{ width: `${project.progress}%` }} 
                            />
                          </div>
                          <div className="flex justify-between items-center mt-3 text-[10px] text-gray-400">
                             <span className="flex items-center gap-1 font-medium">👥 {project.memberCount} members</span>
                             <span className="font-medium">{project.taskStats?.total || 0} tasks</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No projects"
                subtitle="Start your first project"
                description="Click anywhere to create a professional workspace and start managing your work effectively."
                onClick={() => setShowCreate(true)}
              />
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-[2] flex flex-col gap-4">
          {/* CARD: Project Invitations */}
          {myInvites && myInvites.length > 0 && (
            <Card className="p-5 border-[#1A73E8]/30 bg-[#E8F0FE]/10 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="font-bold text-[15px] text-gray-900 mb-4 flex items-center gap-2">
                ✉️ New Invitations
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF4D4F] text-[10px] text-white animate-bounce">
                  {myInvites.length}
                </span>
              </h2>
              <div className="flex flex-col gap-3">
                {myInvites.map((invite: any) => (
                  <InviteCard 
                    key={invite.id} 
                    invite={invite} 
                    onAccept={(t: string) => acceptInviteMutation.mutate(t)}
                    onDecline={(t: string) => declineInviteMutation.mutate(t)}
                    isProcessing={acceptInviteMutation.isPending || declineInviteMutation.isPending}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* CARD: Performance Chart */}
          <DashboardActivityChart />

          {/* CARD: Activity */}
          <Card className="p-5">
            <h2 className="font-bold text-[15px] text-gray-900 mb-4">🕐 Recent Activity</h2>
            {activities.length > 0 ? (
              <div className="flex flex-col gap-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 relative pb-4 last:pb-0">
                    <div className="absolute left-[15px] top-8 bottom-0 w-[1px] bg-gray-100 last:hidden" />
                    
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 z-10 text-[10px]">
                      {activity.user.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[12px] text-gray-600 leading-snug">
                        <span className="font-bold text-gray-900">{activity.user}</span> {activity.action} <span className="font-bold text-[#1A73E8]">{activity.target}</span>
                      </p>
                      <span className="text-[10px] text-gray-400 mt-0.5">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed rounded-lg bg-gray-50/50">
                 <p className="text-[12px] text-gray-400 font-medium">No activity recorded yet</p>
              </div>
            )}
          </Card>

          {/* CARD: Welcome / Guide Banner */}
          <Card className="p-5 bg-gradient-to-br from-[#1A73E8] to-[#1557B0] text-white border-0">
            <h3 className="font-bold text-[16px] mb-2">Welcome to TaskSphere!</h3>
            <p className="text-[12px] opacity-90 leading-relaxed mb-4">
              We've cleared sample data so you can start building your own workspace.
            </p>
            <Link href="/projects">
               <Button className="w-full bg-white text-[#1A73E8] hover:bg-gray-100 font-bold text-[12px] h-9">
                 Explore Now
               </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <CreateProjectModal 
        isOpen={showCreate} 
        onClose={() => setShowCreate(false)} 
        onSubmit={handleCreate} 
      />
    </div>
  );
}
