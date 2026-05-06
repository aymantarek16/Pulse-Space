'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        // Base
        'relative inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-pulse-accent/50',
        // Variants
        variant === 'primary' && [
          'bg-gradient-to-r from-pulse-accent to-pulse-accent-dark text-pulse-bg',
          'hover:shadow-lg hover:shadow-pulse-accent/30 hover:scale-[1.02]',
          'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        ],
        variant === 'secondary' && [
          'bg-pulse-muted text-pulse-text border border-pulse-border',
          'hover:bg-pulse-surface hover:border-pulse-accent/30',
          'active:scale-[0.98] disabled:opacity-50',
        ],
        variant === 'ghost' && [
          'bg-transparent text-pulse-text-muted',
          'hover:bg-white/5 hover:text-pulse-text',
          'active:scale-[0.98] disabled:opacity-50',
        ],
        variant === 'danger' && [
          'bg-red-500/20 text-red-400 border border-red-500/30',
          'hover:bg-red-500/30 hover:border-red-500/50',
          'active:scale-[0.98] disabled:opacity-50',
        ],
        variant === 'glass' && [
          'bg-white/5 backdrop-blur-glass text-pulse-text border border-white/10',
          'hover:bg-white/10 hover:border-white/20',
          'active:scale-[0.98] disabled:opacity-50',
        ],
        // Sizes
        size === 'sm' && 'h-8 px-3 text-sm gap-1.5',
        size === 'md' && 'h-10 px-4 text-sm gap-2',
        size === 'lg' && 'h-12 px-6 text-base gap-2',
        size === 'icon' && 'h-10 w-10 p-0',
        // Full width
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </span>
          <span className="opacity-0">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
