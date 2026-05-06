'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Heart, MessageCircle, UserPlus, AtSign, Users, X,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
  index?: number;
}

const iconMap = {
  follow: { icon: UserPlus, color: 'text-pulse-accent', bg: 'bg-pulse-accent/10' },
  like: { icon: Heart, color: 'text-red-400', bg: 'bg-red-500/10' },
  comment: { icon: MessageCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  reply: { icon: MessageCircle, color: 'text-pulse-accent', bg: 'bg-pulse-accent/10' },
  mention: { icon: AtSign, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  space_invite: { icon: Users, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
};

function getLink(n: Notification): string {
  if (n.type === 'follow') return `/profile/${n.sender?.username || n.senderId}`;
  if (n.targetType === 'post' && n.targetId) return `/post/${n.targetId}`;
  if (n.targetType === 'space' && n.targetId) return `/spaces/${n.targetId}`;
  return '#';
}

function timeAgo(ts: any, locale: string): string {
  if (!ts) return '';
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (locale === 'ar') {
      if (mins < 1) return 'الآن';
      if (mins < 60) return `منذ ${mins} د`;
      if (hours < 24) return `منذ ${hours} س`;
      return `منذ ${days} ي`;
    }
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  } catch { return ''; }
}

export function NotificationItem({ notification: n, onRead, onRemove, index = 0 }: NotificationItemProps) {
  const { dir, locale } = useLanguage();
  const config = iconMap[n.type] || iconMap.like;
  const Icon = config.icon;

  const handleClick = () => {
    if (!n.isRead) onRead(n.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'rtl' ? 16 : -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'relative flex items-start gap-3 px-4 py-3.5 group transition-colors border-b border-white/5 last:border-0',
        !n.isRead ? 'bg-pulse-accent/5 hover:bg-pulse-accent/8' : 'hover:bg-white/5'
      )}
      dir={dir}
    >
      {/* Unread dot */}
      {!n.isRead && (
        <div className="absolute start-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-pulse-accent" />
      )}

      <Link href={getLink(n)} onClick={handleClick} className="flex items-start gap-3 flex-1 min-w-0">
        {/* Avatar + icon badge */}
        <div className="relative flex-shrink-0">
          <Avatar src={n.sender?.avatarUrl} name={n.sender?.displayName} size="md" />
          <div className={cn(
            'absolute -bottom-1 -end-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-pulse-bg',
            config.bg
          )}>
            <Icon className={cn('w-2.5 h-2.5', config.color)} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-pulse-text leading-snug">
            <span className="font-semibold">{n.sender?.displayName || 'مستخدم'}</span>
            {' '}
            <span className="text-pulse-text-muted">{n.message}</span>
          </p>
          <p className="text-xs text-pulse-text-muted/60 mt-0.5">
            {timeAgo(n.createdAt, locale)}
          </p>
        </div>
      </Link>

      {/* Remove button */}
      <button
        onClick={() => onRemove(n.id)}
        className="flex-shrink-0 p-1 rounded-lg text-pulse-text-muted/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
