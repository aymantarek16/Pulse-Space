'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Shield } from 'lucide-react';
import { useUserByUsername } from '@/hooks/useUser';
import { useFollowing } from '@/hooks/useFollow';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserList } from '@/components/follow/UserCard';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { GlassCard } from '@/components/ui/GlassCard';

export default function FollowingPage() {
  const params = useParams();
  const username = params?.username as string;
  const { user: currentUser } = useAuth();
  const { user: profileUser, loading: userLoading } = useUserByUsername(username);
  const isOwnProfile = currentUser?.uid === profileUser?.uid;
  const { users, loading } = useFollowing(isOwnProfile ? profileUser?.uid : undefined);
  const { dir } = useLanguage();
  const router = useRouter();

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-4" dir={dir}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <BackIcon className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2.5">
          {!userLoading && profileUser && (
            <Avatar src={profileUser.avatarUrl} name={profileUser.displayName} size="sm" />
          )}
          <div>
            <h1 className="text-lg font-bold text-pulse-text">
              {dir === 'rtl' ? 'يتابع' : 'Following'}
            </h1>
            {profileUser && (
              <p className="text-xs text-pulse-text-muted">
                {profileUser.followingCount} {dir === 'rtl' ? 'يتابع' : 'following'}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {!userLoading && profileUser && !isOwnProfile ? (
          <GlassCard className="text-center py-16">
            <Shield className="mx-auto mb-4 h-10 w-10 text-pulse-accent/30" />
            <p className="font-semibold text-pulse-text">
              {dir === 'rtl' ? 'قائمة المتابعة خاصة' : 'Following list is private'}
            </p>
            <p className="mt-2 text-sm text-pulse-text-muted">
              {dir === 'rtl'
                ? 'لا يمكن اكتشاف المستخدمين من قوائم حسابات الآخرين.'
                : "Users can't be discovered from other people's lists."}
            </p>
          </GlassCard>
        ) : (
          <UserList
            users={users}
            currentUserId={currentUser?.uid}
            loading={loading}
            emptyMessage={dir === 'rtl' ? 'لا يتابع أحداً بعد' : 'Not following anyone yet'}
          />
        )}
      </motion.div>
    </div>
  );
}
