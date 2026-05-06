'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowersWithUsers,
  getFollowingWithUsers,
  getFollowing,
} from '@/services/follows.service';
import type { User } from '@/types';

const followersCache = new Map<string, User[]>();
const followingCache = new Map<string, User[]>();
const suggestedCache = new Map<string, User[]>();
const followingIdsCache = new Map<string, string[]>();

// ─── Single follow toggle ─────────────────────────────────────────────────────

export function useFollow(
  currentUserId: string | undefined,
  targetUserId: string | undefined
) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      setInitialized(true);
      return;
    }
    isFollowing(currentUserId, targetUserId).then((val) => {
      setFollowing(val);
      setInitialized(true);
    });
  }, [currentUserId, targetUserId]);

  const toggle = useCallback(async () => {
    if (!currentUserId || !targetUserId || loading) return;
    setLoading(true);

    const prev = following;
    setFollowing(!prev); // optimistic

    try {
      if (prev) {
        await unfollowUser(currentUserId, targetUserId);
      } else {
        await followUser(currentUserId, targetUserId);
      }
    } catch {
      setFollowing(prev); // rollback
    } finally {
      setLoading(false);
    }
  }, [currentUserId, targetUserId, following, loading]);

  return { following, loading, toggle, initialized };
}

// ─── Followers list ───────────────────────────────────────────────────────────

export function useFollowers(userId: string | undefined) {
  const [users, setUsers] = useState<User[]>(() => (userId ? followersCache.get(userId) || [] : []));
  const [loading, setLoading] = useState(() => (userId ? !followersCache.has(userId) : false));

  useEffect(() => {
    if (!userId) return;
    const cached = followersCache.get(userId);
    if (cached) {
      setUsers(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    getFollowersWithUsers(userId)
      .then((data) => {
        followersCache.set(userId, data);
        setUsers(data);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return { users, loading };
}

// ─── Following list ───────────────────────────────────────────────────────────

export function useFollowing(userId: string | undefined) {
  const [users, setUsers] = useState<User[]>(() => (userId ? followingCache.get(userId) || [] : []));
  const [loading, setLoading] = useState(() => (userId ? !followingCache.has(userId) : false));

  useEffect(() => {
    if (!userId) return;
    const cached = followingCache.get(userId);
    if (cached) {
      setUsers(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    getFollowingWithUsers(userId)
      .then((data) => {
        followingCache.set(userId, data);
        setUsers(data);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return { users, loading };
}

// ─── Suggested users ──────────────────────────────────────────────────────────

export function useSuggested(currentUserId: string | undefined) {
  const [users, setUsers] = useState<User[]>(() => (currentUserId ? suggestedCache.get(currentUserId) || [] : []));
  const [loading, setLoading] = useState(() => (currentUserId ? !suggestedCache.has(currentUserId) : false));

  useEffect(() => {
    if (!currentUserId) {
      setUsers([]);
      setLoading(false);
      return;
    }

    suggestedCache.set(currentUserId, []);
    setUsers([]);
    setLoading(false);
  }, [currentUserId]);

  const remove = useCallback((uid: string) => {
    setUsers((prev) => prev.filter((u) => u.uid !== uid));
  }, []);

  return { users, loading, remove };
}

// ─── Following IDs (for feed) ─────────────────────────────────────────────────

export function useFollowingIds(userId: string | undefined) {
  const [ids, setIds] = useState<string[]>(() => (userId ? followingIdsCache.get(userId) || [] : []));
  const [loading, setLoading] = useState(() => (userId ? !followingIdsCache.has(userId) : false));

  useEffect(() => {
    if (!userId) return;
    const cached = followingIdsCache.get(userId);
    if (cached) {
      setIds(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    getFollowing(userId)
      .then((data) => {
        followingIdsCache.set(userId, data);
        setIds(data);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return { ids, loading };
}
