'use client';

import React from 'react';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useFollow } from '@/hooks/useFollow';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  currentUserId: string | undefined;
  targetUserId: string;
  size?: 'sm' | 'md';
  className?: string;
  onFollowChange?: (following: boolean) => void;
}

export function FollowButton({
  currentUserId,
  targetUserId,
  size = 'sm',
  className,
  onFollowChange,
}: FollowButtonProps) {
  const { dir } = useLanguage();
  const { following, loading, toggle, initialized } = useFollow(currentUserId, targetUserId);

  if (!currentUserId || currentUserId === targetUserId) return null;

  const handleClick = async () => {
    await toggle();
    onFollowChange?.(!following);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || !initialized}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-xl transition-all duration-200 disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
        following
          ? 'bg-white/10 text-pulse-text border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
          : 'bg-gradient-to-r from-pulse-accent to-pulse-accent-dark text-pulse-bg hover:shadow-lg hover:shadow-pulse-accent/30 hover:scale-[1.02] active:scale-[0.98]',
        className
      )}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : following ? (
        <>
          <UserMinus className="w-3.5 h-3.5" />
          {dir === 'rtl' ? 'إلغاء المتابعة' : 'Unfollow'}
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5" />
          {dir === 'rtl' ? 'متابعة' : 'Follow'}
        </>
      )}
    </button>
  );
}
