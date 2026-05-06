'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSavedPosts } from '@/hooks/usePosts';
import { PostCard } from '@/components/post/PostCard';
import { FeedSkeleton } from '@/components/feed/PostSkeleton';
import { GlassCard } from '@/components/ui/GlassCard';

export default function SavedPage() {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const { posts, loading } = useSavedPosts(user?.uid);

  return (
    <div className="space-y-4" dir={dir}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
        <Bookmark className="w-5 h-5 text-pulse-accent" />
        <h1 className="text-lg font-bold gradient-text">
          {dir === 'rtl' ? 'المحفوظات' : 'Saved Posts'}
        </h1>
      </motion.div>

      {loading ? (
        <FeedSkeleton count={3} />
      ) : posts.length === 0 ? (
        <GlassCard className="text-center py-20">
          <Bookmark className="w-12 h-12 text-pulse-accent/20 mx-auto mb-4" />
          <p className="text-pulse-text font-medium mb-1">
            {dir === 'rtl' ? 'لا توجد منشورات محفوظة' : 'No saved posts yet'}
          </p>
          <p className="text-sm text-pulse-text-muted">
            {dir === 'rtl' ? 'احفظ منشورات لتظهر هنا' : 'Save posts to see them here'}
          </p>
        </GlassCard>
      ) : (
        <AnimatePresence>
          {posts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <PostCard post={post} />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
