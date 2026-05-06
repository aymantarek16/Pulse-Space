'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '@/services/notifications.service';
import type { Notification } from '@/types';

export function useNotifications(userId: string | undefined, enabled = true) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId || !enabled) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    const unsub = subscribeToNotifications(userId, (data) => {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
      setLoading(false);
    });
    return () => unsub();
  }, [userId, enabled]);

  const read = useCallback(async (id: string) => {
    await markAsRead(id);
  }, []);

  const readAll = useCallback(async () => {
    if (!userId) return;
    await markAllAsRead(userId);
  }, [userId]);

  const remove = useCallback(async (id: string) => {
    await deleteNotification(id);
  }, []);

  return { notifications, loading, unreadCount, read, readAll, remove };
}
