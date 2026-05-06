'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  subscribePublicSpaces,
  getUserSpaces,
  getSpace,
  isMember,
  joinSpace,
  leaveSpace,
  getSpaceMembers,
  type SpaceMember,
} from '@/services/spaces.service';
import type { Space } from '@/types';

let publicSpacesCache: Space[] | null = null;
const userSpacesCache = new Map<string, Space[]>();
const singleSpaceCache = new Map<string, Space>();
const membersCache = new Map<string, SpaceMember[]>();

// ─── Public spaces list (real-time) ──────────────────────────────────────────

export function usePublicSpaces() {
  const [spaces, setSpaces] = useState<Space[]>(() => publicSpacesCache || []);
  const [loading, setLoading] = useState(() => !publicSpacesCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicSpacesCache) setLoading(true);
    const unsub = subscribePublicSpaces(
      (data) => {
        publicSpacesCache = data;
        setSpaces(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { spaces, loading, error };
}

// ─── User's own spaces ────────────────────────────────────────────────────────

export function useUserSpaces(userId: string | undefined) {
  const [spaces, setSpaces] = useState<Space[]>(() => (userId ? userSpacesCache.get(userId) || [] : []));
  const [loading, setLoading] = useState(() => (userId ? !userSpacesCache.has(userId) : false));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const cached = userSpacesCache.get(userId);
    if (cached) {
      setSpaces(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    getUserSpaces(userId)
      .then((data) => {
        userSpacesCache.set(userId, data);
        setSpaces(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load user spaces:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return { spaces, loading, error };
}

// ─── Single space ─────────────────────────────────────────────────────────────

export function useSpace(spaceId: string | undefined) {
  const [space, setSpace] = useState<Space | null>(() => (spaceId ? singleSpaceCache.get(spaceId) || null : null));
  const [loading, setLoading] = useState(() => (spaceId ? !singleSpaceCache.has(spaceId) : true));

  useEffect(() => {
    if (!spaceId) return;
    const cached = singleSpaceCache.get(spaceId);
    if (cached) {
      setSpace(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    getSpace(spaceId)
      .then((data) => {
        if (data) singleSpaceCache.set(spaceId, data);
        setSpace(data);
      })
      .finally(() => setLoading(false));
  }, [spaceId]);

  return { space, loading };
}

// ─── Membership toggle ────────────────────────────────────────────────────────

export function useSpaceMembership(
  spaceId: string | undefined,
  userId: string | undefined
) {
  const [member, setMember] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!spaceId || !userId) return;
    isMember(spaceId, userId).then(setMember);
  }, [spaceId, userId]);

  const toggle = useCallback(async () => {
    if (!spaceId || !userId || loading) return;
    setLoading(true);
    const prev = member;
    setMember(!prev);
    try {
      if (prev) await leaveSpace(spaceId, userId);
      else await joinSpace(spaceId, userId);
    } catch {
      setMember(prev);
    } finally {
      setLoading(false);
    }
  }, [spaceId, userId, member, loading]);

  return { member, loading, toggle };
}

// ─── Space members ────────────────────────────────────────────────────────────

export function useSpaceMembers(spaceId: string | undefined) {
  const [members, setMembers] = useState<SpaceMember[]>(() => (spaceId ? membersCache.get(spaceId) || [] : []));
  const [loading, setLoading] = useState(() => (spaceId ? !membersCache.has(spaceId) : false));

  useEffect(() => {
    if (!spaceId) return;
    const cached = membersCache.get(spaceId);
    if (cached) {
      setMembers(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    getSpaceMembers(spaceId)
      .then((data) => {
        membersCache.set(spaceId, data);
        setMembers(data);
      })
      .finally(() => setLoading(false));
  }, [spaceId]);

  return { members, loading };
}
