"use client"

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import MentionExtension from "@tiptap/extension-mention"
import Placeholder from "@tiptap/extension-placeholder"
import { mergeAttributes } from "@tiptap/core"
import {
    Bold,
    Code,
    Download,
    Italic,
    List,
    Quote,
    Terminal,
    Loader2,
    AtSign,
    Image as ImageIcon,
    Type,
    X,
} from "lucide-react"
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
        top: position.y,
        left: position.x,
        visibility: "hidden",
    })

    React.useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const { innerWidth } = window
        const { width, height } = el.getBoundingClientRect()
        // Mặc định hiện phía TRÊN cursor với khoảng cách 8px
        let top = position.y - height - 20
        let left = position.x
        // Nếu không đủ chỗ phía trên thì xuống dưới
        if (top < 8) top = position.y + 8
        if (left + width > innerWidth - 8) left = innerWidth - width - 8
        if (left < 8) left = 8
        setStyle({ top, left, visibility: "visible" })
    }, [position, items.length])

    return createPortal(
        <div
            ref={ref}
            className="fixed z-[9999] w-64 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={style}
            data-mention-dropdown
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

// ── Image file helpers ─────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

function validateImageFile(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "Chỉ hỗ trợ ảnh JPEG, PNG, GIF, WEBP"
    if (file.size > MAX_IMAGE_SIZE) return "Ảnh quá lớn, tối đa 5MB"
    return null
}

// ── Comment Editor ─────────────────────────────────────────

interface CommentEditorProps {
    projectId: string
    taskId?: string
    placeholder?: string
    onSubmit: (html: string, files: File[]) => void
    isPending: boolean
    onCancel?: () => void
    initialContent?: string
    autoFocus?: boolean
    replyPrefill?: {
        token: number
        mentionId: string
        mentionLabel: string
    } | null
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
    replyPrefill = null,
}: CommentEditorProps) {
    const [showToolbar, setShowToolbar] = useState(false)
    const [isComposerActive, setIsComposerActive] = useState(autoFocus)
    const [mentionItems, setMentionItems] = useState<MemberSearchResponse[]>([])
    const [mentionPos, setMentionPos] = useState<{ x: number; y: number } | null>(null)
    const [mentionIdx, setMentionIdx] = useState(0)
    const mentionCommandRef = useRef<((id: string, label: string) => void) | null>(null)
    const mentionItemsRef = useRef<MemberSearchResponse[]>([])
    const mentionIdxRef = useRef(0)
    mentionItemsRef.current = mentionItems
    mentionIdxRef.current = mentionIdx

    const [pendingFiles, setPendingFiles] = useState<{ file: File; localUrl: string }[]>([])
    const imageInputRef = useRef<HTMLInputElement>(null)
    const projectIdRef = useRef(projectId)
    projectIdRef.current = projectId

    // Revoke object URLs on unmount
    const pendingFilesRef = useRef(pendingFiles)
    pendingFilesRef.current = pendingFiles
    useEffect(() => {
        return () => { pendingFilesRef.current.forEach(f => URL.revokeObjectURL(f.localUrl)) }
    }, [])

    const addLocalImage = useCallback((file: File) => {
        const err = validateImageFile(file)
        if (err) { toast.error(err); return }
        const localUrl = URL.createObjectURL(file)
        setPendingFiles(prev => [...prev, { file, localUrl }])
    }, [])

    const resolvePos = (props: any): { x: number; y: number } | null => {
        const rect = props.clientRect?.()
        if (rect) return { x: rect.left, y: rect.top }
        const node = props.decorationNode as HTMLElement | null
        if (node) {
            const nr = node.getBoundingClientRect()
            return { x: nr.left, y: nr.top }
        }
        return null
    }

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
                    setMentionPos(resolvePos(props))
                },
                onUpdate(props: any) {
                    setMentionItems(props.items)
                    setMentionIdx(0)
                    setMentionPos(resolvePos(props))
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
            Placeholder.configure({ placeholder: placeholder ?? "Viết bình luận..." }),
            CustomMentionWithSuggestion,
        ],
        content: initialContent ?? "",
        immediatelyRender: false,
        editorProps: {
            attributes: { class: "editor-content" },
            handleDOMEvents: {
                focus: () => {
                    setIsComposerActive(true)
                    return false
                },
                blur: () => {
                    if (autoFocus) return false  // Reply/edit editors stay expanded
                    setTimeout(() => {
                        const text = editor?.getText().trim() ?? ""
                        if (!showToolbar && text.length === 0) setIsComposerActive(false)
                    }, 80)
                    return false
                },
            },
            handleDrop(_view, event) {
                const file = event.dataTransfer?.files?.[0]
                if (!file?.type.startsWith("image/")) return false
                event.preventDefault()
                addLocalImage(file)
                return true
            },
            handlePaste(_view, event) {
                const file = event.clipboardData?.files?.[0]
                if (!file?.type.startsWith("image/")) return false
                event.preventDefault()
                addLocalImage(file)
                return true
            },
        },
    })

    // Đóng mention dropdown khi click ra ngoài hoặc scroll
    useEffect(() => {
        if (!mentionPos) return
        const dismiss = () => {
            setMentionPos(null)
            setMentionItems([])
            mentionCommandRef.current = null
        }
        const onMouseDown = (e: MouseEvent) => {
            const dropdown = document.querySelector("[data-mention-dropdown]")
            if (dropdown?.contains(e.target as Node)) return
            dismiss()
        }
        document.addEventListener("mousedown", onMouseDown)
        document.addEventListener("scroll", dismiss, true)
        return () => {
            document.removeEventListener("mousedown", onMouseDown)
            document.removeEventListener("scroll", dismiss, true)
        }
    }, [mentionPos])

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

    useEffect(() => {
        if (!editor || !replyPrefill) return
        setIsComposerActive(true)
        editor
            .chain()
            .focus()
            .clearContent()
            .insertContent([
                {
                    type: "mention",
                    attrs: { id: replyPrefill.mentionId, label: replyPrefill.mentionLabel },
                },
                { type: "text", text: " " },
            ])
            .run()
    }, [editor, replyPrefill])

    const hasSubmittableContent = useCallback(() => {
        if (!editor) return false
        if (pendingFiles.length > 0) return true
        const plain = editor.getText().trim()
        if (plain.length > 0) return true
        const html = editor.getHTML()
        const textFromHtml = html.replace(/<[^>]+>/g, "").trim()
        if (textFromHtml.length > 0) return true
        // Mention nodes don't contribute to getText() — check HTML directly
        return /data-mention-id/i.test(html)
    }, [editor, pendingFiles])

    const handleSubmit = useCallback(() => {
        if (!editor || !hasSubmittableContent()) return
        const html = editor.getHTML()
        const files = pendingFiles.map(f => f.file)
        onSubmit(html, files)
        editor.commands.clearContent()
        pendingFiles.forEach(f => URL.revokeObjectURL(f.localUrl))
        setPendingFiles([])
    }, [editor, pendingFiles, hasSubmittableContent, onSubmit])

    const isEmpty = !hasSubmittableContent()

    return (
        <div className="space-y-2">
            {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {pendingFiles.map((f, i) => (
                        <div key={i} className="relative group">
                            <img
                                src={f.localUrl}
                                alt=""
                                className="h-20 w-20 object-cover rounded-xl border border-slate-200"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    URL.revokeObjectURL(f.localUrl)
                                    setPendingFiles(prev => prev.filter((_, idx) => idx !== i))
                                }}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div
                className={cn(
                    "editor-wrapper",
                    !isComposerActive && "comment-editor-compact",
                )}
                onMouseDown={() => setIsComposerActive(true)}
            >
                {isComposerActive && showToolbar && <EditorToolbar editor={editor} />}

                <EditorContent editor={editor} />

                <div className={cn("editor-footer transition-all duration-150", !isComposerActive && "hidden")}>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setIsComposerActive(true)
                                setShowToolbar((v) => !v)
                            }}
                            className={cn("toolbar-btn !h-7 !w-7", showToolbar && "active")}
                            title="Rich text"
                        >
                            <Type size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsComposerActive(true)
                                editor?.chain().focus().insertContent("@").run()
                            }}
                            className="toolbar-btn !h-7 !w-7"
                            title="Mention"
                        >
                            <AtSign size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsComposerActive(true)
                                imageInputRef.current?.click()
                            }}
                            className="toolbar-btn !h-7 !w-7"
                            title="Chèn ảnh"
                        >
                            <ImageIcon size={14} />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        {onCancel && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" onClick={() => { pendingFiles.forEach(f => URL.revokeObjectURL(f.localUrl)); setPendingFiles([]); onCancel() }}>
                                Huỷ
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={isEmpty || isPending}
                            className="h-7 px-4 text-xs font-semibold rounded-lg"
                        >
                            {isPending ? <Loader2 size={12} className="animate-spin" /> : "Gửi"}
                        </Button>
                    </div>
                </div>
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        addLocalImage(file)
                        e.currentTarget.value = ""
                    }}
                />
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

// ── Parse comment HTML: tách text và ảnh ─────────────────

function parseCommentHtml(html: string): { textHtml: string; imageSrcs: string[] } {
    const imageSrcs: string[] = []
    const imgRegex = /<img[^>]+src="([^"]*)"[^>]*\/?>/gi
    let match
    while ((match = imgRegex.exec(html)) !== null) {
        if (match[1]) imageSrcs.push(match[1])
    }
    const textHtml = html
        .replace(/<img[^>]*\/?>/gi, "")
        .replace(/<p>\s*<\/p>/g, "")
        .trim()
    return { textHtml, imageSrcs }
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

// ── Image Lightbox ─────────────────────────────────────────

function ImageLightbox({ src, srcs, index, onClose, onNavigate }: {
    src: string
    srcs: string[]
    index: number
    onClose: () => void
    onNavigate: (i: number) => void
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
            if (e.key === "ArrowRight" && index < srcs.length - 1) onNavigate(index + 1)
            if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1)
        }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [index, srcs.length, onClose, onNavigate])

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close */}
            <button
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/40 rounded-full p-2 transition-colors"
                onClick={onClose}
            >
                <X size={20} />
            </button>

            {/* Counter */}
            {srcs.length > 1 && (
                <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
                    {index + 1} / {srcs.length}
                </span>
            )}

            {/* Prev */}
            {index > 0 && (
                <button
                    className="absolute left-4 text-white/70 hover:text-white bg-black/40 rounded-full p-2 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onNavigate(index - 1) }}
                >
                    ‹
                </button>
            )}

            {/* Image */}
            <img
                src={src}
                alt=""
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />

            {/* Next */}
            {index < srcs.length - 1 && (
                <button
                    className="absolute right-4 text-white/70 hover:text-white bg-black/40 rounded-full p-2 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onNavigate(index + 1) }}
                >
                    ›
                </button>
            )}

            {/* Download */}
            <a
                href={src}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-4 right-4 text-white/60 hover:text-white text-xs flex items-center gap-1.5 bg-black/40 rounded-full px-3 py-1.5 transition-colors"
                onClick={(e) => e.stopPropagation()}
            >
                <Download size={13} /> Tải xuống
            </a>
        </div>,
        document.body
    )
}

// ── Image Grid (Zalo style) ────────────────────────────────

function ImageGrid({ srcs, onPreview }: { srcs: string[]; onPreview: (index: number) => void }) {
    const imgCls = "w-full h-full object-cover cursor-pointer hover:brightness-95 transition"

    if (srcs.length === 1) {
        return (
            <div className="overflow-hidden rounded-2xl max-w-[260px]">
                <img src={srcs[0]} alt="" className={cn(imgCls, "max-h-[260px] rounded-2xl")} onClick={() => onPreview(0)} />
            </div>
        )
    }

    if (srcs.length === 2) {
        return (
            <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden max-w-[260px]">
                {srcs.map((src, i) => (
                    <div key={i} className="aspect-square overflow-hidden">
                        <img src={src} alt="" className={imgCls} onClick={() => onPreview(i)} />
                    </div>
                ))}
            </div>
        )
    }

    if (srcs.length === 3) {
        return (
            <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden max-w-[260px]">
                <div className="row-span-2 overflow-hidden">
                    <img src={srcs[0]} alt="" className={cn(imgCls, "h-full")} onClick={() => onPreview(0)} />
                </div>
                {srcs.slice(1).map((src, i) => (
                    <div key={i} className="aspect-square overflow-hidden">
                        <img src={src} alt="" className={imgCls} onClick={() => onPreview(i + 1)} />
                    </div>
                ))}
            </div>
        )
    }

    // 4+: 2×2 grid, show "+N" overlay on last if more than 4
    const visible = srcs.slice(0, 4)
    const extra = srcs.length - 4
    return (
        <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden max-w-[260px]">
            {visible.map((src, i) => (
                <div key={i} className="aspect-square overflow-hidden relative">
                    <img src={src} alt="" className={imgCls} onClick={() => onPreview(i)} />
                    {i === 3 && extra > 0 && (
                        <div
                            className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer"
                            onClick={() => onPreview(3)}
                        >
                            <span className="text-white text-xl font-bold">+{extra + 1}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

// ── Comment Item ───────────────────────────────────────────

interface CommentItemProps {
    comment: CommentResponse
    rootId: string
    projectId: string
    taskId: string
    onReplyClick: (payload: { rootCommentId: string; mentionId: string; mentionLabel: string }) => void
    onUpdate: (params: { commentId: string; content: string }) => void
    onDelete: (commentId: string) => void
}

function CommentItem({
    comment,
    rootId,
    projectId,
    taskId,
    onReplyClick,
    onUpdate,
    onDelete,
}: CommentItemProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

    const handleSaveEdit = useCallback(
        (html: string) => { onUpdate({ commentId: comment.id, content: html }); setIsEditing(false) },
        [onUpdate, comment.id]
    )

    // Backward compat: old comments may have <img> in HTML; new comments use attachments[]
    const { textHtml, imageSrcs: legacyImgSrcs } = parseCommentHtml(comment.content)
    const attachmentSrcs = (comment.attachments ?? [])
        .filter(a => a.previewable || a.previewUrl)
        .map(a => a.previewUrl ?? a.downloadUrl)
    const allImageSrcs = [...legacyImgSrcs, ...attachmentSrcs]
    const hasText = textHtml.length > 0
    const hasImages = allImageSrcs.length > 0

    return (
        <div className="flex gap-2 py-1">
            <UserAvatar
                src={comment.author.avatarUrl ?? undefined}
                name={comment.author.fullName}
                size={32}
                className="shrink-0 mt-0.5"
            />

            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <CommentEditor
                        projectId={projectId}
                        taskId={taskId}
                        placeholder="Chỉnh sửa comment..."
                        onSubmit={(html) => handleSaveEdit(html)}
                        isPending={false}
                        onCancel={() => setIsEditing(false)}
                        initialContent={comment.content}
                        autoFocus
                    />
                ) : (
                    <>
                        {/* Text bubble — chỉ hiện khi có text */}
                        {hasText && (
                            <div className="inline-block max-w-full bg-slate-100 rounded-2xl rounded-tl-sm px-3.5 py-2">
                                <p className="text-[13px] font-bold text-slate-900 mb-0.5 leading-snug">
                                    {comment.author.fullName}
                                </p>
                                <CommentContent html={textHtml} />
                            </div>
                        )}

                        {/* Ảnh — kiểu Zalo */}
                        {hasImages && (
                            <div className={cn(hasText && "mt-1.5")}>
                                {!hasText && (
                                    <p className="text-[13px] font-bold text-slate-900 mb-1">
                                        {comment.author.fullName}
                                    </p>
                                )}
                                <ImageGrid srcs={allImageSrcs} onPreview={setLightboxIndex} />
                                {lightboxIndex !== null && (
                                    <ImageLightbox
                                        src={allImageSrcs[lightboxIndex]}
                                        srcs={allImageSrcs}
                                        index={lightboxIndex}
                                        onClose={() => setLightboxIndex(null)}
                                        onNavigate={setLightboxIndex}
                                    />
                                )}
                            </div>
                        )}

                        {/* Action row */}
                        <div className="flex items-center gap-3 mt-1 ml-1">
                            <span className="text-[11px] text-slate-400">{timeAgo(comment.createdAt)}</span>
                            <button
                                className="text-[12px] font-bold text-slate-500 hover:text-blue-600 transition-colors"
                                onClick={() =>
                                    onReplyClick({
                                        rootCommentId: rootId,
                                        mentionId: comment.author.id,
                                        mentionLabel: comment.author.fullName,
                                    })
                                }
                            >
                                Trả lời
                            </button>
                            {comment.canEdit && (
                                <button
                                    className="text-[12px] font-bold text-slate-500 hover:text-blue-600 transition-colors"
                                    onClick={() => setIsEditing(true)}
                                >
                                    Sửa
                                </button>
                            )}
                            {comment.canDelete && (
                                <button
                                    className="text-[12px] font-bold text-slate-500 hover:text-rose-500 transition-colors"
                                    onClick={() => { if (confirm("Xóa comment này?")) onDelete(comment.id) }}
                                >
                                    Xóa
                                </button>
                            )}
                            {comment.isEdited && (
                                <span className="text-[11px] text-slate-400 italic">đã chỉnh sửa</span>
                            )}
                        </div>
                    </>
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
    const [replyTarget, setReplyTarget] = useState<{
        rootCommentId: string
        mentionId: string
        mentionLabel: string
        token: number
    } | null>(null)

    const {
        comments,
        setComments,
        totalElements,
        isLoading,
        hasMore,
        loadMore,
        addCommentAsync,
        isAddingComment,
        updateComment,
        deleteComment,
    } = useCommentSection(projectId, taskId)

    const handleAddComment = useCallback(async (html: string, files: File[], parentId: string | null) => {
        try {
            const newComment = await addCommentAsync({ content: html, parentId })
            if (files.length > 0) {
                const results = await Promise.allSettled(
                    files.map(file => TaskDetailService.uploadCommentAttachment(projectId, taskId, newComment.id, file))
                )
                const attachments = results
                    .filter((r): r is PromiseFulfilledResult<AttachmentResponse> => r.status === "fulfilled")
                    .map(r => r.value)
                if (attachments.length > 0) {
                    setComments(prev => {
                        const update = (list: CommentResponse[]): CommentResponse[] =>
                            list.map(c => {
                                if (c.id === newComment.id) return { ...c, attachments }
                                if (c.replies?.length) return { ...c, replies: update(c.replies) }
                                return c
                            })
                        return update(prev)
                    })
                }
            }
        } catch {
            // error handled by mutation
        }
    }, [addCommentAsync, projectId, taskId, setComments])

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
        <div className="flex flex-col">
            <div className="overflow-y-auto hide-scrollbar pr-1 pb-3" style={{ maxHeight: comments.length === 0 ? undefined : "55vh" }}>
                {/* Comment list */}
                {comments.length === 0 && (
                    <p className="text-[13px] text-slate-400 italic py-2">Chưa có bình luận nào.</p>
                )}

                {comments.length > 0 && (
                    <div className="space-y-0">
                        {comments.map((c) => (
                            <div key={c.id} className="comment-new">
                                <CommentItem
                                    comment={c}
                                    rootId={c.id}
                                    projectId={projectId}
                                    taskId={taskId}
                                    onReplyClick={({ rootCommentId, mentionId, mentionLabel }) =>
                                        setReplyTarget({
                                            rootCommentId,
                                            mentionId,
                                            mentionLabel,
                                            token: Date.now(),
                                        })
                                    }
                                    onUpdate={updateComment}
                                    onDelete={deleteComment}
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
                                                onReplyClick={({ rootCommentId, mentionId, mentionLabel }) =>
                                                    setReplyTarget({
                                                        rootCommentId,
                                                        mentionId,
                                                        mentionLabel,
                                                        token: Date.now(),
                                                    })
                                                }
                                                onUpdate={updateComment}
                                                onDelete={deleteComment}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {hasMore && (
                    <div className="flex justify-center pt-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={loadMore}
                            className="h-7 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                        >
                            Xem thêm bình luận
                        </Button>
                    </div>
                )}
            </div>

            {/* Fixed composer area at bottom of comments pane (FB-like) */}
            <div className="shrink-0 pt-2 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
                {replyTarget && (
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs">
                        <span>Đang trả lời {replyTarget.mentionLabel}</span>
                        <button
                            type="button"
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => setReplyTarget(null)}
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}

                <CommentEditor
                    projectId={projectId}
                    taskId={taskId}
                    onSubmit={(html, files) => {
                        handleAddComment(html, files, replyTarget?.rootCommentId ?? null)
                        setReplyTarget(null)
                    }}
                    isPending={isAddingComment}
                    replyPrefill={replyTarget}
                />
            </div>
        </div>
    )
}
