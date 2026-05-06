'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home, Compass, Bell, MessageCircle, Users,
  User, Settings, Bookmark, Zap, LogOut, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useActivity } from '@/contexts/ActivityContext';
import { logout } from '@/lib/firebase/auth';
import { Avatar } from '@/components/ui/Avatar';

const navItems = [
  { href: '/home', icon: Home, key: 'home' as const },
  { href: '/explore', icon: Compass, key: 'explore' as const },
  { href: '/notifications', icon: Bell, key: 'notifications' as const },
  { href: '/messages', icon: MessageCircle, key: 'messages' as const },
  { href: '/spaces', icon: Users, key: 'spaces' as const },
  { href: '/saved', icon: Bookmark, key: 'saved' as const },
  { href: '/settings', icon: Settings, key: 'settings' as const },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { locale, setLocale, dir } = useLanguage();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const { unreadNotifications: notifCount, unreadMessages } = useActivity();

  const badges: Record<string, number> = {
    '/notifications': notifCount,
    '/messages': unreadMessages,
  };

  const warmRoute = (href: string) => {
    router.prefetch(href);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
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
    <aside
      className="fixed start-0 top-0 h-full w-64 lg:w-72 hidden md:flex flex-col z-40 border-e border-white/10 bg-pulse-bg/80 backdrop-blur-glass"
      dir={dir}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pulse-accent to-pulse-accent-dark flex items-center justify-center shadow-lg shadow-pulse-accent/30 flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg gradient-text">PulseSpace</span>
          <p className="text-[10px] text-pulse-text-muted leading-none mt-0.5">Social Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
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
            >
              <motion.div
                whileHover={{ x: dir === 'rtl' ? -4 : 4 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                  isActive
                    ? 'bg-pulse-accent/[0.15] text-pulse-accent border border-pulse-accent/20'
                    : isLit
                    ? 'text-pulse-accent hover:bg-white/5'
                    : 'text-pulse-text-muted hover:text-pulse-text hover:bg-white/5'
                )}
              >
                {isLit && item.href === '/messages' && (
                  <span className="absolute end-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-pulse-accent shadow-[0_0_14px_rgba(77,214,167,0.75)]" />
                )}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute inset-0 rounded-xl bg-pulse-accent/10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative z-10">
                  <Icon className={cn('w-5 h-5 flex-shrink-0', isActive || isLit ? 'text-pulse-accent' : 'text-pulse-text-muted group-hover:text-pulse-text')} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -end-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-pulse-accent text-pulse-bg text-[10px] font-bold flex items-center justify-center">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className={cn('text-sm font-medium relative z-10', isActive ? 'text-pulse-accent' : '')}>
                  {t.nav[item.key]}
                </span>
              </motion.div>
            </Link>
          );
        })}

        {/* Profile */}
        {user && (
          <Link
            href={`/profile/${user.username}`}
            onPointerEnter={() => warmRoute(`/profile/${user.username}`)}
            onFocus={() => warmRoute(`/profile/${user.username}`)}
          >
            <motion.div
              whileHover={{ x: dir === 'rtl' ? -4 : 4 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                pathname.startsWith('/profile')
                  ? 'bg-pulse-accent/[0.15] text-pulse-accent border border-pulse-accent/20'
                  : 'text-pulse-text-muted hover:text-pulse-text hover:bg-white/5'
              )}
            >
              <User className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{t.nav.profile}</span>
            </motion.div>
          </Link>
        )}
      </nav>

      {/* Bottom user card */}
      {user && (
        <div className="border-t border-white/10 p-4 space-y-2">
          <button
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-pulse-text-muted hover:text-pulse-text hover:bg-white/5 transition-all text-sm"
          >
            <Globe className="w-4 h-4" />
            <span>{locale === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <Avatar src={user.avatarUrl} name={user.displayName} size="sm" ring />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-pulse-text truncate">{user.displayName}</p>
              <p className="text-xs text-pulse-text-muted truncate">@{user.username}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-pulse-text-muted hover:text-red-400 transition-colors p-1"
              title={t.auth.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
