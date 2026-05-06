'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Link2, Calendar, Edit3, MoreHorizontal,
  UserPlus, UserMinus, MessageCircle, Grid3x3, Bookmark, Shield,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserByUsername } from '@/hooks/useUser';
import { useUserPosts, useSavedPosts } from '@/hooks/usePosts';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { followUser, unfollowUser, isFollowing } from '@/services/follows.service';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { PostCard } from '@/components/post/PostCard';
import { FeedSkeleton } from '@/components/feed/PostSkeleton';

// ─── DM Button helper ─────────────────────────────────────────────────────────

function DMButton({
  currentUserId,
  targetUserId,
  dir,
  allowed = true,
}: {
  currentUserId?: string;
  targetUserId: string;
  dir: string;
  allowed?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  if (!currentUserId || currentUserId === targetUserId || !allowed) return null;
  const handleClick = async () => {
    setLoading(true);
    try {
      const { getOrCreateDirectConversation } = await import('@/services/messages.service');
      const convId = await getOrCreateDirectConversation(currentUserId, targetUserId);
      router.push(`/messages/${convId}`);
    } finally { setLoading(false); }
  };
  return (
    <Button variant="glass" size="sm" onClick={handleClick} loading={loading} className="gap-1.5">
      <MessageCircle className="w-3.5 h-3.5" />
      {dir === 'rtl' ? 'رسالة' : 'Message'}
    </Button>
  );
}

type Tab = 'posts' | 'saved';

function formatDate(ts: any, locale: string): string {
  if (!ts) return '';
  try {
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date();
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long' });
  } catch { return ''; }
}

export default function ProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { user: currentUser } = useAuth();
  const { user: profileUser, loading } = useUserByUsername(username);
  const { t } = useTranslation();
  const { locale, dir } = useLanguage();
  const router = useRouter();

  const [following, setFollowing] = useState(false);
  const [followChecked, setFollowChecked] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('posts');

  const isOwnProfile = currentUser?.uid === profileUser?.uid;
  const canViewPosts = Boolean(isOwnProfile || following);
  const { posts, loading: postsLoading, refetch } = useUserPosts(
    canViewPosts ? profileUser?.uid : undefined
  );
  const { posts: saved, loading: savedLoading } = useSavedPosts(
    isOwnProfile ? currentUser?.uid : undefined
  );

  useEffect(() => {
    setFollowChecked(false);
    if (currentUser && profileUser && !isOwnProfile) {
      isFollowing(currentUser.uid, profileUser.uid)
        .then(setFollowing)
        .finally(() => setFollowChecked(true));
      return;
    }
    setFollowChecked(true);
    setFollowing(false);
  }, [currentUser, profileUser, isOwnProfile]);

  const handleFollow = async () => {
    if (!currentUser || !profileUser) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(currentUser.uid, profileUser.uid);
        setFollowing(false);
      } else {
        await followUser(currentUser.uid, profileUser.uid);
        setFollowing(true);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 rounded-2xl bg-white/5" />
        <div className="flex items-end gap-4 -mt-12 px-4">
          <div className="w-24 h-24 rounded-2xl bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-2 pb-2">
            <div className="h-4 bg-white/10 rounded w-32" />
            <div className="h-3 bg-white/5 rounded w-20" />
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <GlassCard className="text-center py-20">
        <p className="text-pulse-text-muted">
          {dir === 'rtl' ? 'المستخدم غير موجود' : 'User not found'}
        </p>
      </GlassCard>
    );
  }

  const displayPosts = tab === 'saved' ? saved : posts;
  const displayLoading = tab === 'saved' ? savedLoading : postsLoading;
  const publicProfile = profileUser.privacySettings?.publicProfile !== false;
  const allowDirectMessages = profileUser.privacySettings?.allowDirectMessages !== false;

  if (!isOwnProfile && !publicProfile) {
    return (
      <GlassCard className="text-center py-20">
        <Shield className="mx-auto mb-4 h-10 w-10 text-pulse-accent/30" />
        <p className="font-semibold text-pulse-text">
          {dir === 'rtl' ? 'هذا الملف الشخصي خاص' : 'This profile is private'}
        </p>
        <p className="mt-2 text-sm text-pulse-text-muted">
          {dir === 'rtl' ? 'المستخدم اختار إخفاء صفحة حسابه.' : 'This user chose to hide their profile page.'}
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4" dir={dir}>
      {/* Cover */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <div className="h-44 rounded-2xl overflow-hidden cover-gradient border border-white/10">
          {profileUser.coverUrl?.startsWith('data:image/') ? (
            <img src={profileUser.coverUrl} alt="Cover" className="h-full w-full object-cover" />
          ) : profileUser.coverUrl ? (
            <Image src={profileUser.coverUrl} alt="Cover" fill className="object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-pulse-bg/60 to-transparent" />
        </div>
        <div className="absolute -bottom-12 start-6">
          <div className="relative">
            <Avatar src={profileUser.avatarUrl} name={profileUser.displayName} size="2xl" ring className="shadow-2xl shadow-black/50" />
            {profileUser.verified && (
              <div className="absolute -bottom-1 -end-1 w-6 h-6 rounded-full bg-pulse-accent flex items-center justify-center border-2 border-pulse-bg">
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Actions row */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center justify-end gap-2 pt-2">
        {isOwnProfile ? (
          <Link href="/profile/edit">
            <Button variant="glass" size="sm" className="gap-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              {t.profile.editProfile}
            </Button>
          </Link>
        ) : (
          <>
            <Button variant={following ? 'secondary' : 'primary'} size="sm" loading={followLoading} onClick={handleFollow} className="gap-1.5">
              {following ? <><UserMinus className="w-3.5 h-3.5" />{t.profile.unfollow}</> : <><UserPlus className="w-3.5 h-3.5" />{t.profile.follow}</>}
            </Button>
            <DMButton
              currentUserId={currentUser?.uid}
              targetUserId={profileUser.uid}
              dir={dir}
              allowed={allowDirectMessages}
            />
          </>
        )}
        <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
      </motion.div>

      {/* Info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-pulse-text">{profileUser.displayName}</h1>
          <p className="text-pulse-accent">@{profileUser.username}</p>
        </div>
        {profileUser.bio && <p className="text-pulse-text leading-relaxed text-sm">{profileUser.bio}</p>}
        <div className="flex flex-wrap gap-4 text-sm text-pulse-text-muted">
          {profileUser.location && (
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{profileUser.location}</span>
          )}
          {profileUser.website && (
            <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-pulse-accent hover:underline">
              <Link2 className="w-4 h-4" />{profileUser.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {profileUser.createdAt && (
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{t.profile.joinedDate} {formatDate(profileUser.createdAt, locale)}</span>
          )}
        </div>

        {/* Stats — clickable */}
        <div className="flex gap-5">
          {isOwnProfile ? (
            <Link href={`/profile/${profileUser.username}/following`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="font-bold text-pulse-text">{profileUser.followingCount}</span>
              <span className="text-sm text-pulse-text-muted">{t.profile.following}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-pulse-text">{profileUser.followingCount}</span>
              <span className="text-sm text-pulse-text-muted">{t.profile.following}</span>
            </div>
          )}
          {isOwnProfile ? (
            <Link href={`/profile/${profileUser.username}/followers`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="font-bold text-pulse-text">{profileUser.followersCount}</span>
              <span className="text-sm text-pulse-text-muted">{t.profile.followers}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-pulse-text">{profileUser.followersCount}</span>
              <span className="text-sm text-pulse-text-muted">{t.profile.followers}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-pulse-text">{profileUser.postsCount}</span>
            <span className="text-sm text-pulse-text-muted">{t.profile.posts}</span>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setTab('posts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
            tab === 'posts' ? 'border-pulse-accent text-pulse-accent' : 'border-transparent text-pulse-text-muted hover:text-pulse-text'
          }`}
        >
          <Grid3x3 className="w-4 h-4" />
          {t.profile.posts}
        </button>
        {isOwnProfile && (
          <button
            onClick={() => setTab('saved')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === 'saved' ? 'border-pulse-accent text-pulse-accent' : 'border-transparent text-pulse-text-muted hover:text-pulse-text'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            {dir === 'rtl' ? 'المحفوظات' : 'Saved'}
          </button>
        )}
      </div>

      {/* Posts / Saved */}
      <div className="space-y-4">
        {!isOwnProfile && tab === 'posts' && !canViewPosts && followChecked ? (
          <GlassCard className="text-center py-16">
            <Shield className="mx-auto mb-4 h-10 w-10 text-pulse-accent/30" />
            <p className="font-semibold text-pulse-text">
              {dir === 'rtl' ? 'المنشورات للمتابعين فقط' : 'Posts are followers-only'}
            </p>
            <p className="mt-2 text-sm text-pulse-text-muted">
              {dir === 'rtl'
                ? 'تابع هذا المستخدم أولًا عشان تظهر منشوراته عندك.'
                : 'Follow this user first to see their posts.'}
            </p>
          </GlassCard>
        ) : displayLoading || (!followChecked && tab === 'posts') ? (
          <FeedSkeleton count={2} />
        ) : displayPosts.length === 0 ? (
          <GlassCard className="text-center py-16">
            <p className="text-pulse-text-muted text-sm">{t.profile.noPostsYet}</p>
          </GlassCard>
        ) : (
          <AnimatePresence>
            {displayPosts.map((post) => (
              <PostCard key={post.id} post={post} onDeleted={refetch} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
