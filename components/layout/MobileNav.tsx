'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Bookmark,
  Compass,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  User,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActivity } from '@/contexts/ActivityContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { AnimatePresence, motion } from 'framer-motion';

const primaryItems = [
  { href: '/home', icon: Home, key: 'home' as const },
  { href: '/explore', icon: Compass, key: 'explore' as const },
  { href: '/notifications', icon: Bell, key: 'notifications' as const },
  { href: '/messages', icon: MessageCircle, key: 'messages' as const },
];

const moreItems = [
  { href: '/spaces', icon: Users, key: 'spaces' as const },
  { href: '/saved', icon: Bookmark, key: 'saved' as const },
  { href: '/settings', icon: Settings, key: 'settings' as const },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const { user, signOutUser } = useAuth();
  const { unreadNotifications, unreadMessages } = useActivity();
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const badges: Record<string, number> = {
    '/notifications': unreadNotifications,
    '/messages': unreadMessages,
  };

  const warmRoute = (href: string) => {
    router.prefetch(href);
  };

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const profileItem = user
    ? { href: `/profile/${user.username}`, icon: User, key: 'profile' as const }
    : null;
  const drawerItems = profileItem ? [...moreItems, profileItem] : moreItems;
  const moreLabel = dir === 'rtl' ? '\u0627\u0644\u0645\u0632\u064a\u062f' : 'More';
  const closeLabel = dir === 'rtl' ? '\u0625\u063a\u0644\u0627\u0642' : 'Close';
  const menuTitle = dir === 'rtl' ? '\u0627\u0644\u0642\u0627\u0626\u0645\u0629' : 'Menu';
  const isDrawerItemActive = (href: string, key: string) =>
    key === 'profile'
      ? pathname.startsWith('/profile')
      : pathname === href || pathname.startsWith(`${href}/`);
  const isMoreActive = drawerItems.some((item) => isDrawerItemActive(item.href, item.key));

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOutUser();
      setMoreOpen(false);
      router.replace('/login');
      window.setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }, 350);
    } catch (err) {
      console.error('Logout failed:', err);
      setLoggingOut(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.button
              type="button"
              aria-label={closeLabel}
              className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-3xl border border-white/10 bg-[#07111f]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl scrollbar-hide md:hidden"
              dir={dir}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">{menuTitle}</p>
                  {user && <p className="truncate text-xs text-pulse-text-muted">@{user.username}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text"
                  aria-label={closeLabel}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {user && (
                <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <Avatar src={user.avatarUrl} name={user.displayName} size="sm" ring />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-pulse-text">{user.displayName}</p>
                    <p className="truncate text-xs text-pulse-text-muted">@{user.username}</p>
                  </div>
                </div>
              )}

              <div className="grid gap-1.5">
                {drawerItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isDrawerItemActive(item.href, item.key);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onPointerEnter={() => warmRoute(item.href)}
                      onFocus={() => warmRoute(item.href)}
                      onTouchStart={() => warmRoute(item.href)}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all',
                        isActive
                          ? 'border border-pulse-accent/25 bg-pulse-accent/[0.14] text-pulse-accent'
                          : 'text-pulse-text-muted hover:bg-white/[0.06] hover:text-pulse-text'
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-medium">{t.nav[item.key]}</span>
                    </Link>
                  );
                })}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="mt-1 flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm font-semibold text-red-300 transition-all hover:border-red-500/35 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t.auth.logout}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 start-0 end-0 z-40 border-t border-white/10 bg-pulse-bg/90 backdrop-blur-glass md:hidden" dir={dir}>
        <div className="grid grid-cols-5 items-center gap-1 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
          {primaryItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            const badge = badges[item.href] || 0;
            const isLit = badge > 0 && !isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                onPointerEnter={() => warmRoute(item.href)}
                onFocus={() => warmRoute(item.href)}
                onTouchStart={() => warmRoute(item.href)}
                className="min-w-0"
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className={cn(
                    'flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 transition-all duration-200',
                    isActive
                      ? 'text-pulse-accent'
                      : isLit
                      ? 'text-pulse-accent'
                      : 'text-pulse-text-muted'
                  )}
                >
                  <div className="relative">
                    {isLit && item.href === '/messages' && (
                      <span className="absolute -end-1 -top-1 h-2 w-2 rounded-full bg-pulse-accent shadow-[0_0_12px_rgba(77,214,167,0.8)]" />
                    )}
                    <Icon className="h-5 w-5" />
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -end-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-pulse-accent px-0.5 text-[9px] font-bold text-pulse-bg">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="mobile-nav-dot"
                        className="absolute -bottom-1 start-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-pulse-accent"
                      />
                    )}
                  </div>
                  <span className="max-w-full truncate text-[9px] font-medium leading-none">{t.nav[item.key]}</span>
                </motion.div>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-pulse-text-muted transition-all duration-200',
              isMoreActive && 'text-pulse-accent'
            )}
            aria-label={moreLabel}
            aria-expanded={moreOpen}
          >
            <div className="relative">
              <Menu className="h-5 w-5" />
              {isMoreActive && (
                <motion.div
                  layoutId="mobile-nav-dot"
                  className="absolute -bottom-1 start-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-pulse-accent"
                />
              )}
            </div>
            <span className="max-w-full truncate text-[9px] font-medium leading-none">{moreLabel}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
