"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/common/UserAvatar"
import { useCommentSection, insertReply, removeComment } from "@/hooks/useComments"
import { useAuthStore } from "@/stores/useAuthStore"
import { timeAgo } from "@/components/task-detail/config"
import type { CommentResponse } from "@/app/types/task.schema"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { ProjectMemberService } from "@/app/services/project-member.service"
import { ProjectMember, memberSearchToProjectMember } from "@/app/types/member.schema"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"

// ── Mentions Popover ───────────────────────────────────────

interface MentionsPopoverProps {
    members: ProjectMember[]
    onSelect: (member: ProjectMember) => void
    onClose: () => void
    anchor: { top: number; left: number }
}

function MentionsPopover({ members, onSelect, onClose, anchor }: MentionsPopoverProps) {
    return (
        <div 
            className="fixed z-[999] w-64 bg-background border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-100"
            style={{ top: anchor.top + 20, left: anchor.left }}
        >
            <Command className="rounded-none border-none">
                <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b">
                    Mention someone
                </div>
                <CommandList className="max-h-60 overflow-y-auto custom-scrollbar">
                    <CommandGroup>
                        {members.map(member => (
                            <CommandItem
                                key={member.user?.id || member.id}
                                value={member.user?.fullName || ""}
                                onSelect={() => onSelect(member)}
                                className="flex items-center gap-2 p-2 cursor-pointer"
                            >
                                <UserAvatar src={member.user?.avatarUrl ?? undefined} name={member.user?.fullName || "?"} size={24} />
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">{member.user?.fullName || "Unknown User"}</span>
                                    <span className="text-[10px] text-muted-foreground">@{member.user?.id || member.id}</span>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </div>
    )
}

// ── Comment Editor ─────────────────────────────────────────

interface CommentEditorProps {
    projectId: string
    placeholder?: string
    onSubmit: (markdown: string) => void
    isPending: boolean
    onCancel?: () => void
    initialContent?: string
    autoFocus?: boolean
}

function CommentEditor({
    projectId,
    placeholder,
    onSubmit,
    isPending,
    onCancel,
    initialContent = "",
    autoFocus = false,
}: CommentEditorProps) {
    const [value, setValue] = useState(initialContent)
    const [members, setMembers] = useState<ProjectMember[]>([])
    const [showMentions, setShowMentions] = useState(false)
    const [mentionAnchor, setMentionAnchor] = useState({ top: 0, left: 0 })
    const [mentionSearch, setMentionSearch] = useState("")
    
    const MAX_CHARS = 5000
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)

    useEffect(() => {
        if (!showMentions) return
        const q = mentionSearch
        const t = setTimeout(() => {
            ProjectMemberService.searchMembers(projectId, q)
                .then((rows) => setMembers(rows.map(memberSearchToProjectMember)))
                .catch(() => setMembers([]))
        }, 200)
        return () => clearTimeout(t)
    }, [projectId, showMentions, mentionSearch])

    useEffect(() => setValue(initialContent), [initialContent])
    useEffect(() => {
        if (autoFocus) textareaRef.current?.focus()
    }, [autoFocus])

    const handleSubmit = useCallback(() => {
        const text = value.trim()
        if (!text || text.length > MAX_CHARS) return
        onSubmit(text)
        setValue("")
    }, [value, onSubmit])

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        const pos = e.target.selectionStart
        setValue(val)

        // Simple mention detection
        const textBeforeCursor = val.substring(0, pos)
        const lastAtPos = textBeforeCursor.lastIndexOf("@")
        
        if (lastAtPos !== -1 && (lastAtPos === 0 || textBeforeCursor[lastAtPos - 1] === " ")) {
            const search = textBeforeCursor.substring(lastAtPos + 1)
            if (!search.includes(" ")) {
                setMentionSearch(search)
                setShowMentions(true)
                
                // Position detection (basic)
                const coords = getCaretCoordinates(e.target, pos)
                const rect = e.target.getBoundingClientRect()
                setMentionAnchor({
                    top: rect.top + coords.top - e.target.scrollTop,
                    left: rect.left + coords.left
                })
                return
            }
        }
        setShowMentions(false)
    }

    const handleMentionSelect = (member: ProjectMember) => {
        const pos = textareaRef.current?.selectionStart || 0
        const textBeforeAt = value.substring(0, value.lastIndexOf("@", pos - 1))
        const textAfterCursor = value.substring(pos)
        
        const name = member.user?.fullName || "User"
        const userId = member.user?.id || member.id
        const mentionText = `[@${name}](user:${userId}) `
        setValue(textBeforeAt + mentionText + textAfterCursor)
        setShowMentions(false)
        
        requestAnimationFrame(() => {
            textareaRef.current?.focus()
            const newPos = textBeforeAt.length + mentionText.length
            textareaRef.current?.setSelectionRange(newPos, newPos)
        })
    }

    const filteredMembers = (members || []).filter(m => 
        (m.user?.fullName || "").toLowerCase().includes(mentionSearch.toLowerCase())
    )

    const charCount = value.length
    const isEmpty = value.trim().length === 0
    const tooLong = charCount > MAX_CHARS

    return (
        <div className="space-y-2">
            <div
                className={cn(
                    "rounded-xl border bg-slate-50/50 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50 focus-within:bg-background",
                    tooLong && "border-destructive ring-destructive/20"
                )}
            >
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleTextareaChange}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !showMentions) {
                            e.preventDefault()
                            handleSubmit()
                        }
                        if (e.key === "Escape") setShowMentions(false)
                    }}
                    placeholder={placeholder ?? "Write a comment... (use @ to mention)"}
                    className="w-full min-h-[44px] max-h-40 px-4 py-2 text-sm bg-transparent outline-none resize-none hide-scrollbar"
                />
                
                <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/30 rounded-b-xl">
                    <div className="flex gap-1">
                        {/* Inline Tooltips (Optional icons could go here) */}
                        <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                            tooLong ? "text-rose-500 bg-rose-50" : "text-slate-400 bg-slate-100"
                        )}>
                            {charCount}/{MAX_CHARS}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        {onCancel && (
                            <Button size="sm" variant="ghost" className="h-8 rounded-lg text-xs" onClick={onCancel}>
                                Cancel
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={isEmpty || tooLong || isPending}
                            className="h-8 px-4 rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20 bg-blue-600 hover:bg-blue-700"
                        >
                            {isPending ? "..." : "Send"}
                        </Button>
                    </div>
                </div>
            </div>

            {showMentions && filteredMembers.length > 0 && (
                <MentionsPopover 
                    members={filteredMembers} 
                    onSelect={handleMentionSelect} 
                    onClose={() => setShowMentions(false)}
                    anchor={mentionAnchor}
                />
            )}
        </div>
    )
}

// ── Helpers ────────────────────────────────────────────────

function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
    const div = document.createElement('div')
    const style = window.getComputedStyle(element)
    for (const prop of style) {
        div.style[prop as any] = style[prop as any]
    }
    div.style.position = 'absolute'
    div.style.visibility = 'hidden'
    div.style.whiteSpace = 'pre-wrap'
    div.style.wordWrap = 'break-word'
    
    div.textContent = element.value.substring(0, position)
    const span = document.createElement('span')
    span.textContent = element.value.substring(position) || '.'
    div.appendChild(span)
    
    document.body.appendChild(div)
    const { offsetTop: top, offsetLeft: left } = span
    document.body.removeChild(div)
    
    return { top, left }
}

// ── Comment Item ───────────────────────────────────────────

interface CommentItemProps {
    comment: CommentResponse
    rootId: string
    projectId: string
    onReplyToRoot: (rootCommentId: string, content: string) => void
    onUpdate: (params: { commentId: string; content: string }) => void
    onDelete: (commentId: string) => void
    isAddingComment: boolean
}

function CommentItem({
    comment,
    rootId,
    projectId,
    onReplyToRoot,
    onUpdate,
    onDelete,
    isAddingComment,
}: CommentItemProps) {
    const [isReplying, setIsReplying] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    const handleReply = useCallback(
        (markdown: string) => {
            onReplyToRoot(rootId, markdown)
            setIsReplying(false)
        },
        [onReplyToRoot, rootId]
    )

    const handleSaveEdit = useCallback(
        (markdown: string) => {
            onUpdate({ commentId: comment.id, content: markdown })
            setIsEditing(false)
        },
        [onUpdate, comment.id]
    )

    // Render markdown with Facebook-style mentions
    const renderMarkdown = (content: string) => {
        return (
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw]}
                components={{
                    a: ({ node, ...props }) => {
                        if (props.href?.startsWith('user:')) {
                            return <span className="fb-mention">{props.children}</span>
                        }
                        return <a {...props} className="text-blue-600 hover:underline" />
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        )
    }

    return (
        <div className={cn("group flex gap-3 py-3 px-1 rounded-xl transition-colors hover:bg-slate-50/50", comment.parentId && "ml-4 pl-4 border-l-2 border-slate-100")}>
            <UserAvatar
                src={comment.author.avatarUrl ?? undefined}
                name={comment.author.fullName}
                size={comment.parentId ? 28 : 34}
                className="shrink-0 mt-1 shadow-sm border border-white"
            />

            <div className="flex-1 min-w-0">
                {/* Comment Bubble (FB style) */}
                <div className="inline-block max-w-full bg-[#F0F2F5] dark:bg-slate-800 rounded-2xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 hover:underline cursor-pointer">
                            {comment.author.fullName}
                        </span>
                        {comment.isEdited && (
                            <span className="text-[10px] text-slate-400 font-medium">(edited)</span>
                        )}
                    </div>
                    
                    {isEditing ? (
                        <div className="mt-2 min-w-[300px]">
                            <CommentEditor
                                projectId={projectId}
                                placeholder="Edit comment..."
                                onSubmit={handleSaveEdit}
                                isPending={false}
                                onCancel={() => setIsEditing(false)}
                                initialContent={comment.content}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed comment-content">
                            {renderMarkdown(comment.content)}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {!isEditing && (
                    <div className="flex items-center gap-3 mt-1 ml-2">
                        <span className="text-[11px] text-slate-500">{timeAgo(comment.createdAt)}</span>
                        <button
                            className="text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors"
                            onClick={() => setIsReplying(v => !v)}
                        >
                            Reply
                        </button>
                        {comment.canEdit && (
                            <button
                                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit
                            </button>
                        )}
                        {comment.canDelete && (
                            <button
                                className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                                onClick={() => onDelete(comment.id)}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                )}

                {isReplying && (
                    <div className="mt-3">
                        <CommentEditor
                            projectId={projectId}
                            placeholder={`Reply to @${comment.author.fullName}...`}
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
    const currentUserId = user?.id?.toString() ?? ""

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

    // ── WebSocket real-time ────────────────────────────────
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
                        sub = client.subscribe(
                            `/topic/project/${projectId}`,
                            (msg: any) => {
                                try {
                                    const { event, data } = JSON.parse(msg.body)

                                    if (event === "comment.created") {
                                        const c: CommentResponse = data
                                        if (c.author.id === currentUserId) return
                                        if (c.parentId === null) {
                                            setComments(prev => [c, ...prev])
                                        } else {
                                            setComments(prev =>
                                                insertReply(prev, c.parentId!, c)
                                            )
                                        }
                                    }

                                    if (event === "comment.deleted") {
                                        setComments(prev => removeComment(prev, data.id))
                                    }
                                } catch {}
                            }
                        )
                    },
                    onStompError: () => {},
                })
                client.activate()
            } catch {}
        }

        connect()

        return () => {
            sub?.unsubscribe()
            client?.deactivate()
        }
    }, [projectId, currentUserId, setComments])

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse p-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-10 bg-slate-100 rounded-2xl w-3/4" />
                            <div className="h-3 bg-slate-100 rounded w-20 ml-2" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-10">
            {/* List */}
            {comments.length === 0 ? (
                <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed">
                    <div className="text-3xl mb-2">💬</div>
                    <p className="text-sm font-bold text-slate-900">No comments yet</p>
                    <p className="text-xs text-slate-500">Be the first to share your thoughts!</p>
                </div>
            ) : (
                <div className="space-y-1">
                    <div className="flex items-center justify-between px-2 mb-4">
                        <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            All Comments <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[11px] text-slate-500">{totalElements}</span>
                        </h3>
                    </div>
                    
                    <div className="space-y-1 divide-y divide-slate-100/50">
                        {comments.map(c => (
                            <div key={c.id} className="pt-1">
                                <CommentItem
                                    comment={c}
                                    rootId={c.id}
                                    projectId={projectId}
                                    onReplyToRoot={(rootCommentId, content) => addComment({ content, parentId: rootCommentId })}
                                    onUpdate={updateComment}
                                    onDelete={deleteComment}
                                    isAddingComment={isAddingComment}
                                />

                                {c.replies?.length > 0 && (
                                    <div className="ml-10 space-y-1">
                                        {c.replies.map((reply) => (
                                            <CommentItem
                                                key={reply.id}
                                                comment={reply}
                                                rootId={c.id}
                                                projectId={projectId}
                                                onReplyToRoot={(rootCommentId, content) => addComment({ content, parentId: rootCommentId })}
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
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center pt-4">
                    <Button variant="outline" size="sm" onClick={loadMore} className="rounded-full px-8 text-xs font-bold text-slate-600 border-slate-200">
                        View more comments
                    </Button>
                </div>
            )}

            {/* Input Header (Now at the bottom) */}
            <div className="flex gap-3 px-1 pt-6 border-t border-slate-100">
                <UserAvatar
                    src={user?.avatar?.imageUrl ?? undefined}
                    name={user?.fullName ?? "?"}
                    size={36}
                    className="shrink-0 mt-0.5 border border-white shadow-sm"
                />
                <div className="flex-1 min-w-0">
                    <CommentEditor
                        projectId={projectId}
                        onSubmit={markdown => addComment({ content: markdown, parentId: null })}
                        isPending={isAddingComment}
                    />
                </div>
            </div>
        </div>
    )
}
