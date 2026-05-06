'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, Inbox } from 'lucide-react';
import { useFeed } from '@/hooks/usePosts';
import { useLanguage } from '@/contexts/LanguageContext';
import { PostCard } from '@/components/post/PostCard';
import { FeedSkeleton } from '@/components/feed/PostSkeleton';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';

export function Feed() {
  const { posts, loading, error } = useFeed();
  const { dir } = useLanguage();

  if (loading) return <FeedSkeleton count={4} />;

  if (error) {
    return (
      <GlassCard className="text-center py-12">
        <p className="text-red-400 mb-3">
          {dir === 'rtl' ? 'حدث خطأ في تحميل الفيد' : 'Failed to load feed'}
        </p>
        <Button variant="glass" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 me-1.5" />
          {dir === 'rtl' ? 'إعادة المحاولة' : 'Retry'}
        </Button>
      </GlassCard>
    );
  }

  if (!posts.length) {
    return (
      <GlassCard className="text-center py-16">
        <Inbox className="w-12 h-12 text-pulse-accent/30 mx-auto mb-4" />
        <p className="text-pulse-text font-medium mb-1">
          {dir === 'rtl' ? 'الفيد فارغ' : 'Feed is empty'}
        </p>
        <p className="text-sm text-pulse-text-muted">
          {dir === 'rtl'
            ? 'كن أول من ينشر! أو تابع مستخدمين لرؤية منشوراتهم'
            : 'Be the first to post! Or follow users to see their content'}
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
