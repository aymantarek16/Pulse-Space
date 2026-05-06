'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Users, Hash, Lock, Settings,
  Grid3x3, Info, UserPlus, Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSpace, useSpaceMembership, useSpaceMembers } from '@/hooks/useSpaces';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

type Tab = 'posts' | 'members' | 'about';

export default function SpaceDetailPage() {
  const params = useParams();
  const spaceId = params?.spaceId as string;
  const { user } = useAuth();
  const { dir } = useLanguage();
  const router = useRouter();
  const { space, loading } = useSpace(spaceId);
  const { member, loading: joinLoading, toggle } = useSpaceMembership(spaceId, user?.uid);
  const { members, loading: membersLoading } = useSpaceMembers(spaceId);
  const [tab, setTab] = useState<Tab>('posts');

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const isOwner = user?.uid === space?.ownerId;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 rounded-2xl bg-white/5" />
        <div className="h-6 bg-white/10 rounded-full w-40" />
        <div className="h-4 bg-white/5 rounded-full w-60" />
      </div>
    );
  }

  if (!space) {
    return (
      <GlassCard className="text-center py-20" dir={dir}>
        <p className="text-pulse-text-muted">{dir === 'rtl' ? 'المجموعة غير موجودة' : 'Group not found'}</p>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mt-4">
          <BackIcon className="w-4 h-4 me-1.5" />
          {dir === 'rtl' ? 'رجوع' : 'Back'}
        </Button>
      </GlassCard>
    );
  }

  const tabs = [
    { key: 'posts' as const, label: dir === 'rtl' ? 'المنشورات' : 'Posts', icon: Grid3x3 },
    { key: 'members' as const, label: dir === 'rtl' ? 'الأعضاء' : 'Members', icon: Users },
    { key: 'about' as const, label: dir === 'rtl' ? 'عن المجموعة' : 'About', icon: Info },
  ];

  return (
    <div className="space-y-4" dir={dir}>
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5">
        <BackIcon className="w-4 h-4" />
        {dir === 'rtl' ? 'رجوع' : 'Back'}
      </Button>

      {/* Cover */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <div className="h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-pulse-accent/10 to-pulse-accent-dark/5 border border-white/10">
          {space.coverUrl && (
            <Image src={space.coverUrl} alt="" fill className="object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-pulse-bg/70 to-transparent" />
          {space.isPrivate && (
            <div className="absolute top-3 end-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 text-white text-xs font-medium">
              <Lock className="w-3 h-3" />
              {dir === 'rtl' ? 'مجموعة خاصة' : 'Private Group'}
            </div>
          )}
        </div>

        {/* Space avatar */}
        <div className="absolute -bottom-8 start-5">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-pulse-surface border-2 border-pulse-bg shadow-xl flex items-center justify-center">
            {space.avatarUrl ? (
              <Image src={space.avatarUrl} alt={space.name} width={80} height={80} className="object-cover w-full h-full" />
            ) : (
              <Hash className="w-10 h-10 text-pulse-accent/50" />
            )}
          </div>
        </div>
      </motion.div>

      {/* Header info + actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="pt-8 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-pulse-text">{space.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-pulse-text-muted">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {space.membersCount.toLocaleString()} {dir === 'rtl' ? 'عضو' : 'members'}
            </span>
            <span className="flex items-center gap-1.5">
              <Grid3x3 className="w-4 h-4" />
              {space.postsCount} {dir === 'rtl' ? 'منشور' : 'posts'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isOwner ? (
            <Button variant="glass" size="sm" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              {dir === 'rtl' ? 'إدارة' : 'Manage'}
            </Button>
          ) : (
            <button
              onClick={toggle}
              disabled={joinLoading}
              className={cn(
                'h-9 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
                member
                  ? 'bg-white/10 text-pulse-text border border-white/10 hover:bg-red-500/10 hover:text-red-400'
                  : 'bg-gradient-to-r from-pulse-accent to-pulse-accent-dark text-pulse-bg hover:shadow-lg hover:shadow-pulse-accent/30'
              )}
            >
              {joinLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : member ? (
                dir === 'rtl' ? 'مغادرة المجموعة' : 'Leave Group'
              ) : (
                <><UserPlus className="w-4 h-4" />{dir === 'rtl' ? 'انضمام' : 'Join'}</>
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Tags */}
      {space.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {space.tags.map((tag) => (
            <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-pulse-accent/10 text-pulse-accent border border-pulse-accent/20">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all',
              tab === key ? 'border-pulse-accent text-pulse-accent' : 'border-transparent text-pulse-text-muted hover:text-pulse-text'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'posts' && (
            <GlassCard className="text-center py-16">
              <Grid3x3 className="w-12 h-12 text-pulse-accent/20 mx-auto mb-4" />
              <p className="text-pulse-text-muted text-sm">
                {dir === 'rtl' ? 'منشورات المجموعة قادمة قريباً' : 'Group posts coming soon'}
              </p>
            </GlassCard>
          )}

          {tab === 'members' && (
            <div>
              {membersLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-white/10" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-white/10 rounded w-24" />
                        <div className="h-2.5 bg-white/5 rounded w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : members.length === 0 ? (
                <GlassCard className="text-center py-12">
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
                        <Avatar src={m.user?.avatarUrl} name={m.user?.displayName} size="sm" />
                      </Link>
                      <Link href={`/profile/${m.user?.username || m.userId}`} className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-pulse-text truncate">{m.user?.displayName || m.userId}</p>
                        <p className="text-xs text-pulse-text-muted truncate">@{m.user?.username}</p>
                      </Link>
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
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'about' && (
            <GlassCard className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-pulse-text-muted mb-1">
                  {dir === 'rtl' ? 'الوصف' : 'Description'}
                </h3>
                <p className="text-pulse-text leading-relaxed">
                  {space.description || (dir === 'rtl' ? 'لا يوجد وصف' : 'No description')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-pulse-text-muted">{dir === 'rtl' ? 'النوع:' : 'Type:'}</span>
                <span className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border',
                  space.isPrivate
                    ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                    : 'text-green-400 bg-green-500/10 border-green-500/20'
                )}>
                  {space.isPrivate ? <Lock className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                  {space.isPrivate ? (dir === 'rtl' ? 'خاص' : 'Private') : (dir === 'rtl' ? 'عام' : 'Public')}
                </span>
              </div>
            </GlassCard>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
