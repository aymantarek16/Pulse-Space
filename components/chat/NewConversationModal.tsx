'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Users, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { searchUsers } from '@/services/users.service';
import { getOrCreateDirectConversation, createGroupConversation } from '@/services/messages.service';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewConversationModal({ isOpen, onClose }: NewConversationModalProps) {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  const isGroup = selected.length > 1;

  const handleSearch = (val: string) => {
    setQuery(val);
    setError(null);
    if (searchTimer) clearTimeout(searchTimer);
    if (!val.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchUsers(val);
        setResults(
          res.filter(
            (u) => u.uid !== user?.uid && u.privacySettings?.allowDirectMessages !== false
          )
        );
      } finally { setSearching(false); }
    }, 400);
    setSearchTimer(t);
  };

  const toggleUser = (u: User) => {
    setSelected((prev) =>
      prev.find((s) => s.uid === u.uid)
        ? prev.filter((s) => s.uid !== u.uid)
        : [...prev, u]
    );
  };

  const handleStart = async () => {
    if (!user || !selected.length || creating) return;
    setCreating(true);
    setError(null);
    try {
      let convId: string;
      if (selected.length === 1) {
        convId = await getOrCreateDirectConversation(user.uid, selected[0].uid);
      } else {
        const name = groupName.trim() || selected.map((u) => u.displayName).join(', ');
        convId = await createGroupConversation(user.uid, selected.map((u) => u.uid), name);
      }
      onClose();
      router.push(`/messages/${convId}`);
    } catch (err) {
      console.error('Could not start conversation:', err);
      setError(
        dir === 'rtl'
          ? 'تعذر بدء المحادثة. حاول مرة أخرى.'
          : 'Could not start the conversation. Please try again.'
      );
    } finally { setCreating(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-[10%] md:inset-auto md:top-[15%] md:left-1/2 md:-translate-x-1/2 md:w-[480px] z-50 rounded-3xl bg-pulse-surface border border-white/10 shadow-2xl overflow-hidden"
            dir={dir}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="font-bold text-pulse-text">
                {dir === 'rtl' ? 'محادثة جديدة' : 'New Conversation'}
              </h2>
              <button onClick={onClose} className="text-pulse-text-muted hover:text-pulse-text transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Selected users chips */}
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.map((u) => (
                    <div key={u.uid} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-pulse-accent/[0.15] border border-pulse-accent/25 text-sm">
                      <Avatar src={u.avatarUrl} name={u.displayName} size="xs" />
                      <span className="text-pulse-accent text-xs font-medium">{u.displayName}</span>
                      <button onClick={() => toggleUser(u)} className="text-pulse-accent/60 hover:text-red-400 transition-colors ms-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Group name (when multiple selected) */}
              {isGroup && (
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={dir === 'rtl' ? 'اسم المجموعة (اختياري)' : 'Group name (optional)'}
                  className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-sm text-pulse-text placeholder:text-pulse-text-muted/50 px-4 focus:outline-none focus:border-pulse-accent/50 transition-all"
                />
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pulse-text-muted pointer-events-none" />
                <input
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={dir === 'rtl' ? 'ابحث عن مستخدم...' : 'Search for a user...'}
                  style={{ direction: dir }}
                  className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-sm text-pulse-text placeholder:text-pulse-text-muted/50 ps-10 pe-4 focus:outline-none focus:border-pulse-accent/50 transition-all"
                />
                {searching && <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pulse-accent animate-spin" />}
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="max-h-52 overflow-y-auto scrollbar-hide rounded-xl border border-white/10 divide-y divide-white/5">
                  {results.map((u) => {
                    const isSelected = selected.some((s) => s.uid === u.uid);
                    return (
                      <button
                        key={u.uid}
                        onClick={() => toggleUser(u)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-start transition-colors',
                          isSelected ? 'bg-pulse-accent/10' : 'hover:bg-white/5'
                        )}
                      >
                        <Avatar src={u.avatarUrl} name={u.displayName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-pulse-text truncate">{u.displayName}</p>
                          <p className="text-xs text-pulse-text-muted">@{u.username}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-pulse-accent flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {query && !searching && results.length === 0 && (
                <p className="text-center text-sm text-pulse-text-muted py-4">
                  {dir === 'rtl' ? 'لا توجد نتائج' : 'No results found'}
                </p>
              )}

              {error && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-sm text-red-300">
                  {error}
                </p>
              )}

              {/* Start button */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={selected.length === 0}
                loading={creating}
                onClick={handleStart}
                className="gap-2"
              >
                {isGroup ? <Users className="w-4 h-4" /> : null}
                {selected.length === 0
                  ? (dir === 'rtl' ? 'اختر مستخدمًا' : 'Select a user')
                  : isGroup
                  ? (dir === 'rtl' ? `إنشاء مجموعة (${selected.length})` : `Create Group (${selected.length})`)
                  : (dir === 'rtl' ? 'بدء المحادثة' : 'Start Chat')}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
