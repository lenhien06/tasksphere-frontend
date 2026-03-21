"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Rocket, Calendar as CalendarIcon, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { TaskService } from "@/app/services/TaskService"
import type { ProjectVersion, VersionStatus, CreateVersionRequest } from "@/app/types/task.schema"

// ── VersionStatusBadge ─────────────────────────────────────

const VersionStatusBadge = ({ status }: { status: VersionStatus }) => {
    const { t } = useTranslation()
    const map: Record<VersionStatus, { label: string; className: string }> = {
        PLANNING:    { label: t('version.status_PLANNING'),    className: "bg-gray-100 text-gray-600 border-gray-200" },
        IN_PROGRESS: { label: t('version.status_IN_PROGRESS'), className: "bg-blue-100 text-blue-600 border-blue-200" },
        RELEASED:    { label: `✓ ${t('version.status_RELEASED')}`,  className: "bg-green-100 text-green-600 border-green-200" },
    }
    const cfg = map[status]
    return (
        <Badge variant="outline" className={cn("text-[11px] font-semibold", cfg.className)}>
            {cfg.label}
        </Badge>
    )
}

// ── VersionCard ────────────────────────────────────────────

const VersionCard = ({
    version, isPM, onEdit, onRelease, onDelete,
}: {
    version:   ProjectVersion
    isPM:      boolean
    onEdit:    (v: ProjectVersion) => void
    onRelease: (v: ProjectVersion) => void
    onDelete:  (v: ProjectVersion) => void
}) => {
    const { t } = useTranslation()
    const barColor =
        version.status === "RELEASED"    ? "bg-green-500" :
        version.status === "IN_PROGRESS" ? "bg-blue-500"  : "bg-gray-300"

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-gray-900 text-sm">{version.name}</span>
                    <VersionStatusBadge status={version.status} />
                </div>
                {isPM && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {version.status !== "RELEASED" && (
                                <DropdownMenuItem onClick={() => onEdit(version)}>
                                    <Pencil className="w-3.5 h-3.5 mr-2" /> {t('common.edit')}
                                </DropdownMenuItem>
                            )}
                            {version.status !== "RELEASED" && (
                                <DropdownMenuItem onClick={() => onRelease(version)}>
                                    <Rocket className="w-3.5 h-3.5 mr-2 text-green-500" /> {t('version.release')}
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                className={cn("text-red-600 focus:text-red-600", version.status === "RELEASED" && "opacity-40 cursor-not-allowed")}
                                onClick={() => version.status !== "RELEASED" && onDelete(version)}
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> {t('common.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {version.description && (
                <p className="text-sm text-gray-500 mb-2 line-clamp-2">{version.description}</p>
            )}

            {version.releaseDate && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <CalendarIcon className="w-3 h-3" />
                    <span>{new Date(version.releaseDate).toLocaleDateString("en-US")}</span>
                </div>
            )}

            <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                    <span>{version.doneCount}/{version.taskCount} {t('nav.tasks').toLowerCase()}</span>
                    <span className="font-semibold">{version.completionRate}%</span>
                </div>
                <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all", barColor)}
                        style={{ width: `${version.completionRate}%` }}
                    />
                </div>
            </div>
        </div>
    )
}

// ── CreateEditModal ────────────────────────────────────────

interface VersionFormData {
    name:        string
    description: string
    releaseDate: string
}

const CreateEditModal = ({
    open, onClose, projectId, editVersion,
}: {
    open:         boolean
    onClose:      () => void
    projectId:    string
    editVersion?: ProjectVersion | null
}) => {
    const { t } = useTranslation()
    const qc = useQueryClient()
    const [form, setForm] = useState<VersionFormData>({
        name:        editVersion?.name        ?? "",
        description: editVersion?.description ?? "",
        releaseDate: editVersion?.releaseDate ?? "",
    })
    const [nameError, setNameError] = useState("")

    React.useEffect(() => {
        if (open) {
            setForm({
                name:        editVersion?.name        ?? "",
                description: editVersion?.description ?? "",
                releaseDate: editVersion?.releaseDate ?? "",
            })
            setNameError("")
        }
    }, [open, editVersion])

    const createMut = useMutation({
        mutationFn: (data: CreateVersionRequest) => TaskService.createVersion(projectId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["versions", projectId] })
            toast.success("Version created")
            onClose()
        },
        onError: () => toast.error("Unable to create version"),
    })

    const updateMut = useMutation({
        mutationFn: (data: Partial<CreateVersionRequest>) =>
            TaskService.updateVersion(editVersion!.id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["versions", projectId] })
            toast.success("Version updated")
            onClose()
        },
        onError: () => toast.error("Unable to update version"),
    })

    const handleSubmit = () => {
        if (!form.name.trim()) { setNameError(t('version.nameRequired')); return }
        setNameError("")
        const payload: CreateVersionRequest = { name: form.name.trim() }
        if (form.description.trim()) payload.description = form.description.trim()
        if (form.releaseDate)        payload.releaseDate  = form.releaseDate
        if (editVersion) updateMut.mutate(payload)
        else             createMut.mutate(payload)
    }

    const isPending = createMut.isPending || updateMut.isPending

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="w-[440px] max-w-[95vw]">
                <DialogHeader>
                    <DialogTitle>{editVersion ? t('version.edit') : t('version.create')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>{t('version.name')} <span className="text-red-500">*</span></Label>
                        <Input
                            placeholder="v1.0.0"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className={nameError ? "border-red-400" : ""}
                        />
                        {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t('task.description')} <span className="text-gray-400 text-xs">({t('common.optional').toLowerCase()})</span></Label>
                        <Textarea
                            placeholder={t('version.descPlaceholder')}
                            rows={3}
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t('version.releaseDate')} <span className="text-gray-400 text-xs">({t('common.optional').toLowerCase()})</span></Label>
                        <Input
                            type="date"
                            value={form.releaseDate}
                            onChange={e => setForm(f => ({ ...f, releaseDate: e.target.value }))}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isPending}>{t('common.cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {editVersion ? t('project.saveChanges') : t('version.create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── ReleaseConfirmModal ────────────────────────────────────

const ReleaseConfirmModal = ({
    open, onClose, version, projectId,
}: {
    open:      boolean
    onClose:   () => void
    version:   ProjectVersion | null
    projectId: string
}) => {
    const { t } = useTranslation()
    const qc = useQueryClient()
    const mut = useMutation({
        mutationFn: () => TaskService.updateVersion(version!.id, { status: "RELEASED" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["versions", projectId] })
            toast.success(`🚀 ${version!.name} has been released!`)
            onClose()
        },
        onError: () => toast.error("Unable to release version"),
    })

    if (!version) return null

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="w-[400px] max-w-[95vw]">
                <DialogHeader>
                    <DialogTitle>{t('version.releaseTitle', { name: version.name })}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-gray-600 py-2">
                    {t('version.releaseDesc')}
                </p>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={mut.isPending}>{t('common.cancel')}</Button>
                    <Button
                        onClick={() => mut.mutate()}
                        disabled={mut.isPending}
                        className="bg-green-500 hover:bg-green-600 text-white"
                    >
                        <Rocket className="w-3.5 h-3.5 mr-1.5" /> {t('version.release')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── DeleteConfirmModal ────────────────────────────────────

const DeleteConfirmModal = ({
    open, onClose, version, projectId,
}: {
    open:      boolean
    onClose:   () => void
    version:   ProjectVersion | null
    projectId: string
}) => {
    const { t } = useTranslation()
    const qc = useQueryClient()
    const mut = useMutation({
        mutationFn: () => TaskService.deleteVersion(version!.id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["versions", projectId] })
            toast.success(`${version!.name} deleted`)
            onClose()
        },
        onError: () => toast.error("Unable to delete version"),
    })

    if (!version) return null

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="w-[380px] max-w-[95vw]">
                <DialogHeader>
                    <DialogTitle>{t('version.deleteTitle', { name: version.name })}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-gray-600 py-2">{t('version.cannotUndo')}</p>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={mut.isPending}>{t('common.cancel')}</Button>
                    <Button variant="destructive" onClick={() => mut.mutate()} disabled={mut.isPending}>
                        {t('version.deleteVersion')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── Main VersionManagement ────────────────────────────────

interface VersionManagementProps {
    projectId: string
    myRole:    string
}

export default function VersionManagement({ projectId, myRole }: VersionManagementProps) {
    const { t } = useTranslation()
    const isPM = myRole === "PM"
    const [showCreate, setShowCreate]     = useState(false)
    const [editVersion, setEditVersion]   = useState<ProjectVersion | null>(null)
    const [releaseVer, setReleaseVer]     = useState<ProjectVersion | null>(null)
    const [deleteVer, setDeleteVer]       = useState<ProjectVersion | null>(null)

    const { data: versions = [], isLoading } = useQuery({
        queryKey: ["versions", projectId],
        queryFn:  () => TaskService.getVersions(projectId),
        enabled:  !!projectId,
    })

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">{t('version.management')}</h2>
                {isPM && (
                    <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                        onClick={() => setShowCreate(true)}
                    >
                        <Plus className="w-4 h-4" /> {t('version.create')}
                    </Button>
                )}
            </div>

            {versions.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                    {t('version.noVersions')}
                </div>
            ) : (
                <div className="space-y-3">
                    {versions.map(v => (
                        <VersionCard
                            key={v.id}
                            version={v}
                            isPM={isPM}
                            onEdit={setEditVersion}
                            onRelease={setReleaseVer}
                            onDelete={setDeleteVer}
                        />
                    ))}
                </div>
            )}

            <CreateEditModal
                open={showCreate || !!editVersion}
                onClose={() => { setShowCreate(false); setEditVersion(null) }}
                projectId={projectId}
                editVersion={editVersion}
            />
            <ReleaseConfirmModal
                open={!!releaseVer}
                onClose={() => setReleaseVer(null)}
                version={releaseVer}
                projectId={projectId}
            />
            <DeleteConfirmModal
                open={!!deleteVer}
                onClose={() => setDeleteVer(null)}
                version={deleteVer}
                projectId={projectId}
            />
        </div>
    )
}
