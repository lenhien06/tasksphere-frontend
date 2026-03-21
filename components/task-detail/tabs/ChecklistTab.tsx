"use client"

import React, { useState } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    useChecklists,
    useAddChecklistItem,
    useUpdateChecklistItem,
    useDeleteChecklistItem,
    useReorderChecklist,
} from "@/hooks/useChecklists"
import type { ChecklistItemResponse } from "@/app/types/task.schema"
import { cn } from "@/lib/utils"
import {
    DndContext, closestCenter, PointerSensor,
    KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useQueryClient } from "@tanstack/react-query"

interface ChecklistTabProps {
    taskId: string
}

// ── Sortable item ────────────────────────────────────────

function SortableChecklistItem({
    item,
    taskId,
}: {
    item: ChecklistItemResponse
    taskId: string
}) {
    const [editing, setEditing] = useState(false)
    const [editTitle, setEditTitle] = useState(item.title)
    const updateItem = useUpdateChecklistItem(taskId)
    const deleteItem = useDeleteChecklistItem(taskId)

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const handleToggle = () => {
        updateItem.mutate({ itemId: item.id, data: { isDone: !item.isDone } })
    }

    const handleSaveTitle = () => {
        if (!editTitle.trim() || editTitle === item.title) {
            setEditing(false)
            setEditTitle(item.title)
            return
        }
        updateItem.mutate(
            { itemId: item.id, data: { title: editTitle } },
            { onSuccess: () => setEditing(false) }
        )
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 group py-1.5">
            <button
                {...attributes}
                {...listeners}
                className="text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
                aria-label="Drag to reorder"
            >
                <GripVertical size={14} />
            </button>
            <Checkbox
                checked={item.isDone}
                onCheckedChange={handleToggle}
                aria-label={`Complete: ${item.title}`}
                className="shrink-0"
            />
            {editing ? (
                <Input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={e => {
                        if (e.key === "Enter") handleSaveTitle()
                        if (e.key === "Escape") { setEditing(false); setEditTitle(item.title) }
                    }}
                    className="h-7 text-sm flex-1"
                    autoFocus
                />
            ) : (
                <span
                    className={cn(
                        "flex-1 text-sm cursor-pointer hover:text-primary truncate",
                        item.isDone && "line-through text-muted-foreground"
                    )}
                    onClick={() => setEditing(true)}
                    aria-label={`Edit: ${item.title}`}
                >
                    {item.title}
                </span>
            )}
            <button
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteItem.mutate(item.id)}
                aria-label="Delete item"
            >
                <Trash2 size={13} />
            </button>
        </div>
    )
}

// ── Main tab ─────────────────────────────────────────────

export default function ChecklistTab({ taskId }: ChecklistTabProps) {
    const { data, isLoading } = useChecklists(taskId)
    const addItem = useAddChecklistItem(taskId)
    const reorderItems = useReorderChecklist(taskId)
    const qc = useQueryClient()
    const [newTitle, setNewTitle] = useState("")
    const [showInput, setShowInput] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const items = data?.items ?? []
    const total = data?.total ?? 0
    const completed = data?.completed ?? 0
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0

    const handleAddItem = () => {
        if (!newTitle.trim()) return
        addItem.mutate(newTitle.trim(), {
            onSuccess: () => { setNewTitle(""); setShowInput(false) }
        })
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIdx = items.findIndex(i => i.id === active.id)
        const newIdx = items.findIndex(i => i.id === over.id)
        const reordered = arrayMove(items, oldIdx, newIdx)
        qc.setQueryData(["checklist", taskId], (old: any) =>
            old ? { ...old, items: reordered } : old
        )
        reorderItems.mutate(reordered.map(i => i.id))
    }

    if (isLoading) {
        return <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-muted" />
                    <div className="h-4 bg-muted rounded flex-1" />
                </div>
            ))}
        </div>
    }

    return (
        <div className="space-y-3">
            {/* Progress */}
            <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-gray-500 shrink-0">{completed}/{total}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%" }}
                    />
                </div>
                <span className="text-xs text-gray-500 w-10 text-right shrink-0">{percent}%</span>
            </div>

            {/* Items */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0.5">
                        {items.map(item => (
                            <SortableChecklistItem key={item.id} item={item} taskId={taskId} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Add item */}
            {showInput ? (
                <div className="flex items-center gap-2">
                    <Input
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="Checklist item name..."
                        className="h-8 text-sm flex-1"
                        autoFocus
                        onKeyDown={e => {
                            if (e.key === "Enter") handleAddItem()
                            if (e.key === "Escape") { setShowInput(false); setNewTitle("") }
                        }}
                    />
                    <Button size="sm" onClick={handleAddItem} disabled={!newTitle.trim() || addItem.isPending}>
                        Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowInput(false); setNewTitle("") }}>
                        Cancel
                    </Button>
                </div>
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground w-full justify-start"
                    onClick={() => setShowInput(true)}
                    aria-label="Add checklist item"
                >
                    <Plus size={14} className="mr-1" /> Add item
                </Button>
            )}
        </div>
    )
}
