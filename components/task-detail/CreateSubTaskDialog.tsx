"use client"

import React from "react"
import { Loader2, Sparkles, UserCircle, X } from "lucide-react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { UserAvatar } from "@/components/common/UserAvatar"
import { useAddSubTask } from "@/hooks/useSubTasks"
import { cn } from "@/lib/utils"
import type { CreateTaskRequest, UserSummary } from "@/app/types/task.schema"

type CreateSubTaskDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    parentTaskId: string | null
    parentTitle?: string | null
    assigneeFallback?: UserSummary | null
}

type MemberOption = {
    id: string
    fullName: string
    avatarUrl: string | null
    skillTags: string[]
}

const MAX_REQUIRED_SKILLS = 8

function normalizeSkillTag(value: string) {
    return value.trim().replace(/\s+/g, " ")
}

function getMemberOptions(
    members: Array<{
        user?: { id?: string; fullName?: string; avatarUrl?: string | null; skillTags?: string[]; skills?: string[] }
        id?: string
        fullName?: string
        avatarUrl?: string | null
        skillTags?: string[]
        skills?: string[]
    }>
): MemberOption[] {
    return members
        .map((member) => ({
            id: String(member.user?.id ?? member.id ?? ""),
            fullName: member.user?.fullName ?? member.fullName ?? "Unknown",
            avatarUrl: member.user?.avatarUrl ?? member.avatarUrl ?? null,
            skillTags: [
                ...(member.skillTags ?? []),
                ...(member.skills ?? []),
                ...(member.user?.skillTags ?? []),
                ...(member.user?.skills ?? []),
            ]
                .map(normalizeSkillTag)
                .filter(Boolean),
        }))
        .filter((member) => member.id)
}

function getSuggestedSkills(members: MemberOption[]) {
    return Array.from(
        new Set(
            members
                .flatMap((member) => member.skillTags)
                .map(normalizeSkillTag)
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b))
}

export default function CreateSubTaskDialog({
    open,
    onOpenChange,
    projectId,
    parentTaskId,
    parentTitle,
    assigneeFallback,
}: CreateSubTaskDialogProps) {
    const addSubTask = useAddSubTask(projectId, parentTaskId ?? "")
    const [title, setTitle] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [assigneeId, setAssigneeId] = React.useState("")
    const [requiredSkillInput, setRequiredSkillInput] = React.useState("")
    const [requiredSkills, setRequiredSkills] = React.useState<string[]>([])
    const [createAnother, setCreateAnother] = React.useState(false)

    const { data: members = [], isLoading: membersLoading } = useQuery({
        queryKey: ["project-members", projectId],
        queryFn: () => ProjectMemberService.getMembers(projectId),
        staleTime: 60_000,
        enabled: open && !!projectId,
    })

    const memberOptions = React.useMemo(() => getMemberOptions(members), [members])
    const selectedMember = React.useMemo(
        () => memberOptions.find((member) => member.id === assigneeId),
        [memberOptions, assigneeId]
    )
    const suggestedSkills = React.useMemo(() => getSuggestedSkills(memberOptions), [memberOptions])
    const suggestedAssignee = React.useMemo(() => {
        if (requiredSkills.length === 0) return null
        return memberOptions
            .map((member) => {
                const memberSkills = member.skillTags.map((skill) => skill.toLowerCase())
                const matchedSkills = requiredSkills.filter((skill) => memberSkills.includes(skill.toLowerCase()))
                return matchedSkills.length > 0 ? { member, matchedSkills } : null
            })
            .filter((item): item is { member: MemberOption; matchedSkills: string[] } => item !== null)
            .sort((a, b) => b.matchedSkills.length - a.matchedSkills.length)[0] ?? null
    }, [memberOptions, requiredSkills])
    const titleCounterClass = React.useMemo(() => {
        if (title.length > 245) return "text-red-500"
        if (title.length > 230) return "text-amber-500"
        return "text-gray-400"
    }, [title.length])

    const resetForm = React.useCallback(() => {
        setTitle("")
        setDescription("")
        setAssigneeId(assigneeFallback?.id ? String(assigneeFallback.id) : "")
        setRequiredSkillInput("")
        setRequiredSkills([])
    }, [assigneeFallback?.id])

    React.useEffect(() => {
        if (!open) return
        resetForm()
    }, [open, resetForm])

    const addRequiredSkill = React.useCallback((rawValue: string) => {
        const normalized = normalizeSkillTag(rawValue)
        if (!normalized) return
        if (requiredSkills.some((skill) => skill.toLowerCase() === normalized.toLowerCase())) return
        if (requiredSkills.length >= MAX_REQUIRED_SKILLS) {
            toast.error("Toi da 8 ky nang cho moi sub-task")
            return
        }
        setRequiredSkills((current) => [...current, normalized])
        setRequiredSkillInput("")
    }, [requiredSkills])

    const handleSubmit = () => {
        if (!parentTaskId || !title.trim() || addSubTask.isPending) return

        if (title.length > 255) {
            toast.error("Ten sub-task toi da 255 ky tu")
            return
        }

        const payload: CreateTaskRequest = {
            title: title.trim(),
            description: description.trim() || undefined,
            type: "SUB_TASK",
            assigneeId: assigneeId || undefined,
            skillTagsRequired: requiredSkills.length > 0 ? requiredSkills : undefined,
        }

        addSubTask.mutate(payload, {
            onSuccess: () => {
                if (createAnother) {
                    resetForm()
                    return
                }
                onOpenChange(false)
            },
        })
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onOpenChange(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            />

            <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                className="relative flex w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-6 pb-4 pt-5">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-gray-900">Tạo Sub-task</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Form rút gọn theo Scrum: sub-task sẽ tự kế thừa project, sprint và due date từ task cha.
                        </p>
                    </div>
                    <span className="rounded-md bg-sky-50 px-2 py-0.5 font-mono text-sm text-sky-700">SUB</span>
                </div>

                <div className="custom-scrollbar max-h-[75vh] space-y-4 overflow-y-auto px-6 py-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Task cha
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                            {parentTitle || "Sub-task này sẽ được gắn vào task hiện tại"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">Type: Sub-task</span>
                            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">Story Points: 0</span>
                            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">Sprint: kế thừa từ task cha</span>
                            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">Due date: kế thừa từ task cha</span>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 flex gap-1 text-sm font-semibold text-gray-800">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            autoFocus
                            maxLength={255}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ví dụ: Thiết kế giao diện Login"
                            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-[15px] outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                        <div className={cn("mt-0.5 text-right text-[10px]", titleCounterClass)}>
                            {title.length}/255
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-800">Description</label>
                        <textarea
                            rows={3}
                            maxLength={2000}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mô tả ngắn gọn phạm vi công việc con này..."
                            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-[15px] outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <div className="mb-1 flex items-center justify-between">
                            <label className="text-sm font-semibold text-gray-800">Required Skills</label>
                            <span className="text-[11px] text-gray-400">Optional</span>
                        </div>
                        <div className="rounded-xl border border-gray-200 px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                                {requiredSkills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                                    >
                                        {skill}
                                        <button
                                            type="button"
                                            onClick={() => setRequiredSkills((current) => current.filter((item) => item !== skill))}
                                            className="text-slate-400 hover:text-slate-700"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    value={requiredSkillInput}
                                    onChange={(e) => setRequiredSkillInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === ",") {
                                            e.preventDefault()
                                            addRequiredSkill(requiredSkillInput)
                                        }
                                    }}
                                    onBlur={() => {
                                        if (requiredSkillInput.trim()) addRequiredSkill(requiredSkillInput)
                                    }}
                                    placeholder="Nhap ky nang va nhan Enter"
                                    className="min-w-[180px] flex-1 border-none p-0 text-sm outline-none placeholder:text-gray-400"
                                />
                            </div>
                        </div>
                        {suggestedSkills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {suggestedSkills.slice(0, 10).map((skill) => (
                                    <button
                                        key={skill}
                                        type="button"
                                        onClick={() => addRequiredSkill(skill)}
                                        className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-500"
                                    >
                                        {skill}
                                    </button>
                                ))}
                            </div>
                        )}
                        <p className="mt-1.5 text-[11px] text-gray-400">
                            Trường này chỉ dùng để gợi ý assignee khi đang tạo sub-task, không cần hiển thị lại ở màn hình chi tiết.
                        </p>
                    </div>

                    {suggestedAssignee && (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                                        <Sparkles size={16} />
                                        Gợi ý assignee theo kỹ năng
                                    </div>
                                    <p className="mt-1 text-sm text-emerald-800">
                                        {suggestedAssignee.member.fullName} phù hợp với: {suggestedAssignee.matchedSkills.join(", ")}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setAssigneeId(suggestedAssignee.member.id)}
                                    className="border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100"
                                >
                                    Chọn
                                </Button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-800">Assignee</label>
                        <div className="relative">
                            <select
                                value={assigneeId}
                                onChange={(e) => setAssigneeId(e.target.value)}
                                className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm transition-all hover:border-gray-300"
                                disabled={membersLoading}
                            >
                                <option value="">Chưa phân công</option>
                                {memberOptions.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.fullName}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute left-2.5 top-2.5 h-5 w-5 overflow-hidden rounded-full">
                                {assigneeId
                                    ? <UserAvatar name={selectedMember?.fullName || ""} src={selectedMember?.avatarUrl ?? undefined} size={20} />
                                    : <UserCircle size={20} className="text-gray-400" />
                                }
                            </div>
                            <div className="pointer-events-none absolute right-3 top-3.5 h-0 w-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-gray-400" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t bg-gray-50/50 px-6 py-4">
                    <label className="flex cursor-pointer items-center gap-2 select-none">
                        <input
                            type="checkbox"
                            checked={createAnother}
                            onChange={() => setCreateAnother((prev) => !prev)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-[14px] font-medium text-gray-700">Tạo thêm sub-task</span>
                    </label>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={addSubTask.isPending}
                            className="h-10 rounded-lg border-gray-200 px-6 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!title.trim() || addSubTask.isPending || membersLoading}
                            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-8 text-sm font-bold text-white shadow-md hover:bg-blue-600"
                        >
                            {addSubTask.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                            Tạo sub-task
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
