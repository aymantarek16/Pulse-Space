'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const ROOT_AUTH_STALL_MS = 3000;
const ROUTER_FALLBACK_MS = 450;
const INSTALLED_LAUNCH_MS = 1600;

export default function RootPage() {
  const { user, loading, initialized, authError } = useAuth();
  const { dir } = useLanguage();
  const router = useRouter();
  const [slowInit, setSlowInit] = useState(false);
  const [standaloneMode, setStandaloneMode] = useState<boolean | null>(null);
  const [launchReady, setLaunchReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlowInit(true), 7000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      nav.standalone === true;

    setStandaloneMode(standalone);

    if (!standalone) {
      setLaunchReady(true);
      return;
    }

    const timer = window.setTimeout(() => setLaunchReady(true), INSTALLED_LAUNCH_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (standaloneMode === null || (standaloneMode && !launchReady)) return;
    if (initialized || authError) return;

    const fallback = window.setTimeout(() => {
      if (window.location.pathname === '/') {
        window.location.replace('/login');
      }
    }, ROOT_AUTH_STALL_MS);

    return () => window.clearTimeout(fallback);
  }, [initialized, authError, launchReady, standaloneMode]);

  useEffect(() => {
    if (standaloneMode === null || (standaloneMode && !launchReady)) return;
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
  }, [user, loading, initialized, authError, router, launchReady, standaloneMode]);

  if (standaloneMode && !launchReady) {
    return <InstalledLaunchScreen dir={dir} />;
  }

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
          <PulseIcon className="w-7 h-7 text-pulse-bg" />
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

function InstalledLaunchScreen({ dir }: { dir: string }) {
  return (
    <main className="relative flex min-h-[100dvh] overflow-hidden bg-[#09130F] px-6 text-pulse-text" dir={dir}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 22%, rgba(77,214,167,0.22), transparent 32%), radial-gradient(circle at 22% 78%, rgba(217,154,66,0.12), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: 'auto, auto, 72px 72px',
        }}
      />
      <div className="absolute inset-x-8 top-10 h-px bg-gradient-to-r from-transparent via-pulse-accent/30 to-transparent" />
      <section className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center justify-center text-center">
        <div className="relative mb-7">
          <div className="absolute inset-0 rounded-[2rem] bg-pulse-accent/30 blur-2xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] border border-pulse-accent/25 bg-[#0B241B] shadow-2xl shadow-pulse-accent/20">
            <PulseIcon className="h-16 w-16 text-pulse-accent" />
          </div>
        </div>
        <p className="text-3xl font-black tracking-normal text-pulse-text">PulseSpace</p>
        <p className="mt-2 text-sm font-medium text-pulse-text-muted">
          {dir === 'rtl' ? 'مساحتك الاجتماعية بتجربة أنيقة' : 'Your social space, refined'}
        </p>
        <div className="mt-8 h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-pulse-accent to-pulse-accent-dark" />
        </div>
      </section>
    </main>
  );
}

function PulseIcon({ className = 'w-7 h-7 text-pulse-bg' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      <path d="M14 36H22L27 21L35 45L41 30H50" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M36 13L25 35H34L30 51L46 27H37L36 13Z" fill="currentColor" />
    </svg>
  );
}
