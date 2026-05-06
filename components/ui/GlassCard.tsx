'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: boolean;
  dir?: 'rtl' | 'ltr';
}

export function GlassCard({
  children,
  className,
  hover = false,
  padding = 'md',
  glow = false,
  dir,
}: GlassCardProps) {
  return (
    <div
      dir={dir}
      className={cn(
        'rounded-2xl border border-white/10',
        'bg-white/5 backdrop-blur-glass',
        'transition-all duration-300',
        hover && 'hover:bg-white/[0.08] hover:border-white/[0.15] hover:shadow-lg cursor-pointer',
        glow && 'shadow-lg shadow-pulse-accent/10 border-pulse-accent/20',
        padding === 'none' && 'p-0',
        padding === 'sm' && 'p-3',
        padding === 'md' && 'p-5',
        padding === 'lg' && 'p-8',
        className
      )}
    >
      {children}
    </div>
  );
}
