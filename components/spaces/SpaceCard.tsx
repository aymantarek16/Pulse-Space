'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Users, Lock, Hash, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSpaceMembership } from '@/hooks/useSpaces';
import { Avatar } from '@/components/ui/Avatar';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import type { Space } from '@/types';

interface SpaceCardProps {
  space: Space;
  index?: number;
  compact?: boolean;
}

export function SpaceCard({ space, index = 0, compact = false }: SpaceCardProps) {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const { member, loading, toggle } = useSpaceMembership(space.id, user?.uid);
  const isOwner = user?.uid === space.ownerId;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: dir === 'rtl' ? 12 : -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex items-center gap-3 px-4 py-3"
        dir={dir}
      >
        <Link href={`/spaces/${space.id}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-pulse-accent/20 to-pulse-accent-dark/10 flex items-center justify-center border border-white/10">
            {space.avatarUrl ? (
              <Image src={space.avatarUrl} alt={space.name} width={40} height={40} className="object-cover w-full h-full" />
            ) : (
              <Hash className="w-5 h-5 text-pulse-accent/60" />
            )}
          </div>
        </Link>
        <Link href={`/spaces/${space.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-pulse-text truncate">{space.name}</span>
            {space.isPrivate && <Lock className="w-3 h-3 text-pulse-text-muted flex-shrink-0" />}
          </div>
          <p className="text-xs text-pulse-text-muted">{space.membersCount} {dir === 'rtl' ? 'عضو' : 'members'}</p>
        </Link>
        {!isOwner && (
          <JoinButton member={member} loading={loading} toggle={toggle} dir={dir} small />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <GlassCard padding="none" hover className="overflow-hidden" dir={dir}>
        {/* Cover */}
        <Link href={`/spaces/${space.id}`}>
          <div className="h-28 relative bg-gradient-to-br from-pulse-accent/10 to-pulse-accent-dark/5">
            {space.coverUrl && (
              <Image src={space.coverUrl} alt="" fill className="object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {space.isPrivate && (
              <div className="absolute top-2 end-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 text-white text-xs">
                <Lock className="w-3 h-3" />
                {dir === 'rtl' ? 'خاص' : 'Private'}
              </div>
            )}
          </div>
        </Link>

        <div className="p-4">
          <div className="flex items-start gap-3 -mt-8 mb-3">
            {/* Avatar */}
            <Link href={`/spaces/${space.id}`} className="flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-pulse-surface border-2 border-pulse-bg shadow-lg flex items-center justify-center">
                {space.avatarUrl ? (
                  <Image src={space.avatarUrl} alt={space.name} width={56} height={56} className="object-cover w-full h-full" />
                ) : (
                  <Hash className="w-7 h-7 text-pulse-accent/60" />
                )}
              </div>
            </Link>
            <div className="flex-1 pt-6">
              <Link href={`/spaces/${space.id}`}>
                <h3 className="font-bold text-pulse-text hover:text-pulse-accent transition-colors">{space.name}</h3>
              </Link>
            </div>
          </div>

          {space.description && (
            <p className="text-sm text-pulse-text-muted line-clamp-2 mb-3">{space.description}</p>
          )}

          {/* Tags */}
          {space.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {space.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-pulse-accent/10 text-pulse-accent border border-pulse-accent/20">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-pulse-text-muted">
              <Users className="w-4 h-4" />
              <span>{space.membersCount.toLocaleString()}</span>
              <span>{dir === 'rtl' ? 'عضو' : 'members'}</span>
            </div>
            {!isOwner && (
              <JoinButton member={member} loading={loading} toggle={toggle} dir={dir} />
            )}
            {isOwner && (
              <span className="text-xs text-pulse-accent border border-pulse-accent/30 px-2 py-1 rounded-lg">
                {dir === 'rtl' ? 'أنت المالك' : 'Owner'}
              </span>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── Join / Leave button ──────────────────────────────────────────────────────

function JoinButton({
  member,
  loading,
  toggle,
  dir,
  small = false,
}: {
  member: boolean;
  loading: boolean;
  toggle: () => void;
  dir: string;
  small?: boolean;
}) {
  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-xl transition-all duration-200 disabled:opacity-50',
        small ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
        member
          ? 'bg-white/10 text-pulse-text border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
          : 'bg-gradient-to-r from-pulse-accent to-pulse-accent-dark text-pulse-bg hover:shadow-md hover:shadow-pulse-accent/30'
      )}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : member ? (
        dir === 'rtl' ? 'مغادرة' : 'Leave'
      ) : (
        dir === 'rtl' ? 'انضمام' : 'Join'
      )}
    </button>
  );
}
