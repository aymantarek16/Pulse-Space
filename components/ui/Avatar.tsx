'use client';

import React from 'react';
import Image from 'next/image';
import { cn, getExternalUrl } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  ring?: boolean;
  online?: boolean;
}

const sizeMap = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
  '2xl': 'h-28 w-28 text-3xl',
};

const sizePixels = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
  '2xl': 112,
};

export function Avatar({
  src,
  name,
  size = 'md',
  className,
  ring = false,
  online = false,
}: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  const px = sizePixels[size];
  const safeSrc = getExternalUrl(src);
  const isInlineImage = safeSrc?.startsWith('data:image/');

  return (
    <div className={cn('relative flex-shrink-0', sizeMap[size], className)}>
      <div
        className={cn(
          'w-full h-full rounded-full overflow-hidden',
          'bg-gradient-to-br from-pulse-accent/20 to-pulse-accent-dark/20',
          'flex items-center justify-center font-semibold text-pulse-accent',
          ring && 'ring-2 ring-pulse-accent/50 ring-offset-2 ring-offset-pulse-bg'
        )}
      >
        {isInlineImage ? (
          <img
            src={safeSrc || undefined}
            alt={name || 'User'}
            className="w-full h-full object-cover"
          />
        ) : safeSrc ? (
          <Image
            src={safeSrc}
            alt={name || 'User'}
            width={px}
            height={px}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 end-0 h-3 w-3 rounded-full bg-green-400 border-2 border-pulse-bg" />
      )}
    </div>
  );
}
