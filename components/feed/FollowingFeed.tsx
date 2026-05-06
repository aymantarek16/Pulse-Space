'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, UserPlus } from 'lucide-react';
import { useFollowingFeed } from '@/hooks/usePosts';
import { useLanguage } from '@/contexts/LanguageContext';
import { PostCard } from '@/components/post/PostCard';
import { FeedSkeleton } from '@/components/feed/PostSkeleton';
import { GlassCard } from '@/components/ui/GlassCard';
import Link from 'next/link';

interface FollowingFeedProps {
  followingIds: string[];
  loading?: boolean;
}

export function FollowingFeed({ followingIds, loading: idsLoading }: FollowingFeedProps) {
  const { posts, loading } = useFollowingFeed(followingIds);
  const { dir } = useLanguage();

  if (idsLoading || loading) return <FeedSkeleton count={3} />;

  if (!followingIds.length) {
    return (
      <GlassCard className="text-center py-16" dir={dir}>
        <Users className="w-14 h-14 text-pulse-accent/20 mx-auto mb-4" />
        <p className="text-pulse-text font-semibold mb-2">
          {dir === 'rtl' ? 'لم تتابع أحداً بعد' : "You're not following anyone yet"}
        </p>
        <p className="text-sm text-pulse-text-muted mb-5">
          {dir === 'rtl'
            ? 'ابحث عن اليوزرنيم مباشرة ثم تابع الشخص لترى منشوراته هنا'
            : 'Search an exact username, then follow that person to see their posts here'}
        </p>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pulse-accent/10 text-pulse-accent border border-pulse-accent/20 text-sm font-medium hover:bg-pulse-accent/20 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {dir === 'rtl' ? 'بحث باليوزرنيم' : 'Search username'}
        </Link>
      </GlassCard>
    );
  }

  if (!posts.length) {
    return (
      <GlassCard className="text-center py-16" dir={dir}>
        <p className="text-pulse-text-muted text-sm">
          {dir === 'rtl'
            ? 'لا توجد منشورات جديدة من المتابَعين'
            : 'No recent posts from people you follow'}
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4" dir={dir}>
      <AnimatePresence mode="popLayout">
        {posts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.06, 0.4) }}
          >
            <PostCard post={post} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
