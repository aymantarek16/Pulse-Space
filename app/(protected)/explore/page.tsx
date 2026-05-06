'use client';

import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { searchUsers } from '@/services/users.service';
import { UserCard } from '@/components/follow/UserCard';
import { GlassCard } from '@/components/ui/GlassCard';
import type { User } from '@/types';

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

export default function ExplorePage() {
  const { user } = useAuth();
  const { dir } = useLanguage();

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (value: string) => {
    const username = normalizeUsername(value);
    setSearched(Boolean(username));

    if (!username) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const results = await searchUsers(username);
      setUsers(results);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    setUsers([]);
    setSearched(false);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => doSearch(value), 450);
    setSearchTimer(timer);
  };

  const clearSearch = () => {
    if (searchTimer) clearTimeout(searchTimer);
    setQuery('');
    setUsers([]);
    setSearched(false);
    setLoading(false);
  };

  const placeholder =
    dir === 'rtl'
      ? 'اكتب اليوزرنيم كاملًا فقط...'
      : 'Enter the exact username only...';

  return (
    <div className="space-y-5" dir={dir}>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Search className="w-5 h-5 text-pulse-accent" />
        <h1 className="text-lg font-bold gradient-text">
          {dir === 'rtl' ? 'بحث المستخدمين' : 'User Search'}
        </h1>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="relative">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pulse-text-muted pointer-events-none" />
          <input
            value={query}
            onChange={(event) => handleInput(event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            style={{ direction: 'ltr' }}
            className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-pulse-text placeholder:text-pulse-text-muted/50 ps-10 pe-10 focus:outline-none focus:border-pulse-accent/50 focus:ring-2 focus:ring-pulse-accent/20 transition-all text-sm"
          />
          {loading && (
            <Loader2 className="absolute end-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pulse-accent animate-spin" />
          )}
          {query && !loading && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute end-3.5 top-1/2 -translate-y-1/2 text-pulse-text-muted hover:text-pulse-text transition-colors"
              aria-label={dir === 'rtl' ? 'مسح البحث' : 'Clear search'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {query ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((item) => (
                  <div key={item} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : users.length ? (
              users.map((foundUser, index) => (
                <UserCard
                  key={foundUser.uid}
                  user={foundUser}
                  currentUserId={user?.uid}
                  index={index}
                />
              ))
            ) : searched ? (
              <GlassCard className="text-center py-12">
                <UserRound className="mx-auto mb-3 h-9 w-9 text-pulse-text-muted/40" />
                <p className="text-pulse-text-muted text-sm">
                  {dir === 'rtl'
                    ? 'لا يوجد مستخدم بهذا اليوزرنيم الكامل'
                    : 'No user exists with that exact username'}
                </p>
              </GlassCard>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard className="py-12 text-center">
              <ShieldCheck className="mx-auto mb-4 h-11 w-11 text-pulse-accent/40" />
              <p className="mb-2 text-sm font-semibold text-pulse-text">
                {dir === 'rtl' ? 'البحث خاص ومباشر' : 'Private direct search'}
              </p>
              <p className="mx-auto max-w-sm text-sm leading-6 text-pulse-text-muted">
                {dir === 'rtl'
                  ? 'لن تظهر اقتراحات أو قوائم عامة. يمكنك الوصول لشخص فقط عند كتابة اليوزرنيم الكامل.'
                  : 'No suggestions or public directories are shown. You can find someone only by entering their exact username.'}
              </p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
