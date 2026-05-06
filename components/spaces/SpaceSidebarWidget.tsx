'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Hash, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserSpaces } from '@/hooks/useSpaces';
import { GlassCard } from '@/components/ui/GlassCard';
import Image from 'next/image';

export function SpaceSidebarWidget() {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const { spaces, loading } = useUserSpaces(user?.uid);

  if (loading || !spaces.length) return null;

  return (
    <GlassCard padding="none" className="overflow-hidden" dir={dir}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-semibold text-pulse-text">
          {dir === 'rtl' ? 'مجموعاتي' : 'My Groups'}
        </span>
        <Link href="/spaces/create" className="text-pulse-accent hover:text-pulse-accent/80 transition-colors">
          <Plus className="w-4 h-4" />
        </Link>
      </div>
      <div className="divide-y divide-white/5">
        {spaces.slice(0, 5).map((space, i) => (
          <motion.div
            key={space.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              href={`/spaces/${space.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-pulse-accent/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                {space.avatarUrl
                  ? <Image src={space.avatarUrl} alt={space.name} width={32} height={32} className="object-cover w-full h-full" />
                  : <Hash className="w-4 h-4 text-pulse-accent/60" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-pulse-text truncate">{space.name}</p>
                <p className="text-xs text-pulse-text-muted">{space.membersCount} {dir === 'rtl' ? 'عضو' : 'members'}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      {spaces.length > 5 && (
        <Link href="/spaces?tab=mine" className="flex items-center justify-center py-2.5 text-xs text-pulse-accent hover:text-pulse-accent/80 border-t border-white/10 transition-colors">
          {dir === 'rtl' ? 'عرض الكل' : 'See all'}
        </Link>
      )}
    </GlassCard>
  );
}
