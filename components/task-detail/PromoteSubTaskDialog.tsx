"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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
    subtasksListParentId: string
    source: PromoteSubTaskSource | null
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
            Placeholder.configure({ placeholder: "Add a description for the standalone task..." }),
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
            (members as any[]).map((member) => ({
                id: String(member.user?.id || member.id),
                fullName: member.user?.fullName || member.fullName || "Unknown",
                avatarUrl: member.user?.avatarUrl || member.avatarUrl || null,
            })),
        [members]
    )

    const selectedMember = memberList.find((member) => member.id === assigneeId)

    useEffect(() => {
        if (!open || !source) return
        setTitle(source.title)
        const defaultAssignee = source.assignee?.id ?? assigneeFallback?.id ?? null
        setAssigneeId(defaultAssignee ? String(defaultAssignee) : null)
        setDueYmd(source.dueDate ? source.dueDate.slice(0, 10) : "")
        setDescHtml(source.description ?? "")
    }, [open, source, assigneeFallback?.id])

    const promote = useMutation({
        mutationFn: () => {
            if (!source) throw new Error("No task")
            const trimmedTitle = title.trim()
            if (!trimmedTitle) throw new Error("Title cannot be empty")
            return TaskDetailService.promoteSubtask(source.id, {
                title: trimmedTitle,
                assigneeId: assigneeId || undefined,
                dueDate: dueYmd || undefined,
                description: descHtml || undefined,
            })
        },
        onSuccess: (data: any) => {
            const newId = data?.id as string
            toast.success("Sub-task was promoted to a standalone task.")
            qc.invalidateQueries({ queryKey: ["subtasks", subtasksListParentId] })
            qc.invalidateQueries({ queryKey: ["task", projectId, subtasksListParentId] })
            qc.invalidateQueries({ queryKey: ["tasks", projectId], exact: false })
            qc.invalidateQueries({ queryKey: ["backlog", projectId], exact: false })
            onOpenChange(false)
            if (newId) {
                router.push(`/projects/${projectId}/tasks/${newId}`)
            }
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? err?.message ?? "Unable to promote sub-task")
        },
    })

    const canSubmit = !!source && title.trim().length > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Promote to Task</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-1 text-sm text-muted-foreground">
                            <p>
                                Sub-task{" "}
                                <span className="font-medium text-foreground">
                                    &ldquo;{source?.title}&rdquo;
                                </span>{" "}
                                ({source?.taskCode}) will become a standalone task on the board.
                            </p>
                            {(source?.subtaskCount ?? 0) > 0 && (
                                <p className="text-xs font-medium text-amber-600">
                                    Any child sub-tasks will remain attached after promotion.
                                </p>
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-2 space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="promote-title">Title</Label>
                        <Input
                            id="promote-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Task title"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Assignee</Label>
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
                                            <span className="text-muted-foreground">Unassigned</span>
                                        )}
                                    </span>
                                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-64 overflow-y-auto">
                                <DropdownMenuItem onClick={() => setAssigneeId(null)}>
                                    Unassigned
                                </DropdownMenuItem>
                                {memberList.map((member) => (
                                    <DropdownMenuItem key={member.id} onClick={() => setAssigneeId(member.id)}>
                                        <UserAvatar
                                            src={member.avatarUrl ?? undefined}
                                            name={member.fullName}
                                            size={20}
                                            className="mr-2"
                                        />
                                        {member.fullName}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="promote-due">Due date</Label>
                        <Input
                            id="promote-due"
                            type="date"
                            value={dueYmd}
                            onChange={(e) => setDueYmd(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Description</Label>
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

                <div className="mt-4 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" type="button" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        type="button"
                        disabled={!canSubmit || promote.isPending}
                        onClick={() => promote.mutate()}
                    >
                        {promote.isPending ? "Processing..." : "Confirm promotion"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
