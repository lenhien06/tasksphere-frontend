"use client"

import React, { useState, useEffect } from "react"
import { RefreshCw, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TaskService } from "@/app/services/TaskService"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { TaskRecurrence, RecurrenceFrequency, SetRecurrenceRequest } from "@/app/types/task.schema"
import { cn } from "@/lib/utils"

interface RecurringSectionProps {
    taskId: string
    projectId: string
    isRecurring: boolean
    canEdit?: boolean
}

const DAYS_OF_WEEK = [
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
    { label: "Sun", value: 7 },
]

const FREQ_LABELS: Record<RecurrenceFrequency, string> = {
    DAILY: "Daily",
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    CUSTOM: "Custom",
}

function summaryText(rec: TaskRecurrence): string {
    const freq = FREQ_LABELS[rec.frequency]
    if (rec.frequency === "WEEKLY" && rec.frequencyConfig?.daysOfWeek) {
        const days = (rec.frequencyConfig.daysOfWeek as number[])
            .map(d => DAYS_OF_WEEK.find(x => x.value === d)?.label ?? d)
            .join(", ")
        return `${freq} on ${days}`
    }
    return freq
}

export default function RecurringSection({ taskId, projectId, isRecurring, canEdit = true }: RecurringSectionProps) {
    const qc = useQueryClient()
    const [open, setOpen] = useState(false)

    const [enabled, setEnabled] = useState(false)
    const [frequency, setFrequency] = useState<RecurrenceFrequency>("WEEKLY")
    const [selectedDays, setSelectedDays] = useState<number[]>([])
    const [endDate, setEndDate] = useState("")
    const [maxOcc, setMaxOcc] = useState("")

    const { data: recurrence } = useQuery({
        queryKey: ["recurrence", taskId],
        queryFn: () => TaskService.getRecurrence(taskId),
        enabled: !!taskId,
        staleTime: 60_000,
    })

    useEffect(() => {
        if (recurrence) {
            setEnabled(true)
            setFrequency(recurrence.frequency)
            setSelectedDays((recurrence.frequencyConfig?.daysOfWeek as number[]) ?? [])
            setEndDate(recurrence.endDate ?? "")
            setMaxOcc(recurrence.maxOccurrences != null ? String(recurrence.maxOccurrences) : "")
        } else {
            setEnabled(false)
        }
    }, [recurrence])

    const setRec = useMutation({
        mutationFn: (data: SetRecurrenceRequest) =>
            recurrence
                ? TaskService.updateRecurrence(taskId, data)
                : TaskService.setRecurrence(taskId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["recurrence", taskId] })
            qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
            toast.success("Recurrence settings saved")
            setOpen(false)
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message
                ?? err?.response?.data?.meta?.message
                ?? err?.response?.data?.detail
                ?? err?.message
                ?? "Unable to save settings"
            toast.error(msg)
        },
    })

    const deleteRec = useMutation({
        mutationFn: () => TaskService.deleteRecurrence(taskId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["recurrence", taskId] })
            qc.invalidateQueries({ queryKey: ["task", projectId, taskId] })
            toast.success("Recurrence disabled")
            setEnabled(false)
            setOpen(false)
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? "Unable to disable recurrence"),
    })

    const handleToggleDay = (d: number) => {
        setSelectedDays(prev =>
            prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
        )
    }

    const handleSave = () => {
        if (!enabled) {
            deleteRec.mutate()
            return
        }
        const today = new Date().toISOString().slice(0, 10)
        if (endDate && endDate <= today) {
            toast.error("End date must be after today")
            return
        }
        if (frequency === "WEEKLY" && selectedDays.length === 0) {
            toast.error("Select at least 1 day of the week")
            return
        }

        const base = {
            frequency,
            daysOfWeek: frequency === "WEEKLY" ? selectedDays : undefined,
            endDate: endDate || undefined,
            maxOccurrences: maxOcc ? parseInt(maxOcc) : undefined,
        }

        // PUT (update) does not send firstRunAt; POST (create) requires it
        if (recurrence) {
            setRec.mutate(base as SetRecurrenceRequest)
        } else {
            setRec.mutate({ ...base, firstRunAt: new Date().toISOString() })
        }
    }

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                    <RefreshCw size={14} /> Recurrence
                    {isRecurring && recurrence && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                            ({summaryText(recurrence)})
                        </span>
                    )}
                </span>
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => setOpen(true)}
                    aria-label="Recurrence settings"
                    disabled={!canEdit}
                >
                    {isRecurring ? "Edit" : "+ Set recurrence"}
                </Button>
            </div>

            {/* Slide-over config panel */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right" className="w-80 sm:w-96">
                    <SheetHeader>
                        <SheetTitle>Recurrence Settings</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-5 mt-6">
                        {/* Toggle */}
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Enable recurrence</Label>
                            <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Toggle recurrence" />
                        </div>

                        {enabled && (
                            <>
                                {/* Frequency */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Frequency</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full justify-between">
                                                {FREQ_LABELS[frequency]} <ChevronDown size={12} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-full">
                                            {(Object.keys(FREQ_LABELS) as RecurrenceFrequency[]).map(f => (
                                                <DropdownMenuItem key={f} onClick={() => setFrequency(f)}>
                                                    {FREQ_LABELS[f]}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Days of week (WEEKLY only) */}
                                {frequency === "WEEKLY" && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Days of week</Label>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {DAYS_OF_WEEK.map(d => (
                                                <button
                                                    key={d.value}
                                                    type="button"
                                                    onClick={() => handleToggleDay(d.value)}
                                                    className={cn(
                                                        "w-9 h-9 rounded-full text-xs font-medium border transition-colors",
                                                        selectedDays.includes(d.value)
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "border-border hover:bg-accent"
                                                    )}
                                                    aria-label={`Day ${d.label}`}
                                                    aria-pressed={selectedDays.includes(d.value)}
                                                >
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* End date */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">End date (optional)</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        min={new Date().toISOString().slice(0, 10)}
                                        className="h-8 text-sm"
                                    />
                                </div>

                                {/* Max occurrences */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max occurrences (optional)</Label>
                                    <Input
                                        type="number"
                                        value={maxOcc}
                                        onChange={e => setMaxOcc(e.target.value)}
                                        min={1}
                                        placeholder="Unlimited"
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={setRec.isPending || deleteRec.isPending}
                                className="flex-1"
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
