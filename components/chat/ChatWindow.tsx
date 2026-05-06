'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellOff,
  Check,
  Copy,
  Forward,
  Loader2,
  MoreVertical,
  Phone,
  Search,
  Trash2,
  User as UserIcon,
  Users,
  Video,
  X,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useConversations, useMessages } from '@/hooks/useChat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActivity } from '@/contexts/ActivityContext';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { Avatar } from '@/components/ui/Avatar';
import { useVoiceCall } from '@/components/calls/VoiceCallProvider';
import {
  deleteMessagesForEveryone,
  deleteMessagesForMe,
  forwardMessages,
} from '@/services/messages.service';
import { cn } from '@/lib/utils';
import type { Conversation, Message } from '@/types';

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
  const {
    setActiveConversationId,
    markConversationRead: markActiveConversationRead,
  } = useActivity();
  const lastMessageId = conversation.lastMessage?.id ?? null;
  const handleConversationRead = useCallback(
    (conversationId: string) => markActiveConversationRead(conversationId, lastMessageId),
    [lastMessageId, markActiveConversationRead]
  );
  const { messages, loading, send, sendMedia, sendSticker, hideMessagesLocally, bottomRef } = useMessages(
    conversation.id,
    currentUserId,
    handleConversationRead
  );
  const { conversations: forwardConversations } = useConversations(currentUserId);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 72, left: 12, width: 288 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
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
  const selectionMode = selectedMessageIds.size > 0;
  const selectedMessages = messages.filter((message) => selectedMessageIds.has(message.id));
  const selectedIds = selectedMessages.map((message) => message.id);
  const canDeleteSelectedForEveryone =
    selectedMessages.length > 0 &&
    selectedMessages.every((message) => message.senderId === currentUserId && !message.deletedForAll);
  const forwardTargets = forwardConversations.filter((item) => item.id !== conversation.id);

  const toggleMessageSelection = useCallback((message: Message) => {
    if (message.optimistic || message.deletedForAll) return;
    setSelectedMessageIds((current) => {
      const next = new Set(current);
      if (next.has(message.id)) next.delete(message.id);
      else next.add(message.id);
      return next;
    });
  }, []);

  const startMessageSelection = useCallback((message: Message) => {
    if (message.optimistic || message.deletedForAll) return;
    setSelectedMessageIds(new Set([message.id]));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMessageIds(new Set());
    setForwardOpen(false);
  }, []);

  useEffect(() => {
    setActiveConversationId(conversation.id);
    return () => setActiveConversationId(null);
  }, [conversation.id, setActiveConversationId]);

  const positionMenu = useCallback(() => {
    const rect = menuButtonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const width = Math.min(288, window.innerWidth - 24);
    const rawLeft = dir === 'rtl' ? rect.left : rect.right - width;
    const left = Math.min(Math.max(rawLeft, 12), window.innerWidth - width - 12);
    const top = Math.min(rect.bottom + 10, Math.max(12, window.innerHeight - 320));

    setMenuPosition({ top, left, width });
  }, [dir]);

  const toggleMenu = () => {
    if (!menuOpen) positionMenu();
    setMenuOpen((open) => !open);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const handleReposition = () => positionMenu();

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, positionMenu]);

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

  const deleteForMe = useCallback(
    async (items: Message[]) => {
      const ids = items.map((message) => message.id).filter(Boolean);
      if (!ids.length || bulkBusy) return;

      setBulkBusy(true);
      hideMessagesLocally(ids);
      setSelectedMessageIds(new Set());
      try {
        await deleteMessagesForMe(ids, currentUserId);
      } catch (error) {
        console.error('Could not delete selected messages for me:', error);
      } finally {
        setBulkBusy(false);
      }
    },
    [bulkBusy, currentUserId, hideMessagesLocally]
  );

  const deleteForEveryone = useCallback(
    async (items: Message[]) => {
      const ids = items
        .filter((message) => message.senderId === currentUserId && !message.deletedForAll)
        .map((message) => message.id)
        .filter(Boolean);
      if (!ids.length || bulkBusy) return;

      setBulkBusy(true);
      hideMessagesLocally(ids);
      setSelectedMessageIds(new Set());
      try {
        await deleteMessagesForEveryone(ids, currentUserId);
      } catch (error) {
        console.error('Could not delete selected messages for everyone:', error);
      } finally {
        setBulkBusy(false);
      }
    },
    [bulkBusy, currentUserId, hideMessagesLocally]
  );

  const openForwardForMessages = useCallback((items: Message[]) => {
    const ids = items
      .filter((message) => !message.optimistic && !message.deletedForAll)
      .map((message) => message.id);
    if (!ids.length) return;
    setSelectedMessageIds(new Set(ids));
    setForwardOpen(true);
  }, []);

  const forwardSelectedTo = async (targetConversationId: string) => {
    if (!selectedIds.length || bulkBusy) return;

    setBulkBusy(true);
    try {
      await forwardMessages(selectedIds, targetConversationId, currentUserId);
      clearSelection();
    } catch (error) {
      console.error('Could not forward selected messages:', error);
    } finally {
      setBulkBusy(false);
    }
  };

  const getConversationName = (item: Conversation) => {
    if (item.type === 'group') return item.name || (dir === 'rtl' ? 'مجموعة' : 'Group');
    return item.participants?.[0]?.displayName || (dir === 'rtl' ? 'محادثة' : 'Conversation');
  };

  const getConversationSubtitle = (item: Conversation) => {
    if (item.type === 'group') {
      return `${item.participantIds.length} ${dir === 'rtl' ? 'أعضاء' : 'members'}`;
    }
    const username = item.participants?.[0]?.username;
    return username ? `@${username}` : (dir === 'rtl' ? 'رسائل خاصة' : 'Direct messages');
  };

  const menuActionClass =
    'flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3 text-start text-sm font-medium text-pulse-text-muted shadow-inner shadow-black/10 transition-all hover:border-pulse-accent/25 hover:bg-pulse-accent/[0.10] hover:text-pulse-text';

  const renderMenuActions = () => (
    <>
      {convUsername && (
        <Link
          href={`/profile/${convUsername}`}
          onClick={() => setMenuOpen(false)}
          className={menuActionClass}
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
        className={menuActionClass}
      >
        <Search className="h-4 w-4" />
        {dir === 'rtl' ? 'بحث في الرسائل' : 'Search messages'}
      </button>
      <button
        type="button"
        onClick={copyConversationName}
        className={menuActionClass}
      >
        {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
        {copied
          ? (dir === 'rtl' ? 'تم النسخ' : 'Copied')
          : (dir === 'rtl' ? 'نسخ الاسم' : 'Copy name')}
      </button>
      <button
        type="button"
        onClick={toggleMute}
        className={menuActionClass}
      >
        {muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        {muted
          ? (dir === 'rtl' ? 'إلغاء كتم المحادثة' : 'Unmute chat')
          : (dir === 'rtl' ? 'كتم المحادثة' : 'Mute chat')}
      </button>
    </>
  );

  const menuPortal = typeof document === 'undefined'
    ? null
    : createPortal(
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              aria-label={dir === 'rtl' ? '\u0625\u063a\u0644\u0627\u0642' : 'Close'}
              className="fixed inset-0 z-[9998] bg-black/35 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              role="menu"
              dir={dir}
              className="fixed z-[9999] overflow-hidden rounded-3xl border border-pulse-accent/20 bg-[#07111f]/95 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.58)] backdrop-blur-2xl"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
                maxWidth: 'calc(100vw - 24px)',
              }}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.16 }}
            >
              <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                {isGroup ? (
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-pulse-accent/20 bg-pulse-accent/10 text-pulse-accent">
                    <Users className="h-5 w-5" />
                  </span>
                ) : (
                  <Avatar src={convAvatar} name={convName || ''} size="sm" online={showOnlineStatus} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-pulse-text">{convName}</p>
                  <p className="truncate text-xs text-pulse-text-muted">
                    {dir === 'rtl' ? '\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629' : 'Chat actions'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text"
                  aria-label={dir === 'rtl' ? '\u0625\u063a\u0644\u0627\u0642' : 'Close'}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-1.5">
                {renderMenuActions()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );

  const forwardPortal = typeof document === 'undefined'
    ? null
    : createPortal(
      <AnimatePresence>
        {forwardOpen && (
          <>
            <motion.button
              type="button"
              aria-label={dir === 'rtl' ? 'إغلاق' : 'Close'}
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setForwardOpen(false)}
            />
            <motion.div
              role="dialog"
              dir={dir}
              className="fixed inset-x-3 bottom-4 z-[9999] mx-auto max-h-[76vh] max-w-md overflow-hidden rounded-3xl border border-pulse-accent/20 bg-[#07111f]/95 p-3 shadow-[0_24px_90px_rgba(0,0,0,0.62)] backdrop-blur-2xl sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.16 }}
            >
              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-pulse-text">
                    {dir === 'rtl' ? 'إعادة توجيه الرسائل' : 'Forward messages'}
                  </p>
                  <p className="truncate text-xs text-pulse-text-muted">
                    {selectedIds.length} {dir === 'rtl' ? 'رسائل محددة' : 'selected messages'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForwardOpen(false)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text"
                  aria-label={dir === 'rtl' ? 'إغلاق' : 'Close'}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[56vh] space-y-1.5 overflow-y-auto pr-1 scrollbar-hide">
                {forwardTargets.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-center text-sm text-pulse-text-muted">
                    {dir === 'rtl' ? 'لا توجد محادثات أخرى للإرسال إليها.' : 'No other conversations available.'}
                  </div>
                ) : (
                  forwardTargets.map((item) => {
                    const targetUser = item.type === 'direct' ? item.participants?.[0] : undefined;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void forwardSelectedTo(item.id)}
                        disabled={bulkBusy}
                        className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3 text-start transition-all hover:border-pulse-accent/25 hover:bg-pulse-accent/[0.10] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {item.type === 'group' ? (
                          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-pulse-accent/20 bg-pulse-accent/10 text-pulse-accent">
                            <Users className="h-5 w-5" />
                          </span>
                        ) : (
                          <Avatar src={targetUser?.avatarUrl} name={getConversationName(item)} size="sm" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-pulse-text">
                            {getConversationName(item)}
                          </span>
                          <span className="block truncate text-xs text-pulse-text-muted">
                            {getConversationSubtitle(item)}
                          </span>
                        </span>
                        {bulkBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin text-pulse-accent" />
                        ) : (
                          <Forward className="h-4 w-4 text-pulse-text-muted" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );

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
      const d =
        typeof msg.createdAt?.toDate === 'function'
          ? msg.createdAt.toDate()
          : msg.createdAt
            ? new Date(msg.createdAt)
            : null;
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
      {menuPortal}
      {forwardPortal}
      {/* Header */}
      <div className="flex h-[4.5rem] flex-shrink-0 items-center gap-2 border-b border-white/10 bg-[#07111f]/90 px-2 shadow-lg shadow-black/10 backdrop-blur-xl sm:gap-3 sm:px-5">
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
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-pulse-text-muted transition-all hover:bg-pulse-accent/10 hover:text-pulse-accent disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
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
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-pulse-text-muted transition-all hover:bg-pulse-accent/10 hover:text-pulse-accent disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
            title={dir === 'rtl' ? 'مكالمة فيديو' : 'Video call'}
            aria-label={dir === 'rtl' ? 'مكالمة فيديو' : 'Video call'}
          >
            <Video className="w-4 h-4" />
          </button>
          <div ref={menuRef} className="relative">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={toggleMenu}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-pulse-text-muted transition-all hover:bg-white/10 hover:text-pulse-text sm:h-10 sm:w-10"
              title={dir === 'rtl' ? 'المزيد' : 'More'}
              aria-label={dir === 'rtl' ? 'المزيد' : 'More'}
              aria-expanded={menuOpen}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
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

      {selectionMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-pulse-accent/20 bg-[#07111f]/95 px-3 py-2 shadow-lg shadow-black/10 sm:px-5"
        >
          <button
            type="button"
            onClick={clearSelection}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text"
            aria-label={dir === 'rtl' ? 'إلغاء التحديد' : 'Cancel selection'}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="me-auto min-w-0">
            <p className="text-sm font-bold text-pulse-text">
              {selectedIds.length} {dir === 'rtl' ? 'رسائل محددة' : 'selected messages'}
            </p>
            <p className="text-xs text-pulse-text-muted">
              {dir === 'rtl' ? 'اختر إجراء للرسائل المحددة' : 'Choose an action for selected messages'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void deleteForMe(selectedMessages)}
            disabled={bulkBusy}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-400/15 bg-red-500/[0.08] px-3 text-xs font-semibold text-red-200 transition-all hover:bg-red-500/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {dir === 'rtl' ? 'حذف عندي' : 'Delete for me'}
          </button>
          <button
            type="button"
            onClick={() => void deleteForEveryone(selectedMessages)}
            disabled={bulkBusy || !canDeleteSelectedForEveryone}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-400/15 bg-red-500/[0.08] px-3 text-xs font-semibold text-red-200 transition-all hover:bg-red-500/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {dir === 'rtl' ? 'حذف للجميع' : 'Delete everyone'}
          </button>
          <button
            type="button"
            onClick={() => setForwardOpen(true)}
            disabled={bulkBusy || selectedIds.length === 0}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-pulse-accent/20 bg-pulse-accent/[0.10] px-3 text-xs font-semibold text-pulse-accent transition-all hover:bg-pulse-accent/[0.16] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Forward className="h-3.5 w-3.5" />
            {dir === 'rtl' ? 'إعادة توجيه' : 'Forward'}
          </button>
        </motion.div>
      )}

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#081321] px-3 pb-8 pt-4 scrollbar-hide sm:px-5 sm:pb-6">
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
                  selectionMode={selectionMode}
                  selected={selectedMessageIds.has(item.data.id)}
                  onToggleSelect={toggleMessageSelection}
                  onStartSelection={startMessageSelection}
                  onDeleteForMe={(message) => deleteForMe([message])}
                  onDeleteForEveryone={(message) => deleteForEveryone([message])}
                  onForward={(message) => openForwardForMessages([message])}
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
        <ChatInput
          onSend={send}
          onSendMedia={sendMedia}
          onSendSticker={sendSticker}
          disabled={selectionMode || bulkBusy}
        />
      </div>
    </div>
  );
}
