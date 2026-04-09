"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { Plus, MoreHorizontal, Loader2, CheckCircle2, XCircle } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { WebhookItem, CreateWebhookRequest, WebhookTestResult } from "@/app/types/task.schema"

// ── Constants ─────────────────────────────────────────────────

const ALL_EVENTS = [
    { key: "task.created",     label: "🆕 task.created" },
    { key: "task.updated",     label: "✏ task.updated" },
    { key: "task.deleted",     label: "🗑 task.deleted" },
    { key: "comment.created",  label: "💬 comment.created" },
    { key: "sprint.started",   label: "🏃 sprint.started" },
    { key: "sprint.completed", label: "✓ sprint.completed" },
    { key: "member.joined",    label: "👋 member.joined" },
]

function timeAgo(dateStr: string | null, t: (key: string, opts?: any) => string): string {
    if (!dateStr) return t('webhook.neverTriggered')
    const diff  = Date.now() - new Date(dateStr).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins < 1)   return t('webhook.justNow')
    if (mins < 60)  return t('webhook.minutesAgo', { count: mins })
    if (hours < 24) return t('webhook.hoursAgo', { count: hours })
    return t('webhook.daysAgo', { count: days })
}

// ── Webhook Modal ─────────────────────────────────────────────

interface ModalProps {
    projectId: string
    existing?: WebhookItem
    onClose: () => void
}

function WebhookModal({ projectId, existing, onClose }: ModalProps) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const qKey = ["webhooks", projectId]

    const [name, setName]       = useState(existing?.name ?? "")
    const [url, setUrl]         = useState(existing?.url ?? "")
    const [events, setEvents]   = useState<string[]>(existing?.events ?? [])
    const [secret, setSecret]   = useState("")
    const [urlError, setUrlError] = useState("")
    const [testResult, setTestResult] = useState<WebhookTestResult | null>(null)
    const [testing, setTesting] = useState(false)

    const validateUrl = (v: string) => {
        if (v && !v.startsWith("https://")) {
            setUrlError(t('webhook.urlHttps'))
        } else {
            setUrlError("")
        }
    }

    const toggleEvent = (key: string) => {
        setEvents(prev =>
            prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]
        )
    }

    const createMutation = useMutation({
        mutationFn: (data: CreateWebhookRequest) =>
            TaskService.createWebhook(projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qKey })
            toast.success(t('webhook.created'))
            onClose()
        },
        onError: (err: any) => {
            const code = err?.response?.data?.meta?.code
            if (code === "WHK_001") toast.error(t('webhook.urlHttps'))
            else if (code === "WHK_002") toast.error(t('webhook.internalAddress'))
            else if (code === "WHK_003" || err?.response?.status === 422)
                toast.error(t('webhook.maxWebhooks'))
            else toast.error(t('webhook.createError'))
        },
    })

    const updateMutation = useMutation({
        mutationFn: (data: Partial<CreateWebhookRequest>) =>
            TaskService.updateWebhook(existing!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qKey })
            toast.success(t('webhook.updated'))
            onClose()
        },
        onError: () => toast.error(t('webhook.updateError')),
    })

    const handleSubmit = () => {
        if (!name.trim()) { toast.error(t('webhook.nameRequired')); return }
        if (!url.trim() || !url.startsWith("https://")) {
            setUrlError(t('webhook.urlHttps'))
            return
        }
        if (events.length === 0) { toast.error(t('webhook.selectEvent')); return }
        const payload: CreateWebhookRequest = {
            name: name.trim(),
            url: url.trim(),
            events,
            ...(secret ? { secretKey: secret } : {}),
        }
        if (existing) {
            updateMutation.mutate(payload)
        } else {
            createMutation.mutate(payload)
        }
    }

    const handleTest = async () => {
        if (!existing) return
        setTesting(true)
        setTestResult(null)
        try {
            const result = await TaskService.testWebhook(projectId, existing.id)
            setTestResult(result)
        } catch {
            setTestResult({ success: false, statusCode: null, responseTime: 0, message: t('webhook.connectionError') })
        } finally {
            setTesting(false)
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {existing ? t('webhook.edit') : t('webhook.add')}
                    </h2>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider font-medium block mb-1.5">
                            {t('webhook.name')} <span className="text-red-400">*</span>
                        </label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={t('webhook.namePlaceholder')}
                            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        />
                    </div>

                    {/* URL */}
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider font-medium block mb-1.5">
                            URL <span className="text-red-400">*</span>
                        </label>
                        <input
                            value={url}
                            onChange={e => { setUrl(e.target.value); validateUrl(e.target.value) }}
                            placeholder="https://hooks.slack.com/..."
                            className={cn(
                                "w-full h-10 px-3 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-blue-50 transition-colors",
                                urlError ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-blue-400"
                            )}
                        />
                        {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
                    </div>

                    {/* Events */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                                {t('webhook.events')} <span className="text-red-400">*</span>
                            </label>
                            <button
                                onClick={() =>
                                    events.length === ALL_EVENTS.length
                                        ? setEvents([])
                                        : setEvents(ALL_EVENTS.map(e => e.key))
                                }
                                className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                            >
                                {events.length === ALL_EVENTS.length ? t('webhook.deselectAll') : t('webhook.selectAll')}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {ALL_EVENTS.map(ev => (
                                <label
                                    key={ev.key}
                                    className={cn(
                                        "flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-sm transition-all",
                                        events.includes(ev.key)
                                            ? "border-blue-300 bg-blue-50 text-blue-700"
                                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={events.includes(ev.key)}
                                        onChange={() => toggleEvent(ev.key)}
                                        className="accent-blue-500"
                                    />
                                    {ev.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Secret Key */}
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider font-medium block mb-1.5">
                            {t('webhook.secretKey')} <span className="text-gray-400 normal-case text-[11px]">({t('common.optional').toLowerCase()})</span>
                        </label>
                        <input
                            type="password"
                            value={secret}
                            onChange={e => setSecret(e.target.value)}
                            placeholder={t('webhook.secretPlaceholder')}
                            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            {t('webhook.secretDesc')}
                        </p>
                    </div>

                    {/* Test result */}
                    {existing && (
                        <div>
                            <button
                                onClick={handleTest}
                                disabled={testing}
                                className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 font-medium"
                            >
                                {testing ? <Loader2 size={14} className="animate-spin" /> : "🧪"}
                                {testing ? t('webhook.sending') : t('webhook.testUrl')}
                            </button>
                            {testResult && (
                                <div className={cn(
                                    "mt-2 p-3 rounded-xl border text-sm flex items-center gap-2",
                                    testResult.success
                                        ? "bg-green-50 border-green-200 text-green-700"
                                        : "bg-red-50 border-red-200 text-red-700"
                                )}>
                                    {testResult.success
                                        ? <CheckCircle2 size={15} />
                                        : <XCircle size={15} />
                                    }
                                    {testResult.statusCode
                                        ? `${testResult.statusCode} ${testResult.message} (${testResult.responseTime}ms)`
                                        : testResult.message
                                    }
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="px-4 py-2 text-sm rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-60"
                    >
                        {isPending ? t('common.loading') : existing ? t('common.save') : t('webhook.create')}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Webhook Card ──────────────────────────────────────────────

function WebhookCard({
    webhook,
    projectId,
}: {
    webhook: WebhookItem
    projectId: string
}) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const qKey = ["webhooks", projectId]
    const [editing, setEditing] = useState(false)
    const [testResult, setTestResult] = useState<WebhookTestResult | null>(null)
    const [testing, setTesting] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    const deleteMutation = useMutation({
        mutationFn: () => TaskService.deleteWebhook(webhook.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qKey })
            toast.success(t('webhook.deleted'))
        },
        onError: () => toast.error(t('webhook.deleteError')),
    })

    const toggleMutation = useMutation({
        mutationFn: (active: boolean) =>
            TaskService.updateWebhook(webhook.id, { isActive: active }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
        onError: () => toast.error(t('webhook.updateError')),
    })

    const handleTest = async () => {
        setTesting(true)
        setTestResult(null)
        try {
            const result = await TaskService.testWebhook(projectId, webhook.id)
            setTestResult(result)
        } catch {
            setTestResult({ success: false, statusCode: null, responseTime: 0, message: t('webhook.connectionError') })
        } finally {
            setTesting(false)
        }
    }

    const dotColor = webhook.active
        ? (webhook.failureCount > 0 ? "bg-amber-400" : "bg-green-500")
        : "bg-gray-300"

    return (
        <>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-all">
                {/* Row 1: name + toggle + actions */}
                <div className="flex items-center gap-3 mb-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotColor)} />
                    <span className="font-semibold text-gray-800 flex-1">{webhook.name}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={webhook.active}
                            onChange={e => toggleMutation.mutate(e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-checked:bg-blue-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                <MoreHorizontal size={16} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={handleTest}>
                                {testing ? <Loader2 size={14} className="animate-spin mr-2" /> : "🧪 "}
                                {t('webhook.test')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditing(true)}>
                                ✏ {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-500 focus:text-red-500"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                🗑 {t('common.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Row 2: URL */}
                <p className="text-xs text-gray-400 font-mono truncate mb-2 pl-6">
                    {webhook.url}
                </p>

                {/* Row 3: Events */}
                <div className="flex flex-wrap gap-1.5 mb-2 pl-6">
                    {webhook.events.map(ev => {
                        const found = ALL_EVENTS.find(e => e.key === ev)
                        return (
                            <span
                                key={ev}
                                className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                            >
                                {found?.label ?? ev}
                            </span>
                        )
                    })}
                </div>

                {/* Row 4: Last triggered + failure count */}
                <div className="flex items-center gap-3 pl-6">
                    <span className="text-xs text-gray-400">
                        {t('webhook.lastTriggered')}: {timeAgo(webhook.lastTriggeredAt, t)}
                    </span>
                    {webhook.failureCount > 0 && (
                        <span className="text-xs text-amber-600 font-medium">
                            ⚠ {t('webhook.failures', { count: webhook.failureCount })}
                        </span>
                    )}
                </div>

                {/* Test result inline */}
                {testResult && (
                    <div className={cn(
                        "mt-3 p-3 rounded-xl border text-sm flex items-center gap-2",
                        testResult.success
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-red-50 border-red-200 text-red-700"
                    )}>
                        {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {testResult.statusCode
                            ? `${testResult.statusCode} ${testResult.message} (${testResult.responseTime}ms)`
                            : testResult.message
                        }
                    </div>
                )}
            </div>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("common.delete")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {`${t("webhook.confirmDelete")} "${webhook.name}"?`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setDeleteDialogOpen(false)
                                deleteMutation.mutate()
                            }}
                        >
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {editing && (
                <WebhookModal
                    projectId={projectId}
                    existing={webhook}
                    onClose={() => setEditing(false)}
                />
            )}
        </>
    )
}

// ── Main Component ─────────────────────────────────────────────

interface Props {
    projectId: string
    myRole: string
}

export default function WebhookManager({ projectId, myRole }: Props) {
    const { t } = useTranslation()
    const [showModal, setShowModal] = useState(false)

    const { data: webhooks = [], isLoading } = useQuery({
        queryKey: ["webhooks", projectId],
        queryFn:  () => TaskService.getWebhooks(projectId),
        enabled:  !!projectId,
    })

    const count   = webhooks.length
    const atLimit = count >= 5

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-100/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900">{t('webhook.title')}</h2>
                    <span className="bg-white text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-200 shadow-sm">
                        {count} / 5
                    </span>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    disabled={atLimit}
                    title={atLimit ? t('webhook.maxWebhooks') : undefined}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={16} strokeWidth={3} /> {t('webhook.add')}
                </button>
            </div>

            {/* List */}
            <div className="p-6">
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : webhooks.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                    {t('webhook.empty')}
                </div>
            ) : (
                <div className="space-y-3">
                    {webhooks.map(wh => (
                        <WebhookCard key={wh.id} webhook={wh} projectId={projectId} />
                    ))}
                </div>
            )}
            </div>

            {showModal && (
                <WebhookModal
                    projectId={projectId}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    )
}
