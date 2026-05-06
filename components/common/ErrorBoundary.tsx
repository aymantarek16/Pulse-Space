'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 text-center p-8">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <p className="text-pulse-text font-semibold mb-1">حدث خطأ غير متوقع</p>
            <p className="text-sm text-pulse-text-muted mb-4">
              {this.state.error?.message || 'Something went wrong'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-pulse-text hover:bg-white/10 transition-colors mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              حاول مرة أخرى / Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
