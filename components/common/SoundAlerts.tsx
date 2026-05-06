'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActivity } from '@/contexts/ActivityContext';
import {
  playMessageSound,
  playNotificationSound,
  unlockAppAudio,
} from '@/lib/sounds';

export function SoundAlerts() {
  const { user } = useAuth();
  const soundEnabled = user?.notificationSettings?.sound !== false;
  const {
    notifications,
    notificationsEnabled,
    unreadNotifications,
    notificationsLoading,
    conversations,
    conversationsLoading,
  } = useActivity();

  const notificationsReadyRef = useRef(false);
  const conversationsReadyRef = useRef(false);
  const previousUnreadNotificationsRef = useRef(0);
  const previousNotificationIdsRef = useRef<Set<string>>(new Set());
  const previousLastMessageIdsRef = useRef<Record<string, string | null>>({});
  const lastSoundAtRef = useRef(0);

  useEffect(() => {
    notificationsReadyRef.current = false;
    conversationsReadyRef.current = false;
    previousUnreadNotificationsRef.current = 0;
    previousNotificationIdsRef.current = new Set();
    previousLastMessageIdsRef.current = {};
    lastSoundAtRef.current = 0;
  }, [user?.uid]);

  useEffect(() => {
    if (!soundEnabled) return;

    const unlock = () => {
      void unlockAppAudio();
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [soundEnabled]);

  useEffect(() => {
    if (!user?.uid || !notificationsEnabled || notificationsLoading) return;

    if (!notificationsReadyRef.current) {
      notificationsReadyRef.current = true;
      previousUnreadNotificationsRef.current = unreadNotifications;
      previousNotificationIdsRef.current = new Set(notifications.map((item) => item.id));
      return;
    }

    const hasNewUnreadNotification = notifications.some((item) => {
      return !item.isRead && !previousNotificationIdsRef.current.has(item.id);
    });

    if (
      hasNewUnreadNotification ||
      unreadNotifications > previousUnreadNotificationsRef.current
    ) {
      playWithThrottle(() => playNotificationSound(soundEnabled));
    }

    previousUnreadNotificationsRef.current = unreadNotifications;
    previousNotificationIdsRef.current = new Set(notifications.map((item) => item.id));
  }, [
    notifications,
    notificationsEnabled,
    notificationsLoading,
    soundEnabled,
    unreadNotifications,
    user?.uid,
  ]);

  useEffect(() => {
    if (!user?.uid || conversationsLoading) return;

    const nextLastMessageIds: Record<string, string | null> = {};
    let hasIncomingMessage = false;

    conversations.forEach((conversation) => {
      const lastMessage = conversation.lastMessage;
      const lastMessageId = lastMessage?.id ?? null;
      nextLastMessageIds[conversation.id] = lastMessageId;

      if (!conversationsReadyRef.current || !lastMessageId) return;

      const previousId = previousLastMessageIdsRef.current[conversation.id] ?? null;
      if (lastMessageId !== previousId && lastMessage?.senderId !== user.uid) {
        hasIncomingMessage = true;
      }
    });

    if (!conversationsReadyRef.current) {
      conversationsReadyRef.current = true;
      previousLastMessageIdsRef.current = nextLastMessageIds;
      return;
    }

    previousLastMessageIdsRef.current = nextLastMessageIds;

    if (hasIncomingMessage) {
      playWithThrottle(() => playMessageSound(soundEnabled));
    }
  }, [conversations, conversationsLoading, soundEnabled, user?.uid]);

  function playWithThrottle(play: () => boolean) {
    if (!soundEnabled) return;

    const now = Date.now();
    if (now - lastSoundAtRef.current < 650) return;

    const played = play();
    if (played) {
      lastSoundAtRef.current = now;
    }
  }

  return null;
}
