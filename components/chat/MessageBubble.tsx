'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCheck,
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Forward,
  Loader2,
  Mic,
  MoreVertical,
  SmilePlus,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  editMessage,
  MESSAGE_REACTION_EMOJIS,
  setMessageReaction,
  subscribeToMessageReactions,
} from '@/services/messages.service';
import { cn, getExternalUrl } from '@/lib/utils';
import type { Message, MessageReactionEmoji } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  isFirst: boolean;
  isLast: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (message: Message) => void;
  onStartSelection?: (message: Message) => void;
  onDeleteForMe?: (message: Message) => Promise<void> | void;
  onDeleteForEveryone?: (message: Message) => Promise<void> | void;
  onForward?: (message: Message) => void;
}

function formatTime(ts: any): string {
  if (!ts) return '';
  try {
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function formatDuration(seconds?: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getFileExtension(name?: string) {
  const extension = name?.split('.').pop()?.trim();
  return extension ? extension.slice(0, 5).toUpperCase() : 'FILE';
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('button,a,input,textarea,audio'));
}

function isSeen(message: Message) {
  return message.readBy?.some((uid) => uid !== message.senderId) ?? false;
}

function ReadReceipt({ message }: { message: Message }) {
  const seen = isSeen(message);
  const failed = Boolean(message.sendFailed);

  return (
    <CheckCheck
      className={cn(
        'h-5 w-5 shrink-0 stroke-[2.8] transition-colors',
        failed
          ? 'text-red-400/80'
          : seen
            ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.55)]'
            : 'text-slate-400/70'
      )}
      aria-label={failed ? 'Send failed' : seen ? 'Seen' : 'Delivered'}
    />
  );
}

function getReactionSummary(reactions?: Record<string, MessageReactionEmoji>) {
  const counts = new Map<MessageReactionEmoji, number>();
  const values = Object.values(reactions || {}) as MessageReactionEmoji[];

  values.forEach((emoji) => {
    if (!MESSAGE_REACTION_EMOJIS.includes(emoji)) return;
    counts.set(emoji, (counts.get(emoji) || 0) + 1);
  });

  return MESSAGE_REACTION_EMOJIS
    .map((emoji) => ({ emoji, count: counts.get(emoji) || 0 }))
    .filter((item) => item.count > 0);
}

function ReactionSummary({
  reactions,
  isOwn,
}: {
  reactions?: Record<string, MessageReactionEmoji>;
  isOwn: boolean;
}) {
  const summary = getReactionSummary(reactions);
  const total = summary.reduce((sum, item) => sum + item.count, 0);

  if (!summary.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -3, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        'mt-1 inline-flex max-w-[14rem] items-center gap-1 rounded-full border border-white/10 bg-[#0d1a2a]/95 px-2 py-1 text-[11px] shadow-lg shadow-black/20',
        isOwn ? 'me-2 self-end' : 'ms-2 self-start'
      )}
      title={`${total} reaction${total === 1 ? '' : 's'}`}
    >
      <span className="flex -space-x-1 rtl:space-x-reverse">
        {summary.slice(0, 4).map(({ emoji }) => (
          <span key={emoji} className="leading-none">
            {emoji}
          </span>
        ))}
      </span>
      {total > 1 && <span className="font-semibold text-pulse-text-muted">{total}</span>}
    </motion.div>
  );
}

function ReactionControl({
  currentReaction,
  disabled,
  isOwn,
  open,
  onReact,
  onToggle,
}: {
  currentReaction?: MessageReactionEmoji | null;
  disabled: boolean;
  isOwn: boolean;
  open: boolean;
  onReact: (emoji: MessageReactionEmoji) => void;
  onToggle: () => void;
}) {
  return (
    <div className="relative mb-1">
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.92 }}
          className={cn(
            'absolute bottom-9 z-30 flex items-center gap-1 rounded-full border border-white/10 bg-[#0b1525]/95 p-1.5 shadow-2xl shadow-black/35 backdrop-blur-xl',
            isOwn ? 'end-0' : 'start-0'
          )}
        >
          {MESSAGE_REACTION_EMOJIS.map((emoji) => {
            const active = currentReaction === emoji;

            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                disabled={disabled}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all hover:-translate-y-1 hover:scale-110 active:scale-95 disabled:opacity-50',
                  active ? 'bg-pulse-accent/20 ring-1 ring-pulse-accent/40' : 'hover:bg-white/10'
                )}
                aria-label={`React ${emoji}`}
              >
                {emoji}
              </button>
            );
          })}
        </motion.div>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#0d1a2a]/90 text-pulse-text-muted shadow-lg shadow-black/20 transition-all hover:border-pulse-accent/30 hover:bg-pulse-accent/10 hover:text-pulse-accent disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100',
          (open || currentReaction) && 'opacity-100 text-pulse-accent'
        )}
        aria-label="React to message"
      >
        {currentReaction || <SmilePlus className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  isFirst,
  isLast,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onStartSelection,
  onDeleteForMe,
  onDeleteForEveryone,
  onForward,
}: MessageBubbleProps) {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editDraft, setEditDraft] = useState(message.content);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reactionMap, setReactionMap] = useState<Record<string, MessageReactionEmoji>>(
    message.reactions || {}
  );
  const mediaUrl = getExternalUrl(message.mediaUrl);
  const isDataUrl = mediaUrl?.startsWith('data:') ?? false;
  const currentReaction = user?.uid ? reactionMap[user.uid] : null;
  const attachmentName =
    message.type === 'file'
      ? message.content || `file-${message.id}`
      : `image-${message.id}.jpg`;
  const isLocalMessage = Boolean(message.optimistic || message.id.startsWith('local-'));
  const isDeletedForAll = Boolean(message.deletedForAll);
  const canEditMessage = isOwn && message.type === 'text' && !isDeletedForAll && !isLocalMessage;
  const canDeleteForEveryone = isOwn && !isDeletedForAll && !isLocalMessage && Boolean(onDeleteForEveryone);
  const canOpenActions = !isLocalMessage && !selectionMode;

  useEffect(() => {
    setEditDraft(message.content);
  }, [message.content]);

  useEffect(() => {
    if (!actionsOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActionsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actionsOpen]);

  useEffect(() => {
    setReactionMap(message.reactions || {});
    if (isLocalMessage) return;
    const unsubscribe = subscribeToMessageReactions(message.id, setReactionMap);
    return () => unsubscribe();
  }, [isLocalMessage, message.id, message.reactions]);

  const handleDeleteForMe = async () => {
    if (!user || isLocalMessage || !onDeleteForMe) return;
    setDeleting(true);
    setActionsOpen(false);
    try {
      await onDeleteForMe(message);
    } catch (error) {
      console.error('Could not delete message for me:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!user || !canDeleteForEveryone || !onDeleteForEveryone) return;
    setDeleting(true);
    setActionsOpen(false);
    try {
      await onDeleteForEveryone(message);
    } catch (error) {
      console.error('Could not delete message for everyone:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleForward = () => {
    if (!onForward || isLocalMessage || isDeletedForAll) return;
    setActionsOpen(false);
    onForward(message);
  };

  const handleStartSelection = () => {
    if (!onStartSelection || isLocalMessage) return;
    setActionsOpen(false);
    onStartSelection(message);
  };

  const startEditing = () => {
    if (!canEditMessage) return;
    setEditDraft(message.content);
    setEditing(true);
    setActionsOpen(false);
  };

  const handleEditSubmit = async () => {
    if (!user || !canEditMessage || savingEdit) return;
    const nextContent = editDraft.trim();
    if (!nextContent || nextContent === message.content) {
      setEditing(false);
      setEditDraft(message.content);
      return;
    }

    setSavingEdit(true);
    try {
      await editMessage(message.id, user.uid, nextContent);
      setEditing(false);
    } catch {
      setEditDraft(message.content);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReact = async (emoji: MessageReactionEmoji) => {
    if (!user || reacting) return;
    setReacting(true);
    setReactionOpen(false);
    const previousReactionMap = { ...reactionMap };
    const nextReaction = currentReaction === emoji ? null : emoji;
    setReactionMap((current) => {
      const next = { ...current };
      if (nextReaction) next[user.uid] = nextReaction;
      else delete next[user.uid];
      return next;
    });

    try {
      await setMessageReaction(user.uid, message.id, nextReaction);
    } catch (error) {
      console.error('Could not react to message:', error);
      setReactionMap(previousReactionMap);
    } finally {
      setReacting(false);
    }
  };

  const renderReactionControl = () => {
    if (!user || isLocalMessage || isDeletedForAll || editing) return null;

    return (
      <ReactionControl
        currentReaction={currentReaction}
        disabled={reacting || deleting}
        isOwn={isOwn}
        open={reactionOpen}
        onReact={handleReact}
        onToggle={() => setReactionOpen((open) => !open)}
      />
    );
  };

  const renderActionButton = () => {
    if (!canOpenActions || editing) return null;

    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => {
          setReactionOpen(false);
          setActionsOpen(true);
        }}
        disabled={deleting}
        className={cn(
          'mb-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#0d1a2a]/90 text-pulse-text-muted shadow-lg shadow-black/20 transition-all hover:border-pulse-accent/30 hover:bg-pulse-accent/10 hover:text-pulse-accent disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100',
          actionsOpen && 'border-pulse-accent/35 bg-pulse-accent/10 text-pulse-accent opacity-100'
        )}
        aria-label={dir === 'rtl' ? 'خيارات الرسالة' : 'Message options'}
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreVertical className="h-3.5 w-3.5" />}
      </motion.button>
    );
  };

  const renderSelectionToggle = () => {
    if (!selectionMode || isLocalMessage) return null;

    return (
      <button
        type="button"
        onClick={() => onToggleSelect?.(message)}
        className={cn(
          'mb-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border shadow-lg shadow-black/20 transition-all',
          selected
            ? 'border-pulse-accent bg-pulse-accent text-[#07111f]'
            : 'border-white/15 bg-[#0d1a2a]/95 text-pulse-text-muted hover:border-pulse-accent/35 hover:text-pulse-accent'
        )}
        aria-label={selected ? 'Unselect message' : 'Select message'}
      >
        {selected ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-3.5 w-3.5 rounded-full border border-current" />}
      </button>
    );
  };

  const actionsPortal = typeof document === 'undefined'
    ? null
    : createPortal(
      <AnimatePresence>
        {actionsOpen && (
          <>
            <motion.button
              type="button"
              aria-label={dir === 'rtl' ? 'إغلاق' : 'Close'}
              className="fixed inset-0 z-[9998] bg-black/35 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActionsOpen(false)}
            />
            <motion.div
              role="dialog"
              dir={dir}
              className="fixed inset-x-3 bottom-4 z-[9999] mx-auto max-w-sm overflow-hidden rounded-3xl border border-pulse-accent/20 bg-[#07111f]/95 p-3 shadow-[0_24px_90px_rgba(0,0,0,0.62)] backdrop-blur-2xl sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.16 }}
            >
              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-pulse-text">
                    {dir === 'rtl' ? 'خيارات الرسالة' : 'Message options'}
                  </p>
                  <p className="truncate text-xs text-pulse-text-muted">
                    {isOwn
                      ? (dir === 'rtl' ? 'رسالتك' : 'Your message')
                      : (dir === 'rtl' ? 'رسالة واردة' : 'Incoming message')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActionsOpen(false)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text"
                  aria-label={dir === 'rtl' ? 'إغلاق' : 'Close'}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-1.5">
                {onStartSelection && (
                  <button
                    type="button"
                    onClick={handleStartSelection}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3 text-start text-sm font-semibold text-pulse-text-muted transition-all hover:border-pulse-accent/25 hover:bg-pulse-accent/[0.10] hover:text-pulse-text"
                  >
                    <CheckCircle2 className="h-4 w-4 text-pulse-accent" />
                    {dir === 'rtl' ? 'تحديد الرسالة' : 'Select message'}
                  </button>
                )}
                {canEditMessage && (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3 text-start text-sm font-semibold text-pulse-text-muted transition-all hover:border-pulse-accent/25 hover:bg-pulse-accent/[0.10] hover:text-pulse-text"
                  >
                    <Edit3 className="h-4 w-4 text-pulse-accent" />
                    {dir === 'rtl' ? 'تعديل الرسالة' : 'Edit message'}
                  </button>
                )}
                {onForward && !isDeletedForAll && (
                  <button
                    type="button"
                    onClick={handleForward}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3 text-start text-sm font-semibold text-pulse-text-muted transition-all hover:border-pulse-accent/25 hover:bg-pulse-accent/[0.10] hover:text-pulse-text"
                  >
                    <Forward className="h-4 w-4 text-pulse-accent" />
                    {dir === 'rtl' ? 'إعادة توجيه' : 'Forward'}
                  </button>
                )}
                {onDeleteForMe && (
                  <button
                    type="button"
                    onClick={handleDeleteForMe}
                    disabled={deleting}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3 text-start text-sm font-semibold text-pulse-text-muted transition-all hover:border-red-400/25 hover:bg-red-500/[0.10] hover:text-pulse-text disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 text-red-300" />
                    {dir === 'rtl' ? 'حذف من عندي فقط' : 'Delete for me'}
                  </button>
                )}
                {canDeleteForEveryone && (
                  <button
                    type="button"
                    onClick={handleDeleteForEveryone}
                    disabled={deleting}
                    className="flex w-full items-center gap-3 rounded-2xl border border-red-400/15 bg-red-500/[0.08] px-3 py-3 text-start text-sm font-semibold text-red-200 transition-all hover:border-red-300/35 hover:bg-red-500/[0.14] disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {dir === 'rtl' ? 'حذف من عند الجميع' : 'Delete for everyone'}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );

  const renderBubbleContent = () => {
    if (isDeletedForAll) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={cn(
            'max-w-[78vw] rounded-2xl border border-white/10 bg-white/[0.045] px-3.5 py-2.5 text-sm italic leading-6 text-pulse-text-muted shadow-lg shadow-black/10 sm:max-w-[24rem]',
            isOwn ? 'rounded-ee-md' : 'rounded-es-md'
          )}
        >
          {dir === 'rtl' ? 'تم حذف هذه الرسالة' : 'This message was deleted'}
        </motion.div>
      );
    }

    if (editing && message.type === 'text') {
      return (
        <motion.form
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          onSubmit={(event) => {
            event.preventDefault();
            void handleEditSubmit();
          }}
          className="w-[min(78vw,28rem)] overflow-hidden rounded-3xl border border-pulse-accent/30 bg-[#0b1525]/98 p-2.5 shadow-2xl shadow-pulse-accent/10"
        >
          <textarea
            value={editDraft}
            onChange={(event) => setEditDraft(event.target.value)}
            rows={3}
            autoFocus
            style={{ direction: 'auto' } as unknown as React.CSSProperties}
            className="max-h-40 min-h-20 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm leading-6 text-pulse-text outline-none transition-all placeholder:text-pulse-text-muted/50 focus:border-pulse-accent/40 focus:ring-2 focus:ring-pulse-accent/15"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditDraft(message.content);
              }}
              disabled={savingEdit}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text disabled:opacity-50"
            >
              {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={savingEdit || !editDraft.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-pulse-accent px-3 py-2 text-xs font-bold text-[#07111f] shadow-lg shadow-pulse-accent/20 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {dir === 'rtl' ? 'حفظ' : 'Save'}
            </button>
          </div>
        </motion.form>
      );
    }

    if (message.type === 'sticker') {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: isOwn ? 4 : -4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', bounce: 0.35, duration: 0.35 }}
          className={cn(
            'flex min-h-24 min-w-24 max-w-[11rem] flex-col items-center justify-center rounded-3xl border px-5 py-4 shadow-lg',
            isOwn
              ? 'border-pulse-accent/20 bg-pulse-accent/[0.08] shadow-pulse-accent/10'
              : 'border-white/10 bg-white/[0.06] shadow-black/20'
          )}
          style={{ direction: 'auto' } as unknown as React.CSSProperties}
        >
          <span className="select-none text-6xl leading-none drop-shadow-lg">
            {message.content}
          </span>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-pulse-text-muted">
            <span>{formatTime(message.createdAt)}</span>
            {isOwn && <ReadReceipt message={message} />}
          </div>
        </motion.div>
      );
    }

    if (message.type === 'image' && mediaUrl) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'max-w-[78vw] overflow-hidden border shadow-lg sm:max-w-[22rem]',
            isOwn
              ? 'rounded-3xl rounded-ee-md border-pulse-accent/30 bg-pulse-accent/10 shadow-pulse-accent/10'
              : 'rounded-3xl rounded-es-md border-white/10 bg-white/[0.07] shadow-black/20'
          )}
        >
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="group/media relative block w-full overflow-hidden text-start"
            aria-label="Open image"
          >
            {isDataUrl ? (
              <img src={mediaUrl} alt="Image" className="w-full object-cover" />
            ) : (
              <Image
                src={mediaUrl}
                alt="Image"
                width={352}
                height={248}
                className="w-full object-cover"
              />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover/media:bg-black/25 group-hover/media:opacity-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white shadow-lg">
                <ZoomIn className="h-5 w-5" />
              </span>
            </span>
          </button>
          <div className={cn('flex items-center justify-end gap-1.5 px-3 py-1.5 text-[10px]', isOwn ? 'bg-pulse-accent/[0.15]' : 'bg-white/[0.06]')}>
            <span className="text-pulse-text-muted">{formatTime(message.createdAt)}</span>
            {isOwn && <ReadReceipt message={message} />}
            <a
              href={mediaUrl}
              download={attachmentName}
              onClick={(event) => event.stopPropagation()}
              className="ms-1 flex h-6 w-6 items-center justify-center rounded-lg text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-accent"
              aria-label="Download image"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </div>
        </motion.div>
      );
    }

    if (message.type === 'file' && mediaUrl) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'flex max-w-[78vw] items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg transition-all sm:max-w-[20rem]',
            isOwn
              ? 'border-pulse-accent/30 bg-pulse-accent/[0.15] hover:bg-pulse-accent/25 shadow-pulse-accent/10'
              : 'border-white/10 bg-white/[0.07] hover:bg-white/[0.1] shadow-black/20'
          )}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-pulse-accent/[0.15]">
            <FileText className="h-5 w-5 text-pulse-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-xs font-medium text-pulse-text transition-colors hover:text-pulse-accent"
            >
              {message.content}
            </a>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-pulse-text-muted">
                {getFileExtension(message.content)}
              </span>
              <p className="text-[10px] text-pulse-text-muted">{formatTime(message.createdAt)}</p>
              {isOwn && <ReadReceipt message={message} />}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-accent"
              aria-label="Open file"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href={mediaUrl}
              download={attachmentName}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-accent"
              aria-label="Download file"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      );
    }

    if (message.type === 'audio' && mediaUrl) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={cn(
            'w-[min(78vw,22rem)] overflow-hidden rounded-3xl border px-3 py-3 shadow-lg',
            isOwn
              ? 'rounded-ee-md border-pulse-accent/35 bg-gradient-to-br from-emerald-400/[0.16] to-pulse-accent/[0.08] shadow-pulse-accent/10'
              : 'rounded-es-md border-white/10 bg-white/[0.07] shadow-black/20'
          )}
        >
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-pulse-accent/20 bg-pulse-accent/15 text-pulse-accent shadow-inner shadow-black/20">
              <Mic className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-pulse-text">
                {dir === 'rtl' ? 'رسالة صوتية' : 'Voice message'}
              </p>
              <p className="text-xs text-pulse-text-muted">
                {formatDuration(message.voiceDuration)}
              </p>
            </div>
            {isOwn && <ReadReceipt message={message} />}
          </div>
          <audio
            controls
            preload="metadata"
            src={mediaUrl}
            className="h-9 w-full accent-pulse-accent"
          />
          <div className="mt-2 flex items-center justify-between text-[10px] text-pulse-text-muted">
            <span>{formatTime(message.createdAt)}</span>
            {message.editedAt && <span>{dir === 'rtl' ? 'تم التعديل' : 'Edited'}</span>}
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'max-w-[78vw] break-words border px-3.5 py-2.5 text-sm leading-6 shadow-lg backdrop-blur-sm sm:max-w-[30rem]',
          isOwn
            ? cn(
                'border-pulse-accent/35 bg-gradient-to-br from-[#1cbd83] to-[#0f7c5f] text-white shadow-pulse-accent/20',
                isFirst && isLast && 'rounded-2xl',
                isFirst && !isLast && 'rounded-t-2xl rounded-s-2xl rounded-e-sm',
                !isFirst && !isLast && 'rounded-s-2xl rounded-e-sm',
                !isFirst && isLast && 'rounded-b-2xl rounded-s-2xl rounded-e-sm'
              )
            : cn(
                'border border-white/10 bg-white/[0.08] text-pulse-text shadow-black/20',
                isFirst && isLast && 'rounded-2xl',
                isFirst && !isLast && 'rounded-t-2xl rounded-e-2xl rounded-s-sm',
                !isFirst && !isLast && 'rounded-e-2xl rounded-s-sm',
                !isFirst && isLast && 'rounded-b-2xl rounded-e-2xl rounded-s-sm'
              )
        )}
        style={{ direction: 'auto' } as unknown as React.CSSProperties}
      >
        <span className="whitespace-pre-wrap">{message.content}</span>
      </motion.div>
    );
  };

  return (
    <>
      {actionsPortal}
      <div
        className={cn(
          'group flex items-end gap-2 rounded-3xl px-1 transition-colors',
          (actionsOpen || selected) && 'bg-pulse-accent/[0.06] ring-1 ring-pulse-accent/20',
          isOwn ? 'flex-row-reverse' : 'flex-row',
          isFirst ? 'mt-3' : 'mt-1'
        )}
        onClick={(event) => {
          if (!selectionMode || isInteractiveTarget(event.target)) return;
          onToggleSelect?.(message);
        }}
        onContextMenu={(event) => {
          if (selectionMode) {
            event.preventDefault();
            onToggleSelect?.(message);
            return;
          }
          if (!canOpenActions || editing) return;
          event.preventDefault();
          setActionsOpen(true);
        }}
        onDoubleClick={() => {
          if (selectionMode) {
            onToggleSelect?.(message);
            return;
          }
          if (!canOpenActions || editing) return;
          setActionsOpen(true);
        }}
        onMouseLeave={() => {
          setReactionOpen(false);
        }}
      >
        {showAvatar && !isOwn ? (
          <Avatar src={message.sender?.avatarUrl} name={message.sender?.displayName} size="xs" />
        ) : (
          <div className="w-7 flex-shrink-0" />
        )}

        <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
          {!isOwn && isFirst && message.sender && (
            <span className="text-[11px] text-pulse-accent mb-1 ms-3">
              {message.sender.displayName}
            </span>
          )}

          <div className="flex items-end gap-1.5">
            {selectionMode && isOwn && renderSelectionToggle()}
            {isOwn && renderActionButton()}
            {!isOwn && renderReactionControl()}
            {renderBubbleContent()}
            {isOwn && renderReactionControl()}
            {!isOwn && renderActionButton()}
            {selectionMode && !isOwn && renderSelectionToggle()}
          </div>

        {!isDeletedForAll && <ReactionSummary reactions={reactionMap} isOwn={isOwn} />}

          {message.type === 'text' && isLast && (
            <div className={cn('flex items-center gap-1 mt-1 px-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
              {message.editedAt && !isDeletedForAll && (
                <span className="text-[10px] text-pulse-text-muted/70">
                  {dir === 'rtl' ? 'تم التعديل' : 'Edited'}
                </span>
              )}
              <span className="text-[10px] text-pulse-text-muted">
                {formatTime(message.createdAt)}
              </span>
              {isOwn && <ReadReceipt message={message} />}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {previewOpen && mediaUrl && message.type === 'image' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setPreviewOpen(false)}
          >
            <div className="absolute end-4 top-4 flex items-center gap-2">
              <a
                href={mediaUrl}
                download={attachmentName}
                onClick={(event) => event.stopPropagation()}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Download image"
              >
                <Download className="h-5 w-5" />
              </a>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Close image preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <motion.img
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              src={mediaUrl}
              alt="Image preview"
              className="max-h-[86vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl shadow-black/50"
              onClick={(event) => event.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
