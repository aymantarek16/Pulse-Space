'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeFeedPosts,
  getUserPosts,
  getSavedPosts,
  getFollowingFeed,
} from '@/services/posts.service';
import type { Post } from '@/types';

let feedPostsCache: Post[] | null = null;
const followingFeedCache = new Map<string, Post[]>();
const userPostsCache = new Map<string, Post[]>();
const savedPostsCache = new Map<string, Post[]>();

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>(() => feedPostsCache || []);
  const [loading, setLoading] = useState(() => !feedPostsCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!feedPostsCache) setLoading(true);
    const unsub = subscribeFeedPosts((data) => {
      feedPostsCache = data;
      setPosts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { posts, loading, error };
}

export function useFollowingFeed(followingIds: string[]) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const key = followingIds.join(',');

  const load = useCallback(async () => {
    if (!followingIds.length) { setPosts([]); return; }
    const cached = followingFeedCache.get(key);
    if (cached) {
      setPosts(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const data = await getFollowingFeed(followingIds);
      followingFeedCache.set(key, data);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => { load(); }, [load]);

  return { posts, loading, refetch: load };
}

export function useUserPosts(userId: string | undefined) {
  const [posts, setPosts] = useState<Post[]>(() => (userId ? userPostsCache.get(userId) || [] : []));
  const [loading, setLoading] = useState(() => (userId ? !userPostsCache.has(userId) : false));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const cached = userPostsCache.get(userId);
    if (cached) {
      setPosts(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getUserPosts(userId);
      userPostsCache.set(userId, data);
      setPosts(data);
    } catch {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  return { posts, loading, error, refetch: load };
}

export function useSavedPosts(userId: string | undefined) {
  const [posts, setPosts] = useState<Post[]>(() => (userId ? savedPostsCache.get(userId) || [] : []));
  const [loading, setLoading] = useState(() => (userId ? !savedPostsCache.has(userId) : false));

  useEffect(() => {
    if (!userId) return;
    const cached = savedPostsCache.get(userId);
    if (cached) {
      setPosts(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    getSavedPosts(userId)
      .then((data) => {
        savedPostsCache.set(userId, data);
        setPosts(data);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return { posts, loading };
}
