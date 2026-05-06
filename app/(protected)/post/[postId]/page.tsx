'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import { getPostWithAuthor } from '@/services/posts.service';
import { isFollowing } from '@/services/follows.service';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PostCard } from '@/components/post/PostCard';
import { PostSkeleton } from '@/components/feed/PostSkeleton';
import { CommentSection } from '@/components/comments/CommentSection';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import type { Post } from '@/types';

export default function PostPage() {
  const params = useParams();
  const postId = params?.postId as string;
  const { user } = useAuth();
  const { dir } = useLanguage();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [canViewPost, setCanViewPost] = useState(false);

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;

    async function loadPost() {
      setLoading(true);
      setCanViewPost(false);
      const nextPost = await getPostWithAuthor(postId);
      if (cancelled) return;

      setPost(nextPost);

      if (!nextPost || !user?.uid) {
        setLoading(false);
        return;
      }

      if (nextPost.authorId === user.uid) {
        setCanViewPost(true);
        setLoading(false);
        return;
      }

      const followsAuthor = await isFollowing(user.uid, nextPost.authorId).catch(() => false);
      if (!cancelled) {
        setCanViewPost(followsAuthor);
        setLoading(false);
      }
    }

    loadPost().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [postId, user?.uid]);

  return (
    <div className="space-y-4" dir={dir}>
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
        <BackIcon className="w-4 h-4" />
        {dir === 'rtl' ? 'رجوع' : 'Back'}
      </Button>

      {loading ? (
        <PostSkeleton />
      ) : !post ? (
        <GlassCard className="text-center py-20">
          <p className="text-pulse-text-muted">
            {dir === 'rtl' ? 'المنشور غير موجود' : 'Post not found'}
          </p>
        </GlassCard>
      ) : !canViewPost ? (
        <GlassCard className="text-center py-20">
          <Shield className="mx-auto mb-4 h-10 w-10 text-pulse-accent/30" />
          <p className="font-semibold text-pulse-text">
            {dir === 'rtl' ? 'هذا المنشور للمتابعين فقط' : 'This post is followers-only'}
          </p>
          <p className="mt-2 text-sm text-pulse-text-muted">
            {dir === 'rtl'
              ? 'لا يمكنك عرض منشورات شخص غير متابعه.'
              : "You can't view posts from someone you don't follow."}
          </p>
        </GlassCard>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <PostCard post={post} />
          <GlassCard padding="none">
            <div className="px-4 pt-3 pb-1">
              <h2 className="text-sm font-semibold text-pulse-text-muted">
                {dir === 'rtl' ? 'التعليقات' : 'Comments'}
              </h2>
            </div>
            <CommentSection postId={post.id} />
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
