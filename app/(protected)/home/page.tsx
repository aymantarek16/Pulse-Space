'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFollowingIds } from '@/hooks/useFollow';
import { CreatePostBox } from '@/components/feed/CreatePostBox';
import { FollowingFeed } from '@/components/feed/FollowingFeed';

export default function HomePage() {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const { ids: followingIds, loading: followingIdsLoading } = useFollowingIds(user?.uid);

  return (
    <div className="space-y-4" dir={dir}>
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 pb-1"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pulse-accent to-pulse-accent-dark flex items-center justify-center shadow-lg shadow-pulse-accent/30">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-xl font-bold gradient-text">PulseSpace</h1>
      </motion.div>

      {/* Create post */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <CreatePostBox />
      </motion.div>

      {/* Following-only feed */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 border-b border-white/10 px-1 py-3 text-sm font-medium text-pulse-accent"
      >
        <Users className="w-4 h-4" />
        <span>{dir === 'rtl' ? 'منشورات المتابَعين فقط' : 'Following posts only'}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <FollowingFeed followingIds={followingIds} loading={followingIdsLoading} />
      </motion.div>
    </div>
  );
}
