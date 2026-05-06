'use client';

import React, { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Trash2,
  Flag,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReaction } from '@/hooks/useReaction';
import { deletePost, savePost, unsavePost, isPostSaved } from '@/services/posts.service';
import { Avatar } from '@/components/ui/Avatar';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn, getExternalUrl } from '@/lib/utils';
import type { Post, ReactionType } from '@/types';

interface PostCardProps {
  post: Post;
  onDeleted?: (postId: string) => void;
  onCommentClick?: (postId: string) => void;
  compact?: boolean;
}

function timeAgo(timestamp: { toDate?: () => Date } | null | undefined, locale: string): string {
  if (!timestamp) return '';
  try {
    const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date();
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (locale === 'ar') {
      if (mins < 1) return 'الآن';
      if (mins < 60) return `${mins} دقيقة`;
      if (hours < 24) return `${hours} ساعة`;
      if (days < 7) return `${days} يوم`;
      return date.toLocaleDateString('ar-EG');
    } else {
      if (mins < 1) return 'now';
      if (mins < 60) return `${mins}m`;
      if (hours < 24) return `${hours}h`;
      if (days < 7) return `${days}d`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch {
    return '';
  }
}

const POST_REACTIONS: Array<{
  type: ReactionType;
  emoji: string;
  label: { ar: string; en: string };
  className: string;
}> = [
  { type: 'like', emoji: '👍', label: { ar: 'أعجبني', en: 'Like' }, className: 'text-sky-400 bg-sky-500/10' },
  { type: 'love', emoji: '❤️', label: { ar: 'أحببته', en: 'Love' }, className: 'text-red-400 bg-red-500/10' },
  { type: 'wow', emoji: '😮', label: { ar: 'واو', en: 'Wow' }, className: 'text-amber-300 bg-amber-400/10' },
  { type: 'haha', emoji: '😂', label: { ar: 'ضحكني', en: 'Haha' }, className: 'text-yellow-300 bg-yellow-400/10' },
  { type: 'angry', emoji: '😡', label: { ar: 'أغضبني', en: 'Angry' }, className: 'text-orange-400 bg-orange-500/10' },
];

function getReactionMeta(type: ReactionType | null | undefined) {
  return POST_REACTIONS.find((reaction) => reaction.type === type) ?? null;
}

export function PostCard({ post, onDeleted, onCommentClick, compact = false }: PostCardProps) {
  const { user } = useAuth();
  const { dir, locale } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const closePickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { liked, reaction: selectedReaction, count: likeCount, toggle: toggleLike } = useReaction(
    user?.uid,
    post.id,
    post.likesCount,
    'post'
  );

  const isOwner = user?.uid === post.authorId;
  const author = post.author;
  const imageUrl = getExternalUrl(post.imageUrl) || getExternalUrl(post.posterUrl);
  const selectedReactionMeta = getReactionMeta(selectedReaction);
  const reactionLabel = selectedReactionMeta?.label[locale === 'ar' ? 'ar' : 'en'];

  const openReactionPicker = useCallback(() => {
    if (closePickerTimer.current) clearTimeout(closePickerTimer.current);
    setReactionPickerOpen(true);
  }, []);

  const closeReactionPickerSoon = useCallback(() => {
    if (closePickerTimer.current) clearTimeout(closePickerTimer.current);
    closePickerTimer.current = setTimeout(() => setReactionPickerOpen(false), 180);
  }, []);

  const handleQuickReaction = useCallback(() => {
    void toggleLike(selectedReaction ?? 'like');
  }, [selectedReaction, toggleLike]);

  const handleReactionSelect = useCallback(
    (type: ReactionType) => {
      setReactionPickerOpen(false);
      void toggleLike(type);
    },
    [toggleLike]
  );

  const handleReactionPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') return;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(openReactionPicker, 420);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleSave = useCallback(async () => {
    if (!user || saveLoading) return;
    setSaveLoading(true);
    try {
      if (saved) {
        await unsavePost(user.uid, post.id);
        setSaved(false);
      } else {
        await savePost(user.uid, post.id);
        setSaved(true);
      }
    } finally {
      setSaveLoading(false);
    }
  }, [user, post.id, saved, saveLoading]);

  const handleDelete = useCallback(async () => {
    if (!user || !isOwner) return;
    setMenuOpen(false);
    try {
      await deletePost(post.id, user.uid);
      setDeleted(true);
      onDeleted?.(post.id);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [user, isOwner, post.id, onDeleted]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'PulseSpace', url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {}
  }, [post.id]);

  if (deleted) return null;

  // Render rich content: highlight hashtags and mentions
  const renderContent = (text: string) => {
    const parts = text.split(/(#[\w\u0600-\u06FF]+|@[\w]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span key={i} className="text-pulse-accent hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      if (part.startsWith('@')) {
        return (
          <Link key={i} href={`/profile/${part.slice(1)}`} className="text-pulse-accent hover:underline">
            {part}
          </Link>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard padding="none" hover className="overflow-hidden group">
        <div className="p-4 space-y-3" dir={dir}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <Link href={`/profile/${author?.username || post.authorId}`} className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar
                src={author?.avatarUrl}
                name={author?.displayName}
                size="md"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-pulse-text text-sm truncate">
                    {author?.displayName || 'Unknown'}
                  </span>
                  {author?.verified && (
                    <span className="w-4 h-4 rounded-full bg-pulse-accent flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white">
                        <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-pulse-text-muted">
                  <span>@{author?.username}</span>
                  <span>·</span>
                  <span>{timeAgo(post.createdAt, locale)}</span>
                </div>
              </div>
            </Link>

            {/* Menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-lg text-pulse-text-muted hover:text-pulse-text hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute end-0 top-8 z-20 min-w-[160px] rounded-xl bg-pulse-surface border border-white/10 shadow-2xl overflow-hidden"
                    >
                      {isOwner && (
                        <button
                          onClick={handleDelete}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {dir === 'rtl' ? 'حذف' : 'Delete'}
                        </button>
                      )}
                      <button
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-pulse-text-muted hover:bg-white/5 transition-colors"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        {dir === 'rtl' ? 'إبلاغ' : 'Report'}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Content */}
          <p className="text-pulse-text leading-relaxed text-sm whitespace-pre-wrap break-words">
            {renderContent(post.content)}
          </p>

          {/* Media grid */}
          {imageUrl && (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-pulse-muted">
              <Image
                src={imageUrl}
                alt=""
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs bg-pulse-accent/10 text-pulse-accent border border-pulse-accent/20"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <div className="flex items-center gap-1">
              {/* Reactions */}
              <div
                className="relative"
                onMouseEnter={openReactionPicker}
                onMouseLeave={closeReactionPickerSoon}
              >
                <AnimatePresence>
                  {reactionPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.86 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.9 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                      className={cn(
                        'absolute bottom-full z-30 mb-2 flex items-center gap-1 rounded-full border border-white/10 bg-[#101b2a]/95 px-2 py-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl',
                        dir === 'rtl' ? 'right-0' : 'left-0'
                      )}
                    >
                      {POST_REACTIONS.map((item, index) => (
                        <motion.button
                          key={item.type}
                          type="button"
                          initial={{ opacity: 0, y: 12, scale: 0.25 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.5 }}
                          transition={{
                            delay: index * 0.035,
                            type: 'spring',
                            stiffness: 520,
                            damping: 18,
                          }}
                          whileHover={{ y: -10, scale: 1.38 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleReactionSelect(item.type)}
                          className={cn(
                            'group relative flex h-10 w-10 items-center justify-center rounded-full text-2xl transition-colors hover:bg-white/10',
                            selectedReaction === item.type && 'bg-white/10'
                          )}
                          aria-label={item.label[locale === 'ar' ? 'ar' : 'en']}
                        >
                          <span className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
                            {item.emoji}
                          </span>
                          <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded-full bg-black/80 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                            {item.label[locale === 'ar' ? 'ar' : 'en']}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleQuickReaction}
                  onPointerDown={handleReactionPointerDown}
                  onPointerUp={clearLongPress}
                  onPointerCancel={clearLongPress}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm transition-all duration-200',
                    selectedReactionMeta
                      ? selectedReactionMeta.className
                      : 'text-pulse-text-muted hover:text-sky-400 hover:bg-sky-500/10'
                  )}
                  aria-label={reactionLabel || (dir === 'rtl' ? 'أعجبني' : 'Like')}
                >
                  <motion.span
                    animate={{ scale: liked ? [1, 1.45, 1] : 1, rotate: liked ? [0, -8, 8, 0] : 0 }}
                    transition={{ duration: 0.34 }}
                    className="text-base leading-none"
                  >
                    {selectedReactionMeta ? selectedReactionMeta.emoji : <Heart className="h-4 w-4" />}
                  </motion.span>
                  <span className="font-medium tabular-nums">{likeCount}</span>
                </motion.button>
              </div>

              {/* Comment */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => {
                  setShowComments((s) => !s);
                  onCommentClick?.(post.id);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm text-pulse-text-muted hover:text-pulse-accent hover:bg-pulse-accent/10 transition-all duration-200"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="font-medium tabular-nums">{post.commentsCount}</span>
              </motion.button>

              {/* Share */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleShare}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm text-pulse-text-muted hover:text-green-400 hover:bg-green-500/10 transition-all duration-200"
              >
                <Share2 className="w-4 h-4" />
                <span className="font-medium tabular-nums">{post.sharesCount}</span>
              </motion.button>
            </div>

            <div className="flex items-center gap-2">
              {/* Views */}
              {post.viewsCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-pulse-text-muted/60">
                  <Eye className="w-3 h-3" />
                  {post.viewsCount}
                </span>
              )}

              {/* Save */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleSave}
                disabled={saveLoading}
                className={cn(
                  'p-1.5 rounded-xl transition-all duration-200',
                  saved
                    ? 'text-pulse-accent bg-pulse-accent/10'
                    : 'text-pulse-text-muted hover:text-pulse-accent hover:bg-pulse-accent/10'
                )}
              >
                <Bookmark className={cn('w-4 h-4', saved && 'fill-current')} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Comment section (inline expand) */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/10"
            >
              <CommentSection postId={post.id} />
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

// ─── Inline Comment Section (imported below) ──────────────────────────────────

import { CommentSection } from '@/components/comments/CommentSection';
