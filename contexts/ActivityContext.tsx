'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useChat';
import { useNotifications } from '@/hooks/useNotifications';
import type { Conversation, Notification as AppNotification } from '@/types';

interface ActivityContextValue {
  conversations: Conversation[];
  conversationsLoading: boolean;
  notifications: AppNotification[];
  notificationsEnabled: boolean;
  notificationsLoading: boolean;
  unreadMessages: number;
  unreadNotifications: number;
  readNotification: (id: string) => Promise<void>;
  readAllNotifications: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
}

const defaultActivity: ActivityContextValue = {
  conversations: [],
  conversationsLoading: false,
  notifications: [],
  notificationsEnabled: false,
  notificationsLoading: false,
  unreadMessages: 0,
  unreadNotifications: 0,
  readNotification: async () => {},
  readAllNotifications: async () => {},
  removeNotification: async () => {},
};

const ActivityContext = createContext<ActivityContextValue>(defaultActivity);

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const notificationsEnabled = user?.notificationSettings?.inApp !== false;
  const { conversations, loading: conversationsLoading } = useConversations(user?.uid);
  const {
    notifications,
    loading: notificationsLoading,
    unreadCount,
    read,
    readAll,
    remove,
  } = useNotifications(user?.uid, notificationsEnabled);

  const unreadMessages = useMemo(
    () => conversations.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0),
    [conversations]
  );

  const value = useMemo<ActivityContextValue>(
    () => ({
      conversations,
      conversationsLoading,
      notifications,
      notificationsEnabled,
      notificationsLoading,
      unreadMessages,
      unreadNotifications: unreadCount,
      readNotification: read,
      readAllNotifications: readAll,
      removeNotification: remove,
    }),
    [
      conversations,
      conversationsLoading,
      notifications,
      notificationsEnabled,
      notificationsLoading,
      read,
      readAll,
      remove,
      unreadCount,
      unreadMessages,
    ]
  );

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  return useContext(ActivityContext);
}
