'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, icon, iconPosition = 'left', className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-pulse-text-muted">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-pulse-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full h-11 rounded-xl bg-white/5 border text-pulse-text placeholder:text-pulse-text-muted/50',
              'focus:outline-none focus:ring-2 focus:ring-pulse-accent/50 focus:border-pulse-accent/50',
              'transition-all duration-200 text-sm',
              error
                ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50'
                : 'border-white/10 hover:border-white/20',
              icon && iconPosition === 'left' && 'ps-10',
              icon && iconPosition === 'right' && 'pe-10',
              !icon && 'px-4',
              className
            )}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute inset-y-0 end-3 flex items-center pointer-events-none text-pulse-text-muted">
              {icon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
        {helper && !error && (
          <p className="text-xs text-pulse-text-muted">{helper}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ─── Textarea ──────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helper, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-pulse-text-muted">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full rounded-xl bg-white/5 border text-pulse-text placeholder:text-pulse-text-muted/50',
            'focus:outline-none focus:ring-2 focus:ring-pulse-accent/50 focus:border-pulse-accent/50',
            'transition-all duration-200 text-sm px-4 py-3 resize-none',
            error
              ? 'border-red-500/50 focus:ring-red-500/30'
              : 'border-white/10 hover:border-white/20',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">⚠ {error}</p>}
        {helper && !error && <p className="text-xs text-pulse-text-muted">{helper}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
