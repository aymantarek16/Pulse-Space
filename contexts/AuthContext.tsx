'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import { getCurrentUser, onAuthChange } from '@/lib/firebase/auth';
import { getUserById, createUserProfile } from '@/services/users.service';
import type { User, AuthState } from '@/types';

interface AuthContextValue extends AuthState {
  firebaseUser: FirebaseUser | null;
  refreshUser: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  firebaseUser: null,
  loading: true,
  initialized: false,
  authError: null,
  refreshUser: async () => {},
});

const AUTH_LOAD_TIMEOUT_MS = 5000;
const AUTH_INIT_WATCHDOG_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadUser = async (fbUser: FirebaseUser) => {
    try {
      setAuthError(null);
      let profile = await withTimeout(
        getUserById(fbUser.uid),
        AUTH_LOAD_TIMEOUT_MS,
        'Profile loading timed out.'
      );

      if (!profile) {
        await withTimeout(
          createUserProfile(fbUser.uid, {
          email: fbUser.email || '',
          displayName: fbUser.displayName || 'PulseSpace User',
          avatarUrl: fbUser.photoURL,
          }),
          AUTH_LOAD_TIMEOUT_MS,
          'Profile creation timed out.'
        );
        profile = await withTimeout(
          getUserById(fbUser.uid),
          AUTH_LOAD_TIMEOUT_MS,
          'Profile loading timed out.'
        );
      }

      setUser(profile);
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setAuthError('Could not load your profile. Please refresh and try again.');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      await loadUser(firebaseUser);
    }
  };

  useEffect(() => {
    let settled = false;

    const finishAuthLoad = async (fbUser: FirebaseUser | null) => {
      setLoading(true);
      setFirebaseUser(fbUser);

      try {
        if (fbUser) {
          await loadUser(fbUser);
        } else {
          setUser(null);
          setAuthError(null);
        }
      } finally {
        settled = true;
        setLoading(false);
        setInitialized(true);
      }
    };

    const unsubscribe = onAuthChange(async (fbUser) => {
      await finishAuthLoad(fbUser);
    });

    const watchdog = window.setTimeout(() => {
      if (!settled) {
        void finishAuthLoad(getCurrentUser());
      }
    }, AUTH_INIT_WATCHDOG_MS);

    return () => {
      settled = true;
      window.clearTimeout(watchdog);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, initialized, authError, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
