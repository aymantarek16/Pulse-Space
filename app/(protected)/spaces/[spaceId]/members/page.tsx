'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSpace, useSpaceMembers } from '@/hooks/useSpaces';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { GlassCard } from '@/components/ui/GlassCard';
import { FollowButton } from '@/components/follow/FollowButton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function SpaceMembersPage() {
  const params = useParams();
  const spaceId = params?.spaceId as string;
  const { user } = useAuth();
  const { dir } = useLanguage();
  const router = useRouter();
  const { space } = useSpace(spaceId);
  const { members, loading } = useSpaceMembers(spaceId);
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-4" dir={dir}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <BackIcon className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-pulse-text">{dir === 'rtl' ? 'الأعضاء' : 'Members'}</h1>
          {space && (
            <p className="text-xs text-pulse-text-muted">{space.name} · {space.membersCount} {dir === 'rtl' ? 'عضو' : 'members'}</p>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-white/10 rounded-full w-28" />
                <div className="h-2.5 bg-white/5 rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Users className="w-12 h-12 text-pulse-accent/20 mx-auto mb-3" />
          <p className="text-pulse-text-muted text-sm">{dir === 'rtl' ? 'لا يوجد أعضاء بعد' : 'No members yet'}</p>
        </GlassCard>
      ) : (
        <div className="divide-y divide-white/5 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
          {members.map((m, i) => (
            <motion.div
              key={m.userId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Link href={`/profile/${m.user?.username || m.userId}`}>
                <Avatar src={m.user?.avatarUrl} name={m.user?.displayName} size="md" />
              </Link>
              <Link href={`/profile/${m.user?.username || m.userId}`} className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-pulse-text truncate">{m.user?.displayName}</p>
                <p className="text-xs text-pulse-text-muted">@{m.user?.username}</p>
              </Link>
              <div className="flex items-center gap-2 flex-shrink-0">
                {m.role !== 'member' && (
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full border',
                    m.role === 'owner'
                      ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                      : 'text-pulse-accent bg-pulse-accent/10 border-pulse-accent/20'
                  )}>
                    {m.role === 'owner' ? (dir === 'rtl' ? 'مالك' : 'Owner') : (dir === 'rtl' ? 'مشرف' : 'Mod')}
                  </span>
                )}
                <FollowButton currentUserId={user?.uid} targetUserId={m.userId} size="sm" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
