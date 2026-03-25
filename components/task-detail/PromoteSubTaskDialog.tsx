"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { TaskDetailService } from "@/app/services/TaskDetailService"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { UserAvatar } from "@/components/common/UserAvatar"
import { ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { cn } from "@/lib/utils"
import type { UserSummary } from "@/app/types/task.schema"

export type PromoteSubTaskSource = {
    id: string
    title: string
    taskCode: string
    assignee: UserSummary | null
    dueDate: string | null
    subtaskCount: number
    description?: string | null
}

export type PromoteSubTaskDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    /** Task whose subtasks list should refresh (task cha trên trang chi tiết) */
    subtasksListParentId: string
    source: PromoteSubTaskSource | null
    /** Fallback assignee khi sub-task không có assignee (task cha gốc hoặc node cha trong cây) */
    assigneeFallback: UserSummary | null
}

function DescEditor({
    initialContent,
    onChange,
    disabled,
}: {
    initialContent: string
    onChange: (v: string) => void
    disabled: boolean
}) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: "Bổ sung mô tả cho task độc lập..." }),
        ],
        content: initialContent,
        editable: !disabled,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: {
                class: cn(
                    "prose prose-sm dark:prose-invert max-w-none min-h-[100px] focus:outline-none px-3 py-2 rounded-md border border-input bg-background text-sm"
                ),
            },
        },
    })

    useEffect(() => {
        if (!editor) return
        editor.setEditable(!disabled)
    }, [editor, disabled])

    if (!editor) return null
    return <EditorContent editor={editor} />
}

export default function PromoteSubTaskDialog({
    open,
    onOpenChange,
    projectId,
    subtasksListParentId,
    source,
    assigneeFallback,
}: PromoteSubTaskDialogProps) {
    const qc = useQueryClient()
    const router = useRouter()
    const [title, setTitle] = useState("")
    const [assigneeId, setAssigneeId] = useState<string | null>(null)
    const [dueYmd, setDueYmd] = useState("")
    const [descHtml, setDescHtml] = useState("")

    const { data: members = [] } = useQuery({
        queryKey: ["project-members", projectId],
        queryFn: () => ProjectMemberService.getMembers(projectId),
        staleTime: 60_000,
        enabled: open && !!projectId,
    })

    const memberList = useMemo(
        () =>
            (members as any[]).map((m) => ({
                id: String(m.user?.id || m.id),
                fullName: m.user?.fullName || m.fullName || "Unknown",
                avatarUrl: m.user?.avatarUrl || m.avatarUrl || null,
            })),
        [members]
    )

    const selectedMember = memberList.find((m) => m.id === assigneeId)

    useEffect(() => {
        if (!open || !source) return
        setTitle(source.title)
        const defAssignee = source.assignee?.id ?? assigneeFallback?.id ?? null
        setAssigneeId(defAssignee ? String(defAssignee) : null)
        setDueYmd(source.dueDate ? source.dueDate.slice(0, 10) : "")
        setDescHtml(source.description ?? "")
    }, [open, source])

    const promote = useMutation({
        mutationFn: () => {
            if (!source) throw new Error("No task")
            const t = title.trim()
            if (!t) throw new Error("Tiêu đề không được để trống")
            return TaskDetailService.promoteSubtask(source.id, {
                title: t,
                assigneeId: assigneeId ? assigneeId : null,
                dueDate: dueYmd || null,
                description: descHtml || null,
            })
        },
        onSuccess: (data: any) => {
            const newId = data?.id as string
            toast.success("Đã chuyển thành task độc lập")
            qc.invalidateQueries({ queryKey: ["subtasks", subtasksListParentId] })
            qc.invalidateQueries({ queryKey: ["task", projectId, subtasksListParentId] })
            qc.invalidateQueries({ queryKey: ["tasks", projectId] })
            qc.invalidateQueries({ queryKey: ["backlog", projectId] })
            onOpenChange(false)
            if (newId) {
                router.push(`/projects/${projectId}/tasks/${newId}`)
            }
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? err?.message ?? "Không thể nâng cấp sub-task")
        },
    })

    const canSubmit = !!source && title.trim().length > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nâng cấp thành Task</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-1 text-sm text-muted-foreground">
                            <p>
                                Sub-task{" "}
                                <span className="font-medium text-foreground">
                                    &ldquo;{source?.title}&rdquo;
                                </span>{" "}
                                ({source?.taskCode}) sẽ trở thành task độc lập trên board.
                            </p>
                            {(source?.subtaskCount ?? 0) > 0 && (
                                <p className="text-amber-600 text-xs font-medium">
                                    Các sub-task con vẫn thuộc task sau khi nâng cấp.
                                </p>
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="promote-title">Tiêu đề</Label>
                        <Input
                            id="promote-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Tiêu đề task"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Người được giao</Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between font-normal"
                                    type="button"
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        {selectedMember ? (
                                            <>
                                                <UserAvatar
                                                    src={selectedMember.avatarUrl ?? undefined}
                                                    name={selectedMember.fullName}
                                                    size={20}
                                                />
                                                {selectedMember.fullName}
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">Chưa gán</span>
                                        )}
                                    </span>
                                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-64 overflow-y-auto">
                                <DropdownMenuItem onClick={() => setAssigneeId(null)}>
                                    Chưa gán
                                </DropdownMenuItem>
                                {memberList.map((m) => (
                                    <DropdownMenuItem key={m.id} onClick={() => setAssigneeId(m.id)}>
                                        <UserAvatar
                                            src={m.avatarUrl ?? undefined}
                                            name={m.fullName}
                                            size={20}
                                            className="mr-2"
                                        />
                                        {m.fullName}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="promote-due">Hạn chót</Label>
                        <Input
                            id="promote-due"
                            type="date"
                            value={dueYmd}
                            onChange={(e) => setDueYmd(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Mô tả</Label>
                        {open && source && (
                            <DescEditor
                                key={source.id}
                                initialContent={source.description ?? ""}
                                onChange={setDescHtml}
                                disabled={promote.isPending}
                            />
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" size="sm" type="button" onClick={() => onOpenChange(false)}>
                        Huỷ
                    </Button>
                    <Button
                        size="sm"
                        type="button"
                        disabled={!canSubmit || promote.isPending}
                        onClick={() => promote.mutate()}
                    >
                        {promote.isPending ? "Đang xử lý..." : "Xác nhận nâng cấp"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
