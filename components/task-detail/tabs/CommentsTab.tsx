"use client"

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import MentionExtension from "@tiptap/extension-mention"
import ImageExtension from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import { mergeAttributes } from "@tiptap/core"
import { Bold, Italic, Code, List, Quote, Terminal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/common/UserAvatar"
import { useCommentSection, insertReply, removeComment } from "@/hooks/useComments"
import { useAuthStore } from "@/stores/useAuthStore"
import { timeAgo } from "@/components/task-detail/config"
import type { CommentResponse, AttachmentResponse } from "@/app/types/task.schema"
import type { MemberSearchResponse } from "@/app/types/member.schema"
import { cn } from "@/lib/utils"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { TaskDetailService } from "@/app/services/TaskDetailService"
import { toast } from "sonner"
import { createPortal } from "react-dom"

// ── Custom Mention node ────────────────────────────────────

const CustomMention = MentionExtension.extend({
    addAttributes() {
        return {
            id: {
                default: null,
                parseHTML: (el) => el.getAttribute("data-mention-id"),
                renderHTML: (attrs) => (attrs.id ? { "data-mention-id": attrs.id } : {}),
            },
            label: {
                default: null,
                parseHTML: (el) => el.getAttribute("data-mention-name"),
                renderHTML: (attrs) => (attrs.label ? { "data-mention-name": attrs.label } : {}),
            },
        }
    },
    parseHTML() {
        return [{ tag: "span[data-mention-id]" }]
    },
    renderHTML({ node, HTMLAttributes }) {
        return [
            "span",
            mergeAttributes({ class: "mention" }, HTMLAttributes),
            `@${node.attrs.label ?? node.attrs.id}`,
        ]
    },
})

// ── Role badge ─────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
    const map: Record<string, { label: string }> = {
        PROJECT_MANAGER: { label: "PM" },
        MEMBER: { label: "Member" },
        VIEWER: { label: "Viewer" },
    }
    const cfg = map[role] ?? { label: role }
    return (
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {cfg.label}
        </span>
    )
}

// ── Mention dropdown ───────────────────────────────────────

interface MentionDropdownProps {
    items: MemberSearchResponse[]
    selectedIndex: number
    position: { x: number; y: number }
    onSelect: (item: MemberSearchResponse) => void
}

function MentionDropdown({ items, selectedIndex, position, onSelect }: MentionDropdownProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [style, setStyle] = React.useState<React.CSSProperties>({
        top: position.y + 6,
        left: position.x,
        visibility: "hidden",
    })

    React.useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const { innerWidth, innerHeight } = window
        const { width, height } = el.getBoundingClientRect()
        let top = position.y + 6
        let left = position.x
        if (top + height > innerHeight - 8) top = position.y - height - 6
        if (left + width > innerWidth - 8) left = innerWidth - width - 8
        if (left < 8) left = 8
        setStyle({ top, left, visibility: "visible" })
    }, [position, items.length])

    return createPortal(
        <div
            ref={ref}
            className="fixed z-[9999] w-64 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={style}
        >
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-gray-100">
                Mention someone
            </div>
            <div className="max-h-52 overflow-y-auto">
                {items.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-slate-400 text-center">Không tìm thấy thành viên</div>
                ) : (
                    items.map((member, i) => (
                        <button
                            key={member.id}
                            onMouseDown={(e) => { e.preventDefault(); onSelect(member) }}
                            className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                                i === selectedIndex ? "bg-blue-50" : "hover:bg-slate-50"
                            )}
                        >
                            <UserAvatar src={member.avatarUrl ?? undefined} name={member.fullName} size={28} />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-slate-800 truncate">{member.fullName}</div>
                                <div className="text-[11px] text-slate-400 truncate">{member.email}</div>
                            </div>
                            <RoleBadge role={member.projectRole} />
                        </button>
                    ))
                )}
            </div>
        </div>,
        document.body
    )
}

// ── Toolbar ────────────────────────────────────────────────

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
    if (!editor) return null

    const btn = (active: boolean) =>
        cn("toolbar-btn", active && "active")

    return (
        <div className="editor-toolbar">
            <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }} className={btn(editor.isActive("bold"))} title="Bold">
                <Bold size={14} />
            </button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }} className={btn(editor.isActive("italic"))} title="Italic">
                <Italic size={14} />
            </button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run() }} className={btn(editor.isActive("code"))} title="Inline code">
                <Code size={14} />
            </button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run() }} className={btn(editor.isActive("codeBlock"))} title="Code block">
                <Terminal size={14} />
            </button>

            <div className="toolbar-divider" />

            <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }} className={btn(editor.isActive("bulletList"))} title="Bullet list">
                <List size={14} />
            </button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run() }} className={btn(editor.isActive("blockquote"))} title="Blockquote">
                <Quote size={14} />
            </button>
        </div>
    )
}

// ── Image upload ───────────────────────────────────────────

async function uploadImageFile(
    file: File,
    projectId: string,
    taskId: string,
    onLoadingChange: (v: boolean) => void
): Promise<string | null> {
    if (file.size > 5 * 1024 * 1024) {
        toast.error("Ảnh quá lớn, tối đa 5MB")
        return null
    }
    onLoadingChange(true)
    try {
        const result = await TaskDetailService.uploadAttachment(projectId, taskId, file)
        if ("id" in result) {
            const r = result as AttachmentResponse
            return r.previewUrl ?? r.downloadUrl
        }
        if ("jobId" in result) {
            const jobId = (result as { jobId: string }).jobId
            for (let attempt = 0; attempt < 15; attempt++) {
                await new Promise((r) => setTimeout(r, 2000))
                const job = await TaskDetailService.pollAttachmentJob(jobId)
                if (job.status === "COMPLETED") {
                    const attachments = await TaskDetailService.getAttachments(projectId, taskId)
                    const newest = attachments.sort(
                        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
                    )[0]
                    return newest?.previewUrl ?? newest?.downloadUrl ?? null
                }
                if (job.status === "FAILED") {
                    toast.error("Upload ảnh thất bại — file có thể không an toàn")
                    return null
                }
            }
            toast.error("Upload ảnh hết thời gian, vui lòng thử lại")
        }
        return null
    } catch (err: any) {
        toast.error(err?.response?.data?.message ?? "Upload ảnh thất bại")
        return null
    } finally {
        onLoadingChange(false)
    }
}

// ── Comment Editor ─────────────────────────────────────────

interface CommentEditorProps {
    projectId: string
    taskId?: string
    placeholder?: string
    onSubmit: (html: string) => void
    isPending: boolean
    onCancel?: () => void
    initialContent?: string
    autoFocus?: boolean
}

function CommentEditor({
    projectId,
    taskId,
    placeholder,
    onSubmit,
    isPending,
    onCancel,
    initialContent,
    autoFocus = false,
}: CommentEditorProps) {
    const [mentionItems, setMentionItems] = useState<MemberSearchResponse[]>([])
    const [mentionPos, setMentionPos] = useState<{ x: number; y: number } | null>(null)
    const [mentionIdx, setMentionIdx] = useState(0)
    const mentionCommandRef = useRef<((id: string, label: string) => void) | null>(null)
    const mentionItemsRef = useRef<MemberSearchResponse[]>([])
    const mentionIdxRef = useRef(0)
    mentionItemsRef.current = mentionItems
    mentionIdxRef.current = mentionIdx

    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const projectIdRef = useRef(projectId)
    projectIdRef.current = projectId

    const mentionSuggestion = useMemo(
        () => ({
            items: async ({ query }: { query: string }) => {
                try {
                    return (await ProjectMemberService.searchMembers(projectIdRef.current, query)).slice(0, 10)
                } catch {
                    return []
                }
            },
            render: () => ({
                onStart(props: any) {
                    mentionCommandRef.current = (id: string, label: string) => props.command({ id, label })
                    setMentionItems(props.items)
                    setMentionIdx(0)
                    const rect = props.clientRect?.()
                    if (rect) setMentionPos({ x: rect.left, y: rect.bottom })
                },
                onUpdate(props: any) {
                    setMentionItems(props.items)
                    setMentionIdx(0)
                    const rect = props.clientRect?.()
                    if (rect) setMentionPos({ x: rect.left, y: rect.bottom })
                },
                onExit() {
                    setMentionPos(null)
                    setMentionItems([])
                    mentionCommandRef.current = null
                },
                onKeyDown({ event }: any) {
                    const items = mentionItemsRef.current
                    if (items.length === 0) return false
                    if (event.key === "ArrowDown") { setMentionIdx((i) => (i + 1) % items.length); return true }
                    if (event.key === "ArrowUp") { setMentionIdx((i) => (i - 1 + items.length) % items.length); return true }
                    if (event.key === "Enter") {
                        const item = items[mentionIdxRef.current]
                        if (item) mentionCommandRef.current?.(item.id, item.fullName)
                        return true
                    }
                    return false
                },
            }),
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    const CustomMentionWithSuggestion = useMemo(
        () => CustomMention.configure({ HTMLAttributes: {}, suggestion: mentionSuggestion }),
        [mentionSuggestion]
    )

    const editor = useEditor({
        extensions: [
            StarterKit,
            ImageExtension,
            Placeholder.configure({ placeholder: placeholder ?? "Viết comment... Dùng @ để mention" }),
            CustomMentionWithSuggestion,
        ],
        content: initialContent ?? "",
        immediatelyRender: false,
        editorProps: {
            attributes: { class: "editor-content" },
            handleDrop(view, event) {
                const files = event.dataTransfer?.files
                if (!files?.length || !files[0].type.startsWith("image/")) return false
                event.preventDefault()
                if (!taskId) { toast.error("Không thể upload ảnh ở đây"); return true }
                uploadImageFile(files[0], projectIdRef.current, taskId, setIsUploadingImage).then((url) => {
                    if (url) editor?.chain().focus().setImage({ src: url }).run()
                })
                return true
            },
            handlePaste(view, event) {
                const files = event.clipboardData?.files
                if (!files?.length || !files[0].type.startsWith("image/")) return false
                event.preventDefault()
                if (!taskId) { toast.error("Không thể upload ảnh ở đây"); return true }
                uploadImageFile(files[0], projectIdRef.current, taskId, setIsUploadingImage).then((url) => {
                    if (url) editor?.chain().focus().setImage({ src: url }).run()
                })
                return true
            },
        },
    })

    useEffect(() => {
        if (!editor) return
        const dom = editor.view.dom as HTMLElement
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit() }
        }
        dom.addEventListener("keydown", handleKey)
        return () => dom.removeEventListener("keydown", handleKey)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor])

    useEffect(() => {
        if (autoFocus && editor) setTimeout(() => editor.commands.focus(), 50)
    }, [autoFocus, editor])

    const handleSubmit = useCallback(() => {
        if (!editor || editor.isEmpty || editor.getText().trim() === "") return
        onSubmit(editor.getHTML())
        editor.commands.clearContent()
    }, [editor, onSubmit])

    const isEmpty = !editor || editor.isEmpty || editor.getText().trim() === ""

    return (
        <div className="space-y-0">
            <div className={cn("editor-wrapper", isUploadingImage && "opacity-60 pointer-events-none")}>
                <EditorToolbar editor={editor} />

                <div className="relative">
                    <EditorContent editor={editor} />
                    {isUploadingImage && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                            <div className="flex items-center gap-2 text-sm text-primary font-medium">
                                <Loader2 size={15} className="animate-spin" />
                                Đang upload ảnh...
                            </div>
                        </div>
                    )}
                </div>

                <div className="editor-footer">
                    <span className="editor-hint">Ctrl+Enter để gửi · @ để mention</span>
                    <div className="flex gap-2">
                        {onCancel && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" onClick={onCancel}>
                                Huỷ
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={isEmpty || isPending || isUploadingImage}
                            className="h-7 px-4 text-xs font-semibold rounded-lg"
                        >
                            {isPending ? <Loader2 size={12} className="animate-spin" /> : "Gửi"}
                        </Button>
                    </div>
                </div>
            </div>

            {mentionPos && (
                <MentionDropdown
                    items={mentionItems}
                    selectedIndex={mentionIdx}
                    position={mentionPos}
                    onSelect={(item) => {
                        mentionCommandRef.current?.(item.id, item.fullName)
                        setMentionPos(null)
                    }}
                />
            )}
        </div>
    )
}

// ── Comment content ────────────────────────────────────────

function CommentContent({ html }: { html: string }) {
    return (
        <div
            className="prose prose-sm max-w-none text-sm leading-relaxed comment-content"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}

// ── Comment Item ───────────────────────────────────────────

interface CommentItemProps {
    comment: CommentResponse
    rootId: string
    projectId: string
    taskId: string
    onReplyToRoot: (rootCommentId: string, content: string) => void
    onUpdate: (params: { commentId: string; content: string }) => void
    onDelete: (commentId: string) => void
    isAddingComment: boolean
}

function CommentItem({
    comment,
    rootId,
    projectId,
    taskId,
    onReplyToRoot,
    onUpdate,
    onDelete,
    isAddingComment,
}: CommentItemProps) {
    const [isReplying, setIsReplying] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    const handleReply = useCallback(
        (html: string) => { onReplyToRoot(rootId, html); setIsReplying(false) },
        [onReplyToRoot, rootId]
    )
    const handleSaveEdit = useCallback(
        (html: string) => { onUpdate({ commentId: comment.id, content: html }); setIsEditing(false) },
        [onUpdate, comment.id]
    )

    return (
        <div className="comment-item flex gap-2.5 group py-2">
            <UserAvatar
                src={comment.author.avatarUrl ?? undefined}
                name={comment.author.fullName}
                size={28}
                className="shrink-0 mt-0.5"
            />

            <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-sm text-slate-900">{comment.author.fullName}</span>
                    <span className="text-[11px] text-slate-400">· {timeAgo(comment.createdAt)}</span>
                    {comment.isEdited && (
                        <span className="text-[11px] text-slate-400 italic">(đã chỉnh sửa)</span>
                    )}
                    {/* Actions — hidden, fade in on hover */}
                    {!isEditing && (
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            <button
                                className="text-[11px] text-slate-400 hover:text-blue-600 px-1.5 py-0.5 rounded transition-colors"
                                onClick={() => setIsReplying((v) => !v)}
                            >
                                Trả lời
                            </button>
                            {comment.canEdit && (
                                <button
                                    className="text-[11px] text-slate-400 hover:text-blue-600 px-1.5 py-0.5 rounded transition-colors"
                                    onClick={() => setIsEditing(true)}
                                >
                                    Sửa
                                </button>
                            )}
                            {comment.canDelete && (
                                <button
                                    className="text-[11px] text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded transition-colors"
                                    onClick={() => { if (confirm("Xóa comment này?")) onDelete(comment.id) }}
                                >
                                    Xóa
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Content */}
                {isEditing ? (
                    <div className="mt-2">
                        <CommentEditor
                            projectId={projectId}
                            taskId={taskId}
                            placeholder="Chỉnh sửa comment..."
                            onSubmit={handleSaveEdit}
                            isPending={false}
                            onCancel={() => setIsEditing(false)}
                            initialContent={comment.content}
                            autoFocus
                        />
                    </div>
                ) : (
                    <CommentContent html={comment.content} />
                )}

                {/* Reply editor */}
                {isReplying && (
                    <div className="mt-2">
                        <CommentEditor
                            projectId={projectId}
                            taskId={taskId}
                            placeholder={`Trả lời @${comment.author.fullName}...`}
                            onSubmit={handleReply}
                            isPending={isAddingComment}
                            onCancel={() => setIsReplying(false)}
                            autoFocus
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

// ────────────────────────────────────────────────────────────
// Main CommentsTab
// ────────────────────────────────────────────────────────────

interface CommentsTabProps {
    projectId: string
    taskId: string
}

export default function CommentsTab({ projectId, taskId }: CommentsTabProps) {
    const { user } = useAuthStore()

    const {
        comments,
        setComments,
        totalElements,
        isLoading,
        hasMore,
        loadMore,
        addComment,
        isAddingComment,
        updateComment,
        deleteComment,
    } = useCommentSection(projectId, taskId)

    const currentUserId = user?.id?.toString() ?? ""

    useEffect(() => {
        if (typeof window === "undefined") return
        let client: any = null
        let sub: any = null

        const connect = async () => {
            try {
                const [{ Client }, { default: SockJS }] = await Promise.all([
                    import("@stomp/stompjs"),
                    import("sockjs-client"),
                ])
                const wsUrl = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api").replace(/\/api\/?$/, "")}/ws`
                client = new Client({
                    webSocketFactory: () => new SockJS(wsUrl),
                    reconnectDelay: 5000,
                    onConnect: () => {
                        sub = client.subscribe(`/topic/project/${projectId}`, (msg: any) => {
                            try {
                                const { event, data } = JSON.parse(msg.body)
                                if (event === "comment.created") {
                                    const c: CommentResponse = data
                                    if (c.author.id === currentUserId) return
                                    if (c.parentId === null) setComments((prev) => [c, ...prev])
                                    else setComments((prev) => insertReply(prev, c.parentId!, c))
                                }
                                if (event === "comment.deleted") {
                                    setComments((prev) => removeComment(prev, data.id))
                                }
                            } catch {}
                        })
                    },
                    onStompError: () => {},
                })
                client.activate()
            } catch {}
        }

        connect()
        return () => { sub?.unsubscribe(); client?.deactivate() }
    }, [projectId, currentUserId, setComments])

    if (isLoading) {
        return (
            <div className="space-y-5 animate-pulse p-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                        <div className="flex-1 space-y-2 pt-1">
                            <div className="h-3 bg-muted rounded w-28" />
                            <div className="h-4 bg-muted rounded w-3/4" />
                            <div className="h-4 bg-muted rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-4 pb-10">
            {/* Comment list */}
            {comments.length > 0 && (
                <div className="space-y-0">
                    {comments.map((c) => (
                        <div key={c.id} className="comment-new">
                            <CommentItem
                                comment={c}
                                rootId={c.id}
                                projectId={projectId}
                                taskId={taskId}
                                onReplyToRoot={(rootCommentId, content) =>
                                    addComment({ content, parentId: rootCommentId })
                                }
                                onUpdate={updateComment}
                                onDelete={deleteComment}
                                isAddingComment={isAddingComment}
                            />

                            {c.replies?.length > 0 && (
                                <div className="comment-replies">
                                    {c.replies.map((reply) => (
                                        <CommentItem
                                            key={reply.id}
                                            comment={reply}
                                            rootId={c.id}
                                            projectId={projectId}
                                            taskId={taskId}
                                            onReplyToRoot={(rootCommentId, content) =>
                                                addComment({ content, parentId: rootCommentId })
                                            }
                                            onUpdate={updateComment}
                                            onDelete={deleteComment}
                                            isAddingComment={isAddingComment}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center pt-2">
                    <Button variant="ghost" size="sm" onClick={loadMore} className="text-xs text-muted-foreground">
                        Xem thêm bình luận
                    </Button>
                </div>
            )}

            {/* Main editor */}
            <div className="flex gap-3 pt-4 border-t border-border">
                <UserAvatar
                    src={user?.avatar?.imageUrl ?? undefined}
                    name={user?.fullName ?? "?"}
                    size={32}
                    className="shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                    <CommentEditor
                        projectId={projectId}
                        taskId={taskId}
                        onSubmit={(html) => addComment({ content: html, parentId: null })}
                        isPending={isAddingComment}
                    />
                </div>
            </div>
        </div>
    )
}
