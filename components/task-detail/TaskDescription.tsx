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
            editor?.setEditable(false)
            setEditing(false)
            toast.success("Description saved")
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
        <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Description</p>

            <div
                className={cn(
                    "rounded-xl border border-slate-200 transition-all",
                    editing && "ring-4 ring-blue-500/10 border-blue-500 bg-white",
                    !editing && canEdit && "cursor-pointer hover:bg-slate-50/50 hover:border-slate-300"
                )}
                onClick={!editing ? handleStartEdit : undefined}
                title={!editing && canEdit ? "Click to edit description" : undefined}
                role={!editing && canEdit ? "button" : undefined}
                tabIndex={!editing && canEdit ? 0 : undefined}
                onKeyDown={e => !editing && canEdit && e.key === "Enter" && handleStartEdit()}
                aria-label="Task description"
            >
                {editing && canEdit && <Toolbar editor={editor} />}
                <div className="min-h-[120px]">
                    <EditorContent editor={editor} />
                    {!editing && !task.description && (
                        <p className="text-[14px] font-medium text-slate-400 px-4 py-3 italic">
                            Add a detailed description for this task...
                        </p>
                    )}
                </div>
            </div>

            {editing && (
                <div className="flex gap-2 justify-end">
                    <Button variant="ghost" className="h-10 px-5 rounded-xl font-bold text-slate-500 hover:bg-slate-50" onClick={handleCancel}>Cancel</Button>
                    <Button className="h-10 px-6 bg-[#111827] text-white rounded-xl font-extrabold uppercase tracking-wide shadow-lg active:scale-[0.98]" onClick={handleSave} disabled={saveDescription.isPending}>
                        {saveDescription.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            )}
        </div>
    )
}
