'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Hash, Users, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { searchUsers } from '@/services/users.service';
import { searchPostsByTag, getTrendingTags } from '@/services/posts.service';
import { UserCard } from '@/components/follow/UserCard';
import { PostCard } from '@/components/post/PostCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { FeedSkeleton } from '@/components/feed/PostSkeleton';
import { cn } from '@/lib/utils';
import type { User, Post } from '@/types';

type SearchTab = 'users' | 'posts';

let trendingTagsCache: { tag: string; count: number }[] | null = null;

export default function ExplorePage() {
  const { user } = useAuth();
  const { dir } = useLanguage();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [trending, setTrending] = useState<{ tag: string; count: number }[]>(() => trendingTagsCache || []);
  const [loading, setLoading] = useState(false);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  // Load trending tags on mount
  useEffect(() => {
    if (trendingTagsCache) {
      setTrending(trendingTagsCache);
      return;
    }
    getTrendingTags().then((data) => {
      trendingTagsCache = data;
      setTrending(data);
    });
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setUsers([]); setPosts([]); return; }
    setLoading(true);
    try {
      if (tab === 'users') {
        const results = await searchUsers(q);
        setUsers(results);
      } else {
        const results = await searchPostsByTag(q);
        setPosts(results);
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const handleInput = (val: string) => {
    setQuery(val);
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(() => doSearch(val), 500);
    setSearchTimer(t);
  };

  const handleTagClick = (tag: string) => {
    setTab('posts');
    setQuery(tag);
    doSearch(tag);
  };

  const placeholder = dir === 'rtl' ? 'ابحث عن مستخدمين أو وسوم...' : 'Search users or hashtags...';

  return (
    <div className="space-y-5" dir={dir}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
        <Search className="w-5 h-5 text-pulse-accent" />
        <h1 className="text-lg font-bold gradient-text">{dir === 'rtl' ? 'استكشاف' : 'Explore'}</h1>
      </motion.div>

      {/* Search bar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="relative">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pulse-text-muted pointer-events-none" />
          <input
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={placeholder}
            style={{ direction: dir }}
            className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-pulse-text placeholder:text-pulse-text-muted/50 ps-10 pe-10 focus:outline-none focus:border-pulse-accent/50 focus:ring-2 focus:ring-pulse-accent/20 transition-all text-sm"
          />
          {loading && (
            <Loader2 className="absolute end-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pulse-accent animate-spin" />
          )}
          {query && !loading && (
            <button
              onClick={() => { setQuery(''); setUsers([]); setPosts([]); }}
              className="absolute end-3.5 top-1/2 -translate-y-1/2 text-pulse-text-muted hover:text-pulse-text transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Search tabs */}
      {query && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex border-b border-white/10">
          {[
            { key: 'users' as const, label: dir === 'rtl' ? 'مستخدمون' : 'Users', icon: Users },
            { key: 'posts' as const, label: dir === 'rtl' ? 'وسوم' : 'Hashtags', icon: Hash },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); doSearch(query); }}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all',
                tab === key
                  ? 'border-pulse-accent text-pulse-accent'
                  : 'border-transparent text-pulse-text-muted hover:text-pulse-text'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {query ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {loading ? (
              tab === 'users'
                ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}</div>
                : <FeedSkeleton count={2} />
            ) : tab === 'users' ? (
              users.length ? (
                <div className="space-y-3">
                  {users.map((u, i) => (
                    <UserCard key={u.uid} user={u} currentUserId={user?.uid} index={i} />
                  ))}
                </div>
              ) : (
                <GlassCard className="text-center py-12">
                  <p className="text-pulse-text-muted text-sm">
                    {dir === 'rtl' ? 'لا توجد نتائج' : 'No results found'}
                  </p>
                </GlassCard>
              )
            ) : (
              posts.length ? (
                <div className="space-y-4">
                  {posts.map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              ) : (
                <GlassCard className="text-center py-12">
                  <p className="text-pulse-text-muted text-sm">
                    {dir === 'rtl' ? 'لا توجد منشورات بهذا الوسم' : 'No posts with this hashtag'}
                  </p>
                </GlassCard>
              )
            )}
          </motion.div>
        ) : (
          /* Trending tags when no search */
          <motion.div key="trending" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {trending.length > 0 && (
              <GlassCard padding="none" className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                  <TrendingUp className="w-4 h-4 text-pulse-accent" />
                  <span className="text-sm font-semibold text-pulse-text">
                    {dir === 'rtl' ? 'الوسوم الرائجة' : 'Trending Hashtags'}
                  </span>
                </div>
                <div className="divide-y divide-white/5">
                  {trending.map((item, i) => (
                    <motion.button
                      key={item.tag}
                      initial={{ opacity: 0, x: dir === 'rtl' ? 12 : -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => handleTagClick(item.tag)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-start"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-pulse-text-muted/60 w-5 text-center font-mono">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-pulse-text">#{item.tag}</p>
                          <p className="text-xs text-pulse-text-muted">
                            {item.count} {dir === 'rtl' ? 'منشور' : 'posts'}
                          </p>
                        </div>
                      </div>
                      <Hash className="w-4 h-4 text-pulse-accent/50" />
                    </motion.button>
                  ))}
                </div>
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
