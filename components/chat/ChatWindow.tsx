'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellOff,
  Check,
  Copy,
  MoreVertical,
  Phone,
  Search,
  User as UserIcon,
  Users,
  Video,
  X,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useMessages } from '@/hooks/useChat';
import { useLanguage } from '@/contexts/LanguageContext';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { Avatar } from '@/components/ui/Avatar';
import { useVoiceCall } from '@/components/calls/VoiceCallProvider';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

interface ChatWindowProps {
  conversation: Conversation;
  currentUserId: string;
}

function groupMessages(messages: any[]) {
  return messages.map((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const sameSenderAsPrev = prev?.senderId === msg.senderId;
    const sameSenderAsNext = next?.senderId === msg.senderId;
    return {
      ...msg,
      isFirst: !sameSenderAsPrev,
      isLast: !sameSenderAsNext,
      showAvatar: !sameSenderAsNext,
    };
  });
}

function formatDateSeparator(ts: any, locale: string): string {
  if (!ts) return '';
  try {
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return locale === 'ar' ? 'اليوم' : 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return locale === 'ar' ? 'أمس' : 'Yesterday';
    }
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'long', month: 'short', day: 'numeric',
    });
  } catch { return ''; }
}

export function ChatWindow({ conversation, currentUserId }: ChatWindowProps) {
  const { dir, locale } = useLanguage();
  const { startCall, phase: callPhase } = useVoiceCall();
  const { messages, loading, send, sendMedia, sendSticker, bottomRef } = useMessages(
    conversation.id,
    currentUserId
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const isGroup = conversation.type === 'group';
  const otherUser = conversation.participants?.[0];
  const convName = isGroup
    ? conversation.name
    : otherUser?.displayName || (dir === 'rtl' ? 'مستخدم' : 'User');
  const convAvatar = isGroup ? null : otherUser?.avatarUrl;
  const convUsername = isGroup ? null : otherUser?.username;
  const showOnlineStatus = otherUser?.privacySettings?.showOnlineStatus !== false;
  const canStartCall = !isGroup && !!otherUser && callPhase === 'idle';

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    try {
      setMuted(localStorage.getItem(`muted-chat:${conversation.id}`) === 'true');
    } catch {
      setMuted(false);
    }
  }, [conversation.id]);

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    try {
      localStorage.setItem(`muted-chat:${conversation.id}`, String(nextMuted));
    } catch {}
  };

  const copyConversationName = async () => {
    const value = convUsername ? `@${convUsername}` : convName || '';
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleMessages = normalizedSearch
    ? messages.filter((msg) => msg.content?.toLowerCase().includes(normalizedSearch))
    : messages;
  const grouped = groupMessages(visibleMessages);

  // Date separators
  const withSeparators: Array<{ type: 'msg' | 'sep'; data: any }> = [];
  let lastDate = '';
  grouped.forEach((msg) => {
    try {
      const d = msg.createdAt?.toDate?.();
      const dateStr = d ? d.toDateString() : '';
      if (dateStr && dateStr !== lastDate) {
        withSeparators.push({ type: 'sep', data: { ts: msg.createdAt, key: dateStr } });
        lastDate = dateStr;
      }
    } catch {}
    withSeparators.push({ type: 'msg', data: msg });
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#07111f]/80" dir={dir}>
      {/* Header */}
      <div className="flex h-[4.5rem] flex-shrink-0 items-center gap-3 border-b border-white/10 bg-[#07111f]/90 px-3 shadow-lg shadow-black/10 backdrop-blur-xl sm:px-5">
        <Link
          href="/messages"
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text md:hidden"
          aria-label={dir === 'rtl' ? 'رجوع' : 'Back'}
        >
          <BackIcon className="w-5 h-5" />
        </Link>

        {/* Avatar / group icon */}
        {isGroup ? (
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-pulse-accent/25 to-emerald-400/10">
            <Users className="h-5 w-5 text-pulse-accent/70" />
          </div>
        ) : (
          <Link href={convUsername ? `/profile/${convUsername}` : '#'} className="rounded-full">
            <Avatar src={convAvatar} name={convName || ''} size="md" online={showOnlineStatus} />
          </Link>
        )}

        {/* Name */}
        <div className="flex-1 min-w-0">
          {convUsername ? (
            <Link href={`/profile/${convUsername}`} className="hover:text-pulse-accent transition-colors">
              <p className="truncate text-sm font-semibold text-pulse-text sm:text-base">{convName}</p>
            </Link>
          ) : (
            <p className="truncate text-sm font-semibold text-pulse-text sm:text-base">{convName}</p>
          )}
          {isGroup ? (
            <p className="text-xs text-pulse-text-muted">
              {conversation.participantIds.length} {dir === 'rtl' ? 'أعضاء' : 'members'}
            </p>
          ) : showOnlineStatus ? (
            <p className="flex items-center gap-1 text-xs text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              {dir === 'rtl' ? 'نشط' : 'Active'}
            </p>
          ) : (
            <p className="text-xs text-pulse-text-muted">
              {dir === 'rtl' ? 'الحالة مخفية' : 'Status hidden'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (otherUser) void startCall(conversation.id, otherUser, 'voice');
            }}
            disabled={!canStartCall}
            className="hidden h-10 w-10 items-center justify-center rounded-2xl text-pulse-text-muted transition-all hover:bg-pulse-accent/10 hover:text-pulse-accent disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
            title={dir === 'rtl' ? 'مكالمة صوتية' : 'Voice call'}
            aria-label={dir === 'rtl' ? 'مكالمة صوتية' : 'Voice call'}
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (otherUser) void startCall(conversation.id, otherUser, 'video');
            }}
            disabled={!canStartCall}
            className="hidden h-10 w-10 items-center justify-center rounded-2xl text-pulse-text-muted transition-all hover:bg-pulse-accent/10 hover:text-pulse-accent disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
            title={dir === 'rtl' ? 'مكالمة فيديو' : 'Video call'}
            aria-label={dir === 'rtl' ? 'مكالمة فيديو' : 'Video call'}
          >
            <Video className="w-4 h-4" />
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-pulse-text-muted transition-all hover:bg-white/10 hover:text-pulse-text"
              title={dir === 'rtl' ? 'المزيد' : 'More'}
              aria-label={dir === 'rtl' ? 'المزيد' : 'More'}
              aria-expanded={menuOpen}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute end-0 top-12 z-30 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0c1827]/95 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl">
                {convUsername && (
                  <Link
                    href={`/profile/${convUsername}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-sm text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text"
                  >
                    <UserIcon className="h-4 w-4" />
                    {dir === 'rtl' ? 'عرض الملف الشخصي' : 'View profile'}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-sm text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text"
                >
                  <Search className="h-4 w-4" />
                  {dir === 'rtl' ? 'بحث في الرسائل' : 'Search messages'}
                </button>
                <button
                  type="button"
                  onClick={copyConversationName}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-sm text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                  {copied
                    ? (dir === 'rtl' ? 'تم النسخ' : 'Copied')
                    : (dir === 'rtl' ? 'نسخ الاسم' : 'Copy name')}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-sm text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text"
                >
                  {muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  {muted
                    ? (dir === 'rtl' ? 'إلغاء كتم المحادثة' : 'Unmute chat')
                    : (dir === 'rtl' ? 'كتم المحادثة' : 'Mute chat')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-white/10 bg-[#07111f]/95 px-3 py-2 sm:px-5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pulse-text-muted" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoFocus
              placeholder={dir === 'rtl' ? 'ابحث داخل المحادثة...' : 'Search this chat...'}
              className="h-10 w-full rounded-2xl border border-white/10 bg-white/[0.06] ps-10 pe-3 text-sm text-pulse-text outline-none transition-all placeholder:text-pulse-text-muted/50 focus:border-pulse-accent/40 focus:ring-2 focus:ring-pulse-accent/15"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery('');
            }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text"
            aria-label={dir === 'rtl' ? 'إغلاق البحث' : 'Close search'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#081321] px-3 py-4 scrollbar-hide sm:px-5">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={cn(
                  'flex animate-pulse items-end gap-2',
                  i % 2 === 0 ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div className="h-7 w-7 flex-shrink-0 rounded-full bg-white/10" />
                <div
                  className={cn(
                    'h-10 rounded-2xl bg-white/10',
                    i % 2 === 0 ? 'w-36 bg-pulse-accent/20' : 'w-52 max-w-[68vw]'
                  )}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-pulse-accent/20 bg-pulse-accent/10 shadow-lg shadow-pulse-accent/10">
              <MessageCircle className="h-8 w-8 text-pulse-accent/60" />
            </div>
            <div>
              <p className="mb-1 text-base font-semibold text-pulse-text">
                {dir === 'rtl' ? 'ابدأ المحادثة' : 'Start the conversation'}
              </p>
              <p className="max-w-xs text-sm leading-6 text-pulse-text-muted">
                {dir === 'rtl'
                  ? `أرسل رسالتك الأولى لـ ${convName}`
                  : `Send your first message to ${convName}`}
              </p>
            </div>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.06]">
              <Search className="h-6 w-6 text-pulse-text-muted" />
            </div>
            <p className="text-sm font-semibold text-pulse-text">
              {dir === 'rtl' ? 'لا توجد نتائج' : 'No results'}
            </p>
            <p className="max-w-xs text-xs leading-5 text-pulse-text-muted">
              {dir === 'rtl' ? 'جرّب كلمة مختلفة داخل المحادثة.' : 'Try another word in this chat.'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {withSeparators.map((item, i) =>
              item.type === 'sep' ? (
                <div key={`sep-${item.data.key}`} className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-medium text-pulse-text-muted/80">
                    {formatDateSeparator(item.data.ts, locale)}
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
              ) : (
                <MessageBubble
                  key={item.data.id}
                  message={item.data}
                  isOwn={item.data.senderId === currentUserId}
                  showAvatar={item.data.showAvatar}
                  isFirst={item.data.isFirst}
                  isLast={item.data.isLast}
                />
              )
            )}
          </AnimatePresence>
        )}
        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <ChatInput onSend={send} onSendMedia={sendMedia} onSendSticker={sendSticker} />
      </div>
    </div>
  );
}
