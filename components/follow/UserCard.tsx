'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BadgeCheck } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { FollowButton } from '@/components/follow/FollowButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

interface UserCardProps {
  user: User;
  currentUserId?: string;
  compact?: boolean;
  onFollowChange?: (uid: string, following: boolean) => void;
  className?: string;
  index?: number;
}

export function UserCard({
  user,
  currentUserId,
  compact = false,
  onFollowChange,
  className,
  index = 0,
}: UserCardProps) {
  const { dir } = useLanguage();

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cn('flex items-center gap-3 py-3 px-4', className)}
        dir={dir}
      >
        <Link href={`/profile/${user.username}`} className="flex-shrink-0">
          <Avatar src={user.avatarUrl} name={user.displayName} size="md" />
        </Link>

        <Link href={`/profile/${user.username}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-pulse-text truncate">
              {user.displayName}
            </span>
            {user.verified && (
              <BadgeCheck className="w-3.5 h-3.5 text-pulse-accent flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-pulse-text-muted truncate">@{user.username}</p>
        </Link>

        <FollowButton
          currentUserId={currentUserId}
          targetUserId={user.uid}
          size="sm"
          onFollowChange={(f) => onFollowChange?.(user.uid, f)}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <GlassCard hover className={cn('flex items-start gap-4', className)} dir={dir}>
        <Link href={`/profile/${user.username}`} className="flex-shrink-0">
          <Avatar src={user.avatarUrl} name={user.displayName} size="lg" />
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={`/profile/${user.username}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-bold text-pulse-text hover:text-pulse-accent transition-colors">
                {user.displayName}
              </span>
              {user.verified && (
                <BadgeCheck className="w-4 h-4 text-pulse-accent flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-pulse-accent mb-1">@{user.username}</p>
          </Link>

          {user.bio && (
            <p className="text-sm text-pulse-text-muted line-clamp-2 mb-3">{user.bio}</p>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-pulse-text-muted">
              <span>
                <strong className="text-pulse-text">{user.followersCount}</strong>{' '}
                {dir === 'rtl' ? 'متابع' : 'followers'}
              </span>
              <span>
                <strong className="text-pulse-text">{user.postsCount}</strong>{' '}
                {dir === 'rtl' ? 'منشور' : 'posts'}
              </span>
            </div>

            <FollowButton
              currentUserId={currentUserId}
              targetUserId={user.uid}
              size="sm"
              onFollowChange={(f) => onFollowChange?.(user.uid, f)}
            />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── User List (used in followers/following pages) ────────────────────────────

interface UserListProps {
  users: User[];
  currentUserId?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export function UserList({ users, currentUserId, loading, emptyMessage }: UserListProps) {
  const { dir } = useLanguage();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-white/10 rounded-full w-28" />
              <div className="h-2.5 bg-white/5 rounded-full w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!users.length) {
    return (
      <div className="text-center py-16 text-pulse-text-muted text-sm" dir={dir}>
        {emptyMessage || (dir === 'rtl' ? 'لا يوجد مستخدمون' : 'No users found')}
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
      {users.map((user, i) => (
        <UserCard
          key={user.uid}
          user={user}
          currentUserId={currentUserId}
          compact
          index={i}
        />
      ))}
    </div>
  );
}
