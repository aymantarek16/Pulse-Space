'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const ROOT_AUTH_STALL_MS = 3000;
const ROUTER_FALLBACK_MS = 450;

export default function RootPage() {
  const { user, loading, initialized, authError } = useAuth();
  const router = useRouter();
  const [slowInit, setSlowInit] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlowInit(true), 7000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialized || authError) return;

    const fallback = window.setTimeout(() => {
      if (window.location.pathname === '/') {
        window.location.replace('/login');
      }
    }, ROOT_AUTH_STALL_MS);

    return () => window.clearTimeout(fallback);
  }, [initialized, authError]);

  useEffect(() => {
    if (!initialized || loading || authError) return;

    const target = !user
      ? '/login'
      : !user.isOnboarded
        ? '/onboarding'
        : '/home';

    router.replace(target);

    const fallback = window.setTimeout(() => {
      if (window.location.pathname !== target) {
        window.location.replace(target);
      }
    }, ROUTER_FALLBACK_MS);

    return () => window.clearTimeout(fallback);
  }, [user, loading, initialized, authError, router]);

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            !
          </div>
          <div>
            <h1 className="text-lg font-semibold text-pulse-text">Could not finish sign in</h1>
            <p className="mt-1 text-sm text-pulse-text-muted">{authError}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-10 rounded-xl bg-pulse-accent px-4 text-sm font-medium text-white hover:bg-pulse-accent/90 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (slowInit && (!initialized || loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-4">
          <PulseIcon />
          <div>
            <h1 className="text-lg font-semibold text-pulse-text">Still loading</h1>
            <p className="mt-1 text-sm text-pulse-text-muted">
              The local browser cache may be holding an old app shell.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if ('serviceWorker' in navigator) {
                void navigator.serviceWorker.getRegistrations()
                  .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())));
              }
              if ('caches' in window) {
                void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
              }
              window.location.replace('/login');
            }}
            className="h-10 rounded-xl bg-pulse-accent px-4 text-sm font-medium text-white hover:bg-pulse-accent/90 transition-colors"
          >
            Open login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pulse-accent to-pulse-accent-dark flex items-center justify-center animate-pulse-glow">
          <PulseIcon />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-pulse-accent/60"
              style={{
                animation: 'bounce 0.6s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
      <path
        d="M3 12h4l3-9 4 18 3-9h4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-pulse-bg"
      />
    </svg>
  );
}
