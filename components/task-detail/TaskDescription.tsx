"use client"

import React, { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Bold, Italic, List, ListOrdered, Code } from "lucide-react"
import { TaskService } from "@/app/services/TaskService"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { invalidateTaskCollections } from "@/lib/task-query-sync"
import type { TaskDetailResponse } from "@/app/types/task.schema"

interface TaskDescriptionProps {
    task: TaskDetailResponse
    projectId: string
    canEdit: boolean
}

// ── Toolbar ───────────────────────────────────────────────

function Toolbar({ editor }: { editor: any }) {
    if (!editor) return null
    return (
        <div className="flex items-center gap-0.5 border-b px-2 py-1">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(
                    "p-1.5 rounded text-sm hover:bg-accent",
                    editor.isActive("bold") && "bg-accent"
                )}
                aria-label="Bold"
            >
                <Bold size={14} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(
                    "p-1.5 rounded text-sm hover:bg-accent",
                    editor.isActive("italic") && "bg-accent"
                )}
                aria-label="Italic"
            >
                <Italic size={14} />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn(
                    "p-1.5 rounded text-sm hover:bg-accent",
                    editor.isActive("bulletList") && "bg-accent"
                )}
                aria-label="Bullet list"
            >
                <List size={14} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn(
                    "p-1.5 rounded text-sm hover:bg-accent",
                    editor.isActive("orderedList") && "bg-accent"
                )}
                aria-label="Ordered list"
            >
                <ListOrdered size={14} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={cn(
                    "p-1.5 rounded text-sm hover:bg-accent",
                    editor.isActive("code") && "bg-accent"
                )}
                aria-label="Inline code"
            >
                <Code size={14} />
            </button>
        </div>
    )
}

// ── Main component ────────────────────────────────────────

export default function TaskDescription({ task, projectId, canEdit }: TaskDescriptionProps) {
    const [editing, setEditing] = useState(false)
    const qc = useQueryClient()

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: "Add a description for this task..." }),
        ],
        content: task.description ?? "",
        editorProps: {
            attributes: {
                class: "prose prose-sm dark:prose-invert max-w-none min-h-20 focus:outline-none px-3 py-2",
            },
        },
        editable: editing && canEdit,
    })

    // Sync content when editing starts
    const handleStartEdit = useCallback(() => {
        if (!canEdit) return
        editor?.commands.setContent(task.description ?? "")
        editor?.setEditable(true)
        setEditing(true)
        setTimeout(() => editor?.commands.focus("end"), 50)
    }, [editor, task.description, canEdit])

    const handleCancel = () => {
        editor?.setEditable(false)
        editor?.commands.setContent(task.description ?? "")
        setEditing(false)
    }

    const saveDescription = useMutation({
        mutationFn: (description: string) =>
            TaskService.updateTask(projectId, task.id, {
                title: task.title,
                description,
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["task", projectId, task.id] })
            qc.invalidateQueries({ queryKey: ["activity", projectId, task.id] })
            invalidateTaskCollections(qc, projectId)
            editor?.setEditable(false)
            setEditing(false)
            toast.success("Đã lưu")
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Unable to save description")
        },
    })

    const handleSave = () => {
        const html = editor?.getHTML() ?? ""
        saveDescription.mutate(html)
    }

    return (
        <div
            className={cn(
                "rounded-xl border transition-all overflow-hidden",
                editing
                    ? "border-blue-400 ring-2 ring-blue-500/15 bg-white shadow-sm"
                    : "border-slate-200 bg-slate-50",
                !editing && canEdit && "cursor-pointer hover:bg-slate-100"
            )}
            onClick={!editing ? handleStartEdit : undefined}
            role={!editing && canEdit ? "button" : undefined}
            tabIndex={!editing && canEdit ? 0 : undefined}
            onKeyDown={e => !editing && canEdit && e.key === "Enter" && handleStartEdit()}
            aria-label="Task description"
        >
            {editing && canEdit && <Toolbar editor={editor} />}

            <div className="min-h-[48px]">
                <EditorContent editor={editor} />
            </div>

            {editing && (
                <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/60">
                    <Button
                        variant="ghost"
                        className="h-7 px-3 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-200"
                        onClick={handleCancel}
                    >
                        Huỷ
                    </Button>
                    <Button
                        className="h-7 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-none"
                        onClick={handleSave}
                        disabled={saveDescription.isPending}
                    >
                        {saveDescription.isPending ? "Đang lưu..." : "Lưu"}
                    </Button>
                </div>
            )}
        </div>
    )
}
