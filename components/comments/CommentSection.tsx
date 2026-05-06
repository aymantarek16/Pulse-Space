'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Heart, CornerDownRight, ChevronDown, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useComments, useReplies } from '@/hooks/useComments';
import { useReaction } from '@/hooks/useReaction';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import type { Comment } from '@/types';

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const { comments, loading, error, add, remove } = useComments(postId);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [forceOpenReplyId, setForceOpenReplyId] = useState<string | null>(null);

  const placeholder =
    replyTo
      ? (dir === 'rtl' ? `رد على ${replyTo.name}...` : `Reply to ${replyTo.name}...`)
      : (dir === 'rtl' ? 'اكتب تعليقًا...' : 'Write a comment...');

  const handleSubmit = async () => {
    if (!user || !text.trim() || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const parentId = replyTo?.id;
      await add(user.uid, text.trim(), replyTo?.id);
      setText('');
      setReplyTo(null);
      if (parentId) setForceOpenReplyId(parentId);
    } catch (err) {
      console.error('Failed to submit comment:', err);
      setActionError(dir === 'rtl' ? 'تعذر إرسال التعليق. حاول مرة أخرى.' : 'Could not send the comment. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string, parentId?: string | null) => {
    setActionError(null);
    try {
      await remove(commentId, parentId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setActionError(dir === 'rtl' ? 'تعذر حذف التعليق.' : 'Could not delete the comment.');
    }
  };

  return (
    <div className="px-4 py-3 space-y-3" dir={dir}>
      {/* Input */}
      <div className="flex gap-2.5 items-start">
        <Avatar src={user?.avatarUrl} name={user?.displayName} size="sm" />
        <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          {replyTo && (
            <span className="text-xs text-pulse-accent flex-shrink-0">
              @{replyTo.name}
            </span>
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-pulse-text placeholder:text-pulse-text-muted/50 focus:outline-none"
            style={{ direction: dir }}
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="text-pulse-accent disabled:opacity-30 hover:text-pulse-accent/80 transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cancel reply */}
      {replyTo && (
        <button
          onClick={() => setReplyTo(null)}
          className="text-xs text-pulse-text-muted hover:text-pulse-text ms-9 transition-colors"
        >
          {dir === 'rtl' ? 'إلغاء الرد' : 'Cancel reply'}
        </button>
      )}

      {(error || actionError) && (
        <div className="ms-9 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {actionError || (dir === 'rtl' ? 'تعذر تحميل التعليقات. حاول تحديث الصفحة.' : 'Could not load comments. Try refreshing.')}
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3 ms-9">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-white/10 rounded w-24" />
                <div className="h-2.5 bg-white/5 rounded w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-1">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onReply={(id, name) => setReplyTo({ id, name })}
                onDelete={handleDelete}
                forceOpenReplyId={forceOpenReplyId}
                onForceOpenHandled={() => setForceOpenReplyId(null)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── Single Comment ───────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: Comment;
  postId: string;
  onReply: (id: string, name: string) => void;
  onDelete: (id: string, parentId?: string | null) => void;
  isReply?: boolean;
  forceOpenReplyId?: string | null;
  onForceOpenHandled?: () => void;
}

function CommentItem({
  comment,
  postId,
  onReply,
  onDelete,
  isReply = false,
  forceOpenReplyId,
  onForceOpenHandled,
}: CommentItemProps) {
  const { user } = useAuth();
  const { dir, locale } = useLanguage();
  const { liked, count, toggle } = useReaction(user?.uid, comment.id, comment.likesCount, 'comment');
  const {
    replies,
    loading: repliesLoading,
    error: repliesError,
    open,
    toggle: toggleReplies,
    openReplies,
  } = useReplies(
    !isReply ? comment.id : null
  );

  const isOwner = user?.uid === comment.authorId;
  const author = comment.author;

  useEffect(() => {
    if (isReply || forceOpenReplyId !== comment.id || open) return;
    openReplies();
    onForceOpenHandled?.();
  }, [comment.id, forceOpenReplyId, isReply, onForceOpenHandled, open, openReplies]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn('group', isReply ? 'ms-8' : '')}
    >
      <div className="flex gap-2.5 py-2">
        <Avatar src={author?.avatarUrl} name={author?.displayName} size="xs" />
        <div className="flex-1 min-w-0">
          <div className="inline-block bg-white/5 rounded-2xl px-3 py-2 max-w-full">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-semibold text-pulse-text">
                {author?.displayName}
              </span>
              <span className="text-[10px] text-pulse-text-muted">
                @{author?.username}
              </span>
            </div>
            <p className="text-sm text-pulse-text leading-relaxed break-words">
              {comment.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1 ms-1">
            <button
              onClick={() => toggle('like')}
              className={cn(
                'flex items-center gap-1 text-[11px] transition-colors',
                liked ? 'text-red-400' : 'text-pulse-text-muted hover:text-red-400'
              )}
            >
              <Heart className={cn('w-3 h-3', liked && 'fill-current')} />
              {count > 0 && count}
            </button>

            {!isReply && (
              <button
                onClick={() => onReply(comment.id, author?.displayName || 'user')}
                className="text-[11px] text-pulse-text-muted hover:text-pulse-accent transition-colors"
              >
                {dir === 'rtl' ? 'رد' : 'Reply'}
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => onDelete(comment.id, comment.parentId || null)}
                className="text-[11px] text-pulse-text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Replies toggle */}
          {!isReply && comment.repliesCount > 0 && (
            <button
              onClick={toggleReplies}
              className="flex items-center gap-1 mt-1 ms-1 text-[11px] text-pulse-accent hover:text-pulse-accent/80 transition-colors"
            >
              <CornerDownRight className="w-3 h-3" />
              {open
                ? (dir === 'rtl' ? 'إخفاء الردود' : 'Hide replies')
                : (dir === 'rtl' ? `${comment.repliesCount} رد` : `${comment.repliesCount} repl${comment.repliesCount === 1 ? 'y' : 'ies'}`)}
              <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
            </button>
          )}

          {/* Replies list */}
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-1 space-y-0.5"
              >
                {repliesLoading ? (
                  <div className="text-xs text-pulse-text-muted ms-8 py-1">
                    {dir === 'rtl' ? 'جاري التحميل...' : 'Loading...'}
                  </div>
                ) : repliesError ? (
                  <div className="text-xs text-red-300 ms-8 py-1">
                    {dir === 'rtl' ? 'تعذر تحميل الردود.' : 'Could not load replies.'}
                  </div>
                ) : (
                  replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      postId={postId}
                      onReply={onReply}
                      onDelete={onDelete}
                      isReply
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
