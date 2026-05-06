'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MessageCircle, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  activeId?: string;
  currentUserId: string;
}

function timeShort(ts: any, locale: string): string {
  if (!ts) return '';
  try {
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (locale === 'ar') {
      if (mins < 1) return 'الآن';
      if (mins < 60) return `${mins}د`;
      if (hours < 24) return `${hours}س`;
      if (days < 7) return `${days}ي`;
      return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    }
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export function ConversationList({
  conversations,
  loading,
  activeId,
  currentUserId,
}: ConversationListProps) {
  const { dir, locale } = useLanguage();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => query
      ? conversations.filter((c) => {
        const name =
          c.name ||
          c.participants?.map((p) => p.displayName).join(' ') ||
          '';
        return name.toLowerCase().includes(query.toLowerCase());
      })
      : conversations,
    [conversations, query]
  );

  const getConvName = (conv: Conversation) => {
    if (conv.type === 'group') return conv.name || (dir === 'rtl' ? 'مجموعة' : 'Group');
    return conv.participants?.[0]?.displayName || (dir === 'rtl' ? 'مستخدم' : 'User');
  };

  const getConvAvatar = (conv: Conversation) =>
    conv.type === 'group' ? null : conv.participants?.[0]?.avatarUrl;

  const getLastMsg = (conv: Conversation) => {
    if (!conv.lastMessage) return dir === 'rtl' ? 'ابدأ المحادثة...' : 'Start chatting...';
    const { content, senderId, type } = conv.lastMessage as any;
    const isMine = senderId === currentUserId;
    const prefix = isMine ? (dir === 'rtl' ? 'أنت: ' : 'You: ') : '';
    if (type === 'image') return `${prefix}📷 ${dir === 'rtl' ? 'صورة' : 'Image'}`;
    if (type === 'file') return `${prefix}📎 ${dir === 'rtl' ? 'ملف' : 'File'}`;
    if (type === 'sticker') return `${prefix}${content}`;
    return `${prefix}${content}`;
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col" dir={dir}>
        <div className="border-b border-white/10 p-3">
          <div className="h-10 rounded-2xl bg-white/[0.07] shimmer" />
        </div>
        <div className="space-y-2 p-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 rounded-2xl p-3">
              <div className="h-12 w-12 flex-shrink-0 rounded-full bg-white/10" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-32 rounded-full bg-white/10" />
                <div className="h-2.5 w-full max-w-[11rem] rounded-full bg-white/[0.06]" />
              </div>
              <div className="h-2.5 w-8 rounded-full bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" dir={dir}>
      {/* Search */}
      <div className="border-b border-white/10 bg-[#07111f]/70 p-3 backdrop-blur-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pulse-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dir === 'rtl' ? 'بحث...' : 'Search...'}
            style={{ direction: dir }}
            className="h-10 w-full rounded-2xl border border-white/10 bg-white/[0.07] ps-9 pe-9 text-sm text-pulse-text shadow-inner shadow-black/10 transition-all placeholder:text-pulse-text-muted/50 focus:border-pulse-accent/50 focus:outline-none focus:ring-2 focus:ring-pulse-accent/10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute end-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text"
              aria-label={dir === 'rtl' ? 'مسح البحث' : 'Clear search'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2.5 scrollbar-hide">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-pulse-accent/20 bg-pulse-accent/10">
              <MessageCircle className="h-7 w-7 text-pulse-accent/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-pulse-text">
                {query
                  ? (dir === 'rtl' ? 'لا توجد نتائج' : 'No matching chats')
                  : (dir === 'rtl' ? 'لا توجد محادثات بعد' : 'No conversations yet')}
              </p>
              <p className="text-xs text-pulse-text-muted">
                {query
                  ? (dir === 'rtl' ? 'جرّب اسمًا مختلفًا' : 'Try a different name')
                  : (dir === 'rtl' ? 'ابدأ محادثة جديدة لتظهر هنا' : 'Start a new chat to see it here')}
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((conv, i) => {
              const unreadCount = conv.unreadCount || 0;
              const isUnread = unreadCount > 0;

              return (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, delay: Math.min(i * 0.015, 0.12) }}
                >
                  <Link href={`/messages/${conv.id}`} className="block">
                    <div className={cn(
                      'group relative flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-200',
                      activeId === conv.id
                        ? 'border-pulse-accent/30 bg-pulse-accent/[0.13] shadow-lg shadow-pulse-accent/10'
                        : isUnread
                        ? 'border-pulse-accent/25 bg-pulse-accent/[0.10] shadow-lg shadow-pulse-accent/10 hover:bg-pulse-accent/[0.14]'
                        : 'border-transparent hover:border-white/10 hover:bg-white/[0.06]'
                    )}>
                      {isUnread && activeId !== conv.id && (
                        <span className="absolute inset-0 rounded-2xl bg-pulse-accent/10 animate-pulse" />
                      )}
                      {activeId === conv.id && (
                        <span className="absolute inset-y-3 start-0 w-1 rounded-full bg-pulse-accent" />
                      )}
                      {/* Avatar */}
                      <div className="relative z-10 flex-shrink-0">
                        {conv.type === 'group' ? (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-pulse-accent/25 to-emerald-400/10">
                            <Users className="h-5 w-5 text-pulse-accent/70" />
                          </div>
                        ) : (
                          <Avatar
                            src={getConvAvatar(conv)}
                            name={getConvName(conv)}
                            size="md"
                            online
                          />
                        )}
                        {isUnread && (
                          <span className="absolute -end-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#07111f] bg-pulse-accent shadow-lg shadow-pulse-accent/40" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="relative z-10 flex-1 min-w-0">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className={cn(
                            'truncate text-sm',
                            isUnread ? 'font-bold text-pulse-text' : 'font-semibold text-pulse-text'
                          )}>
                            {getConvName(conv)}
                          </span>
                          <span className={cn(
                            'flex-shrink-0 text-[10px]',
                            isUnread ? 'font-bold text-pulse-accent' : 'text-pulse-text-muted'
                          )}>
                            {timeShort(conv.lastMessageAt, locale)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            'min-w-0 flex-1 truncate text-xs leading-5',
                            isUnread ? 'font-semibold text-pulse-text' : 'text-pulse-text-muted group-hover:text-pulse-text-muted/90'
                          )}>
                            {getLastMsg(conv)}
                          </p>
                          {isUnread && (
                            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-pulse-accent px-1.5 text-[10px] font-bold text-pulse-bg">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
