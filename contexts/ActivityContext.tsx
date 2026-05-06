'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useChat';
import { useNotifications } from '@/hooks/useNotifications';
import { markConversationRead as markConversationReadService } from '@/services/messages.service';
import type { Conversation, Notification as AppNotification } from '@/types';

interface ActivityContextValue {
  conversations: Conversation[];
  conversationsLoading: boolean;
  notifications: AppNotification[];
  notificationsEnabled: boolean;
  notificationsLoading: boolean;
  unreadMessages: number;
  unreadNotifications: number;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  markConversationRead: (conversationId: string, lastMessageId?: string | null) => Promise<void>;
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
  activeConversationId: null,
  setActiveConversationId: () => {},
  markConversationRead: async () => {},
  readNotification: async () => {},
  readAllNotifications: async () => {},
  removeNotification: async () => {},
};

const ActivityContext = createContext<ActivityContextValue>(defaultActivity);

const READ_RECEIPTS_KEY_PREFIX = 'pulsespace:messageReadReceipts';

function getReadReceiptsKey(userId: string) {
  return `${READ_RECEIPTS_KEY_PREFIX}:${userId}`;
}

function loadReadReceipts(userId: string): Record<string, string | null> {
  try {
    const raw = window.localStorage.getItem(getReadReceiptsKey(userId));
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === 'string' || value === null)
    ) as Record<string, string | null>;
  } catch {
    return {};
  }
}

function saveReadReceipts(userId: string, receipts: Record<string, string | null>) {
  try {
    window.localStorage.setItem(getReadReceiptsKey(userId), JSON.stringify(receipts));
  } catch {}
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const notificationsEnabled = user?.notificationSettings?.inApp !== false;
  const { conversations, loading: conversationsLoading } = useConversations(user?.uid);
  const conversationsRef = useRef<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [readReceipts, setReadReceipts] = useState<Record<string, string | null>>({});
  const {
    notifications,
    loading: notificationsLoading,
    unreadCount,
    read,
    readAll,
    remove,
  } = useNotifications(user?.uid, notificationsEnabled);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (!user?.uid) {
      setReadReceipts({});
      return;
    }

    setReadReceipts(loadReadReceipts(user.uid));
  }, [user?.uid]);

  const markConversationRead = useCallback(async (
    conversationId: string,
    lastMessageId?: string | null
  ) => {
    const conversation = conversationsRef.current.find((item) => item.id === conversationId);
    const readThroughMessageId = lastMessageId ?? conversation?.lastMessage?.id ?? null;

    setReadReceipts((prev) => {
      const next = {
        ...prev,
        [conversationId]: readThroughMessageId,
      };
      if (user?.uid) saveReadReceipts(user.uid, next);
      return next;
    });

    if (!user?.uid) return;

    await markConversationReadService(conversationId, user.uid);
  }, [user?.uid]);

  useEffect(() => {
    if (!activeConversationId) return;

    const activeConversation = conversations.find((item) => item.id === activeConversationId);
    const activeLastMessageId = activeConversation?.lastMessage?.id ?? null;

    if (!activeLastMessageId || readReceipts[activeConversationId] === activeLastMessageId) {
      return;
    }

    markConversationRead(activeConversationId, activeLastMessageId).catch(console.error);
  }, [activeConversationId, conversations, markConversationRead, readReceipts]);

  const conversationsWithReadState = useMemo(
    () => conversations.map((conversation) => {
      const lastMessageId = conversation.lastMessage?.id ?? null;
      const localReceiptMatchesLastMessage =
        Object.prototype.hasOwnProperty.call(readReceipts, conversation.id) &&
        readReceipts[conversation.id] === lastMessageId;
      const shouldClearUnread =
        conversation.id === activeConversationId || localReceiptMatchesLastMessage;

      if (!shouldClearUnread || !conversation.unreadCount) return conversation;
      return { ...conversation, unreadCount: 0 };
    }),
    [activeConversationId, conversations, readReceipts]
  );

  const unreadMessages = useMemo(
    () => conversationsWithReadState.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0),
    [conversationsWithReadState]
  );

  const value = useMemo<ActivityContextValue>(
    () => ({
      conversations: conversationsWithReadState,
      conversationsLoading,
      notifications,
      notificationsEnabled,
      notificationsLoading,
      unreadMessages,
      unreadNotifications: unreadCount,
      activeConversationId,
      setActiveConversationId,
      markConversationRead,
      readNotification: read,
      readAllNotifications: readAll,
      removeNotification: remove,
    }),
    [
      activeConversationId,
      conversationsLoading,
      conversationsWithReadState,
      markConversationRead,
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
