'use client';

import { useEffect, useState } from 'react';
import { subscribeToUser, getUserByUsername } from '@/services/users.service';
import type { User } from '@/types';

export function useUser(uid: string | undefined) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToUser(uid, (data) => {
      setUser(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  return { user, loading, error };
}

export function useUserByUsername(username: string | undefined) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    setLoading(true);
    setError(null);

    getUserByUsername(username)
      .then((foundUser) => {
        if (cancelled) return;

        setUser(foundUser);
        if (!foundUser) {
          setLoading(false);
          return;
        }

        unsubscribe = subscribeToUser(foundUser.uid, (freshUser) => {
          if (cancelled) return;
          setUser(freshUser);
          setLoading(false);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [username]);

  return { user, loading, error };
}
