'use client';

import { useState, useEffect, useCallback } from 'react';
import { toggleReaction, getUserReaction } from '@/services/reactions.service';
import type { ReactionType } from '@/types';

export function useReaction(
  userId: string | undefined,
  targetId: string,
  initialCount: number,
  targetType: 'post' | 'comment' = 'post'
) {
  const [liked, setLiked] = useState(false);
  const [reaction, setReaction] = useState<ReactionType | null>(null);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!userId || !targetId) return;
    getUserReaction(userId, targetId).then((currentReaction) => {
      setReaction(currentReaction?.type ?? null);
      setLiked(!!currentReaction);
      setInitialized(true);
    });
  }, [userId, targetId]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const toggle = useCallback(
    async (type: ReactionType = 'like') => {
      if (!userId || loading) return;
      setLoading(true);

      // Optimistic update
      const wasLiked = liked;
      const previousReaction = reaction;
      const nextReaction = previousReaction === type ? null : type;
      setReaction(nextReaction);
      setLiked(!!nextReaction);
      setCount((c) => {
        if (!previousReaction && nextReaction) return c + 1;
        if (previousReaction && !nextReaction) return c - 1;
        return c;
      });

      try {
        const result = await toggleReaction(userId, targetId, targetType, type);
        setLiked(result.liked);
        setReaction(result.reaction);
        // count is already set optimistically; Firestore realtime will sync
      } catch {
        // Rollback on error
        setLiked(wasLiked);
        setReaction(previousReaction);
        setCount((c) => {
          if (!previousReaction && nextReaction) return c - 1;
          if (previousReaction && !nextReaction) return c + 1;
          return c;
        });
      } finally {
        setLoading(false);
      }
    },
    [userId, targetId, targetType, liked, reaction, loading]
  );

  return { liked, reaction, count, loading, toggle, initialized };
}
