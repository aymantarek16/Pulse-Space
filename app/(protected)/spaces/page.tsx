'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Loader2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePublicSpaces, useUserSpaces } from '@/hooks/useSpaces';
import { searchSpaces } from '@/services/spaces.service';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Space } from '@/types';

type Tab = 'discover' | 'mine';

export default function SpacesPage() {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const [tab, setTab] = useState<Tab>('discover');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Space[]>([]);
  const [searching, setSearching] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const { spaces: publicSpaces, loading: publicLoading, error: publicError } = usePublicSpaces();
  const { spaces: mySpaces, loading: myLoading, error: myError } = useUserSpaces(user?.uid);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (timer) clearTimeout(timer);
    if (!val.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const results = await searchSpaces(val);
        setSearchResults(results);
      } finally { setSearching(false); }
    }, 500);
    setTimer(t);
  };

  const displaySpaces = query ? searchResults : tab === 'discover' ? publicSpaces : mySpaces;
  const isLoading = query ? searching : tab === 'discover' ? publicLoading : myLoading;
  const loadError = query ? null : tab === 'discover' ? publicError : myError;

  return (
    <div className="space-y-5" dir={dir}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-pulse-accent" />
          <h1 className="text-lg font-bold gradient-text">{dir === 'rtl' ? 'المجموعات' : 'Groups'}</h1>
        </div>
        <Link href="/spaces/create">
          <Button variant="primary" size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            {dir === 'rtl' ? 'إنشاء مجموعة' : 'Create Group'}
          </Button>
        </Link>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="relative">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pulse-text-muted pointer-events-none" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={dir === 'rtl' ? 'ابحث عن مجموعة...' : 'Search groups...'}
            style={{ direction: dir }}
            className="w-full h-11 rounded-2xl bg-white/5 border border-white/10 text-pulse-text placeholder:text-pulse-text-muted/50 ps-10 pe-10 focus:outline-none focus:border-pulse-accent/50 focus:ring-2 focus:ring-pulse-accent/20 transition-all text-sm"
          />
          {searching && <Loader2 className="absolute end-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pulse-accent animate-spin" />}
          {query && !searching && (
            <button onClick={() => { setQuery(''); setSearchResults([]); }} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-pulse-text-muted hover:text-pulse-text">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      {!query && (
        <div className="flex border-b border-white/10">
          {([['discover', dir === 'rtl' ? 'اكتشف' : 'Discover'], ['mine', dir === 'rtl' ? 'مجموعاتي' : 'My Groups']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={cn('px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all',
                tab === key ? 'border-pulse-accent text-pulse-accent' : 'border-transparent text-pulse-text-muted hover:text-pulse-text')}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <AnimatePresence mode="wait">
        <motion.div key={tab + query} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {loadError ? (
            <GlassCard className="text-center py-16">
              <Users className="w-12 h-12 text-red-400/30 mx-auto mb-4" />
              <p className="text-pulse-text font-semibold mb-2">
                {dir === 'rtl' ? 'تعذر تحميل المجموعات' : 'Could not load groups'}
              </p>
              <p className="text-xs text-pulse-text-muted">
                {dir === 'rtl' ? 'راجع الاتصال أو قواعد Firebase ثم حاول مرة أخرى.' : 'Check your connection or Firebase rules, then try again.'}
              </p>
            </GlassCard>
          ) : isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1,2,3,4].map(i => <div key={i} className="rounded-2xl bg-white/5 animate-pulse h-52" />)}
            </div>
          ) : displaySpaces.length === 0 ? (
            <GlassCard className="text-center py-20">
              <Users className="w-14 h-14 text-pulse-accent/20 mx-auto mb-4" />
              <p className="text-pulse-text font-semibold mb-2">
                {tab === 'mine' && !query
                  ? (dir === 'rtl' ? 'لم تنشئ أي مجموعة بعد' : "No groups yet")
                  : (dir === 'rtl' ? 'لا توجد مجموعات' : 'No groups found')}
              </p>
              {tab === 'mine' && !query && (
                <Link href="/spaces/create">
                  <Button variant="primary" size="sm" className="mt-3 gap-1.5">
                    <Plus className="w-4 h-4" />
                    {dir === 'rtl' ? 'أنشئ أول مجموعة' : 'Create your first group'}
                  </Button>
                </Link>
              )}
            </GlassCard>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {displaySpaces.map((space, i) => <SpaceCard key={space.id} space={space} index={i} />)}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
