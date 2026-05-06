'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, Zap } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-pulse-bg">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 max-w-sm"
      >
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pulse-accent/20 to-pulse-accent-dark/10 border border-pulse-accent/30 flex items-center justify-center">
            <span className="text-4xl font-black gradient-text">404</span>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-pulse-text mb-2">الصفحة غير موجودة</h1>
          <p className="text-pulse-text-muted text-sm">Page not found</p>
        </div>
        <Link href="/home" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-pulse-accent to-pulse-accent-dark text-pulse-bg font-bold hover:shadow-lg hover:shadow-pulse-accent/30 transition-all">
          <Home className="w-4 h-4" />
          العودة للرئيسية
        </Link>
      </motion.div>
    </div>
  );
}
