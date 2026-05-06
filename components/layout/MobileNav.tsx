'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Compass, Bell, MessageCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActivity } from '@/contexts/ActivityContext';
import { motion } from 'framer-motion';

const items = [
  { href: '/home', icon: Home, key: 'home' as const },
  { href: '/explore', icon: Compass, key: 'explore' as const },
  { href: '/notifications', icon: Bell, key: 'notifications' as const },
  { href: '/messages', icon: MessageCircle, key: 'messages' as const },
  { href: '/spaces', icon: Users, key: 'spaces' as const },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const { unreadNotifications, unreadMessages } = useActivity();

  const badges: Record<string, number> = {
    '/notifications': unreadNotifications,
    '/messages': unreadMessages,
  };

  const warmRoute = (href: string) => {
    router.prefetch(href);
  };

  return (
    <nav className="fixed bottom-0 start-0 end-0 z-40 md:hidden border-t border-white/10 bg-pulse-bg/90 backdrop-blur-glass" dir={dir}>
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const isActive = pathname === item.href;
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
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
                  isActive
                    ? 'text-pulse-accent'
                    : isLit
                    ? 'text-pulse-accent'
                    : 'text-pulse-text-muted'
                )}
              >
                <div className="relative">
                  {isLit && item.href === '/messages' && (
                    <span className="absolute inset-[-0.45rem] rounded-2xl bg-pulse-accent/10 animate-pulse" />
                  )}
                  <Icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -end-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-pulse-accent text-pulse-bg text-[9px] font-bold flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-dot"
                      className="absolute -bottom-1 start-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-pulse-accent"
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium">{t.nav[item.key]}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
