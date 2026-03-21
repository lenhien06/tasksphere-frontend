"use client"

import { useState, useCallback, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiJava } from "@/lib/axios"
import type { CommentResponse } from "@/app/types/task.schema"

// ── Tree helpers (exported for WebSocket use in CommentsTab) ──

export function insertReply(
    comments: CommentResponse[],
    parentId: string,
    newReply: CommentResponse
): CommentResponse[] {
    return comments.map(c => {
        if (c.id === parentId) {
            return { ...c, replies: [...(c.replies ?? []), newReply] }
        }
        return c
    })
}

export function replaceComment(
    comments: CommentResponse[],
    updated: CommentResponse
): CommentResponse[] {
    return comments.map(c => {
        if (c.id === updated.id) return updated
        if (c.replies?.length) {
            return {
                ...c,
                replies: c.replies.map(r => (r.id === updated.id ? updated : r)),
            }
        }
        return c
    })
}

export function removeComment(
    comments: CommentResponse[],
    id: string
): CommentResponse[] {
    return comments
        .filter(c => c.id !== id)
        .map(c => ({ ...c, replies: (c.replies ?? []).filter(r => r.id !== id) }))
}

// ── API ───────────────────────────────────────────────────

interface CommentsPage {
    content: CommentResponse[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

async function fetchCommentsPage(
    projectId: string,
    taskId: string,
    page: number,
    size = 20
): Promise<CommentsPage> {
    const res = await apiJava.get(
        `/v1/projects/${projectId}/tasks/${taskId}/comments`,
        { params: { page, size, sort: "createdAt,asc" } }
    )
    // Support both { success, data: { content... } } and { data: { content... } }
    const payload = res.data?.data ?? res.data
    return payload
}

// ── Main hook ─────────────────────────────────────────────

export function useCommentSection(projectId: string, taskId: string) {
    const [comments, setComments] = useState<CommentResponse[]>([])
    const [totalElements, setTotalElements] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [currentPage, setCurrentPage] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    // Initial fetch
    useEffect(() => {
        if (!taskId || !projectId) return
        setIsLoading(true)
        fetchCommentsPage(projectId, taskId, 0)
            .then(pg => {
                setComments(pg.content)
                setTotalElements(pg.totalElements)
                setTotalPages(pg.totalPages)
                setCurrentPage(0)
            })
            .catch(() => toast.error("Unable to load comments"))
            .finally(() => setIsLoading(false))
    }, [projectId, taskId])

    // Load more (append)
    const loadMore = useCallback(async () => {
        const nextPage = currentPage + 1
        setIsLoadingMore(true)
        try {
            const pg = await fetchCommentsPage(projectId, taskId, nextPage)
            setComments(prev => [...prev, ...pg.content])
            setCurrentPage(nextPage)
            setTotalPages(pg.totalPages)
            setTotalElements(pg.totalElements)
        } catch {
            toast.error("Unable to load more comments")
        } finally {
            setIsLoadingMore(false)
        }
    }, [projectId, taskId, currentPage])

    // Add comment
    const addCommentMutation = useMutation({
        mutationFn: ({ content, parentId }: { content: string; parentId: string | null }) =>
            apiJava
                .post(`/v1/projects/${projectId}/tasks/${taskId}/comments`, { content, parentId })
                .then(r => (r.data?.data ?? r.data) as CommentResponse),
        onSuccess: newComment => {
            if (newComment.parentId === null) {
                setComments(prev => [...prev, newComment])
                setTotalElements(prev => prev + 1)
            } else {
                setComments(prev => insertReply(prev, newComment.parentId!, newComment))
            }
        },
        onError: (err: any) => {
            const status = err?.response?.status
            if (status === 400) toast.error("Invalid content")
            else toast.error(err?.response?.data?.message ?? "Unable to post comment")
        },
    })

    // Update comment
    const updateCommentMutation = useMutation({
        mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
            apiJava
                .put(`/v1/comments/${commentId}`, { content })
                .then(r => (r.data?.data ?? r.data) as CommentResponse),
        onSuccess: updated => {
            setComments(prev => replaceComment(prev, updated))
        },
        onError: (err: any) => {
            const status = err?.response?.status
            if (status === 403) toast.error("Comments can only be edited within 24 hours of posting")
            else if (status === 404) {
                toast.error("Comment no longer exists")
            } else {
                toast.error(err?.response?.data?.message ?? "Unable to update comment")
            }
        },
    })

    // Delete comment
    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: string) =>
            apiJava.delete(`/v1/comments/${commentId}`).then(() => commentId),
        onSuccess: commentId => {
            setComments(prev => removeComment(prev, commentId))
            setTotalElements(prev => Math.max(0, prev - 1))
        },
        onError: (err: any) => {
            const status = err?.response?.status
            if (status === 403) toast.error("You do not have permission to perform this action")
            else if (status === 404) toast.error("Comment no longer exists")
            else toast.error(err?.response?.data?.message ?? "Unable to delete comment")
        },
    })

    return {
        comments,
        setComments,
        totalElements,
        isLoading,
        isLoadingMore,
        hasMore: currentPage < totalPages - 1,
        loadMore,
        addComment: addCommentMutation.mutate,
        isAddingComment: addCommentMutation.isPending,
        updateComment: updateCommentMutation.mutate,
        isUpdatingComment: updateCommentMutation.isPending,
        deleteComment: deleteCommentMutation.mutate,
    }
}
