'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { VoiceCallProvider } from '@/components/calls/VoiceCallProvider';
import { SoundAlerts } from '@/components/common/SoundAlerts';
import { PageTransitionLoader } from '@/components/common/PageTransitionLoader';
import { ActivityProvider } from '@/contexts/ActivityContext';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized, authError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isMessages = pathname?.startsWith('/messages');
  const isChatThread = !!pathname && /^\/messages\/[^/]+/.test(pathname);

  useEffect(() => {
    if (!initialized || loading || authError) return;
    if (!user) {
      router.replace('/login');
      const fallback = window.setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }, 350);
      return () => window.clearTimeout(fallback);
    }
    if (!user.isOnboarded) router.replace('/onboarding');
  }, [user, loading, initialized, authError, router, pathname]);

  useEffect(() => {
    if (!user?.isOnboarded) return;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const prefetchRoutes = () => {
      ['/home', '/explore', '/notifications', '/messages', '/spaces', '/saved', '/settings'].forEach((href) => {
        router.prefetch(href);
      });
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      const idleId = idleWindow.requestIdleCallback(prefetchRoutes, { timeout: 800 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timer = globalThis.setTimeout(prefetchRoutes, 250);
    return () => globalThis.clearTimeout(timer);
  }, [router, user?.isOnboarded]);

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            !
          </div>
          <div>
            <h1 className="text-lg font-semibold text-pulse-text">Could not load your account</h1>
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

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pulse-accent to-pulse-accent-dark animate-pulse-glow flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-white stroke-2">
              <path d="M3 12h4l3-9 4 18 3-9h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-pulse-accent/60 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <RouteLoader label="Redirecting to login..." />;
  }

  return (
    <VoiceCallProvider>
      <ActivityProvider>
        <SoundAlerts />
        <PageTransitionLoader />
        <div className="min-h-screen flex">
          <AppSidebar />

          <main className={`flex-1 md:ms-64 lg:ms-72 ${isMessages ? '' : 'pb-20 md:pb-0'}`}>
            {isMessages ? (
              // Messages gets full height, no container padding
              <div className={`h-[100dvh] md:h-screen ${isChatThread ? '' : 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0'}`}>
                {children}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto px-4 py-6">
                {children}
              </div>
            )}
          </main>

          {!isChatThread && <MobileNav />}
        </div>
      </ActivityProvider>
    </VoiceCallProvider>
  );
}

function RouteLoader({ label }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pulse-accent to-pulse-accent-dark animate-pulse-glow flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-white stroke-2">
            <path d="M3 12h4l3-9 4 18 3-9h4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-pulse-accent/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        {label && <p className="text-xs text-pulse-text-muted">{label}</p>}
      </div>
    </div>
  );
}
