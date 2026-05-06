'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToComments,
  subscribeToReplies,
  addComment,
  deleteComment,
  getReplies,
} from '@/services/comments.service';
import type { Comment } from '@/types';

export function useComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    const unsub = subscribeToComments(
      postId,
      (data) => {
        setComments(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [postId]);

  const add = useCallback(
    async (authorId: string, content: string, parentId?: string) => {
      await addComment(postId, authorId, content, parentId);
    },
    [postId]
  );

  const remove = useCallback(
    async (commentId: string, parentId?: string | null) => {
      await deleteComment(commentId, postId, parentId);
    },
    [postId]
  );

  return { comments, loading, error, add, remove };
}

export function useReplies(commentId: string | null) {
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!commentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getReplies(commentId);
      setReplies(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [commentId]);

  useEffect(() => {
    if (!commentId || !open) return;
    setLoading(true);
    setError(null);
    const unsub = subscribeToReplies(
      commentId,
      (data) => {
        setReplies(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [commentId, open]);

  const toggle = useCallback(async () => {
    if (!open && !replies.length) await load();
    setOpen((o) => !o);
  }, [open, replies.length, load]);

  const openReplies = useCallback(() => {
    setOpen(true);
  }, []);

  return { replies, loading, error, open, toggle, openReplies, reload: load };
}
