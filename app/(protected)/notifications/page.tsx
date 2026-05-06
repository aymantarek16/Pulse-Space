'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActivity } from '@/contexts/ActivityContext';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';

export default function NotificationsPage() {
  const { dir } = useLanguage();
  const {
    notifications,
    notificationsEnabled,
    notificationsLoading: loading,
    unreadNotifications: unreadCount,
    readNotification: read,
    readAllNotifications: readAll,
    removeNotification: remove,
  } = useActivity();

  return (
    <div className="space-y-4" dir={dir}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-pulse-accent" />
          <h1 className="text-lg font-bold gradient-text">
            {dir === 'rtl' ? 'الإشعارات' : 'Notifications'}
          </h1>
          {unreadCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-pulse-accent text-pulse-bg text-xs font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={readAll} className="gap-1.5 text-pulse-text-muted">
            <CheckCheck className="w-4 h-4" />
            {dir === 'rtl' ? 'قراءة الكل' : 'Mark all read'}
          </Button>
        )}
      </motion.div>

      {/* List */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        {!notificationsEnabled ? (
          <GlassCard className="text-center py-20">
            <Bell className="w-14 h-14 text-pulse-accent/20 mx-auto mb-4" />
            <p className="text-pulse-text font-semibold mb-1">
              {dir === 'rtl' ? 'الإشعارات متوقفة' : 'Notifications are off'}
            </p>
            <p className="text-sm text-pulse-text-muted">
              {dir === 'rtl' ? 'يمكنك تشغيلها مرة أخرى من صفحة الإعدادات.' : 'You can turn them back on from Settings.'}
            </p>
          </GlassCard>
        ) : loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/10 rounded-full w-3/4" />
                  <div className="h-2.5 bg-white/5 rounded-full w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <GlassCard className="text-center py-20">
            <Inbox className="w-14 h-14 text-pulse-accent/20 mx-auto mb-4" />
            <p className="text-pulse-text font-semibold mb-1">
              {dir === 'rtl' ? 'لا توجد إشعارات' : 'No notifications yet'}
            </p>
            <p className="text-sm text-pulse-text-muted">
              {dir === 'rtl' ? 'ستظهر إشعاراتك هنا' : "Your notifications will appear here"}
            </p>
          </GlassCard>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <AnimatePresence>
              {notifications.map((n, i) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={read}
                  onRemove={remove}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
