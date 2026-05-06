'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCheck, Download, ExternalLink, FileText, SmilePlus, Trash2, X, ZoomIn } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteMessage,
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
}

function formatTime(ts: any): string {
  if (!ts) return '';
  try {
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function getFileExtension(name?: string) {
  const extension = name?.split('.').pop()?.trim();
  return extension ? extension.slice(0, 5).toUpperCase() : 'FILE';
}

function isSeen(message: Message) {
  return message.readBy?.some((uid) => uid !== message.senderId) ?? false;
}

function ReadReceipt({ message }: { message: Message }) {
  const seen = isSeen(message);

  return (
    <CheckCheck
      className={cn(
        'h-3.5 w-3.5 transition-colors',
        seen ? 'text-emerald-400' : 'text-slate-400'
      )}
      aria-label={seen ? 'Seen' : 'Delivered'}
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
}: MessageBubbleProps) {
  const { user } = useAuth();
  const [hover, setHover] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  useEffect(() => {
    setReactionMap(message.reactions || {});
    const unsubscribe = subscribeToMessageReactions(message.id, setReactionMap);
    return () => unsubscribe();
  }, [message.id]);

  const handleDelete = async () => {
    if (!isOwn) return;
    setDeleting(true);
    try {
      await deleteMessage(message.id);
    } catch {
      setDeleting(false);
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
    if (!user) return null;

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

  const renderDeleteButton = () => {
    if (!isOwn || (!hover && !reactionOpen)) return null;

    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={handleDelete}
        disabled={deleting}
        className="mb-1 rounded-xl p-1.5 text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
        aria-label="Delete message"
      >
        <Trash2 className="w-3 h-3" />
      </motion.button>
    );
  };

  const renderBubbleContent = () => {
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

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'max-w-[78vw] break-words px-3.5 py-2.5 text-sm leading-6 shadow-lg sm:max-w-[30rem]',
          isOwn
            ? cn(
                'bg-gradient-to-br from-pulse-accent to-pulse-accent-dark text-white shadow-pulse-accent/20',
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
      <div
        className={cn('group flex items-end gap-2', isOwn ? 'flex-row-reverse' : 'flex-row', isFirst ? 'mt-3' : 'mt-1')}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => {
          setHover(false);
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
            {isOwn && renderDeleteButton()}
            {!isOwn && renderReactionControl()}
            {renderBubbleContent()}
            {isOwn && renderReactionControl()}
          </div>

        <ReactionSummary reactions={reactionMap} isOwn={isOwn} />

          {message.type === 'text' && isLast && (
            <div className={cn('flex items-center gap-1 mt-1 px-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
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
