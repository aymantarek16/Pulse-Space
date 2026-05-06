'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSuggested } from '@/hooks/useFollow';
import { Avatar } from '@/components/ui/Avatar';
import { FollowButton } from '@/components/follow/FollowButton';
import { GlassCard } from '@/components/ui/GlassCard';

export function SuggestedUsers() {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const { users, loading, remove } = useSuggested(user?.uid);

  if (loading || !users.length) return null;

  return (
    <GlassCard padding="none" className="overflow-hidden" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <Sparkles className="w-4 h-4 text-pulse-accent" />
        <span className="text-sm font-semibold text-pulse-text">
          {dir === 'rtl' ? 'مقترح لك' : 'Suggested for you'}
        </span>
      </div>

      {/* Users */}
      <div className="divide-y divide-white/5">
        <AnimatePresence>
          {users.map((u, i) => (
            <motion.div
              key={u.uid}
              initial={{ opacity: 0, x: dir === 'rtl' ? 12 : -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-4 py-3 group"
            >
              <Link href={`/profile/${u.username}`} className="flex-shrink-0">
                <Avatar src={u.avatarUrl} name={u.displayName} size="sm" />
              </Link>

              <Link href={`/profile/${u.username}`} className="flex-1 min-w-0">
                <p className="text-sm font-medium text-pulse-text truncate">{u.displayName}</p>
                <p className="text-xs text-pulse-text-muted truncate">@{u.username}</p>
              </Link>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <FollowButton
                  currentUserId={user?.uid}
                  targetUserId={u.uid}
                  size="sm"
                  onFollowChange={() => remove(u.uid)}
                />
                <button
                  onClick={() => remove(u.uid)}
                  className="p-1 rounded-lg text-pulse-text-muted hover:text-pulse-text opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
