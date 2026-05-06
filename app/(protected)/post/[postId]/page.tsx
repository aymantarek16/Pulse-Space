'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getPostWithAuthor } from '@/services/posts.service';
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
  const { dir } = useLanguage();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!postId) return;
    getPostWithAuthor(postId)
      .then(setPost)
      .finally(() => setLoading(false));
  }, [postId]);

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
