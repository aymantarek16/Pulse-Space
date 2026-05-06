'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-pulse-bg">
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-pulse-text mb-1">حدث خطأ ما</h2>
          <p className="text-sm text-pulse-text-muted">{error.message}</p>
        </div>
        <button onClick={reset} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-pulse-text hover:bg-white/10 transition-colors font-medium text-sm">
          <RefreshCw className="w-4 h-4" />
          حاول مرة أخرى / Try again
        </button>
      </div>
    </div>
  );
}
