'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Globe, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFollowingIds } from '@/hooks/useFollow';
import { useFeed, useFollowingFeed } from '@/hooks/usePosts';
import { CreatePostBox } from '@/components/feed/CreatePostBox';
import { Feed } from '@/components/feed/Feed';
import { FollowingFeed } from '@/components/feed/FollowingFeed';
import { SuggestedUsers } from '@/components/follow/SuggestedUsers';
import { cn } from '@/lib/utils';

type FeedTab = 'forYou' | 'following';

export default function HomePage() {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const [activeTab, setActiveTab] = useState<FeedTab>('forYou');
  const { ids: followingIds, loading: followingIdsLoading } = useFollowingIds(user?.uid);

  const tabs = [
    { key: 'forYou' as const, label: dir === 'rtl' ? 'لك' : 'For You', icon: Globe },
    { key: 'following' as const, label: dir === 'rtl' ? 'متابَعون' : 'Following', icon: Users },
  ];

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

      {/* Feed tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex border-b border-white/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all -mb-px',
                activeTab === tab.key
                  ? 'text-pulse-accent border-b-2 border-pulse-accent'
                  : 'text-pulse-text-muted hover:text-pulse-text border-b-2 border-transparent'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Feed content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'forYou' ? (
            <div className="space-y-4">
              <SuggestedUsers />
              <Feed />
            </div>
          ) : (
            <FollowingFeed followingIds={followingIds} loading={followingIdsLoading} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
