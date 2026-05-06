'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

export function PostSkeleton() {
  return (
    <GlassCard padding="none" className="overflow-hidden">
      <div className="p-4 space-y-3 animate-pulse">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-white/10 rounded-full w-28" />
            <div className="h-2.5 bg-white/5 rounded-full w-20" />
          </div>
        </div>

        {/* Content lines */}
        <div className="space-y-2">
          <div className="h-3 bg-white/10 rounded-full w-full" />
          <div className="h-3 bg-white/10 rounded-full w-5/6" />
          <div className="h-3 bg-white/5 rounded-full w-3/4" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1 border-t border-white/5">
          <div className="h-7 bg-white/5 rounded-xl w-16" />
          <div className="h-7 bg-white/5 rounded-xl w-16" />
          <div className="h-7 bg-white/5 rounded-xl w-16" />
        </div>
      </div>
    </GlassCard>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}
