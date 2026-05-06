'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  sendMediaMessage,
  sendStickerMessage,
  getOrCreateDirectConversation,
  markConversationRead,
} from '@/services/messages.service';
import type { Conversation, Message, MessageType } from '@/types';

// ─── All conversations (real-time) ────────────────────────────────────────────

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const unsub = subscribeToConversations(userId, (data) => {
      setConversations(data);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  return { conversations, loading };
}

// ─── Messages in a conversation (real-time) ───────────────────────────────────

export function useMessages(
  conversationId: string | undefined,
  currentUserId: string | undefined
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!conversationId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToMessages(conversationId, (data) => {
      setMessages(data);
      setLoading(false);
      // Auto-scroll to bottom
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });
    return () => unsub();
  }, [conversationId]);

  // Mark as read when conversation opens
  useEffect(() => {
    if (conversationId && currentUserId) {
      markConversationRead(conversationId, currentUserId).catch(console.error);
    }
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (!conversationId || !currentUserId || loading) return;
    const hasUnreadMessages = messages.some(
      (message) =>
        message.senderId !== currentUserId &&
        !message.readBy?.includes(currentUserId)
    );

    if (hasUnreadMessages) {
      markConversationRead(conversationId, currentUserId).catch(console.error);
    }
  }, [conversationId, currentUserId, loading, messages]);

  const send = useCallback(
    async (content: string) => {
      if (!conversationId || !currentUserId || !content.trim()) return;
      await sendMessage(conversationId, currentUserId, content.trim());
    },
    [conversationId, currentUserId]
  );

  const sendMedia = useCallback(
    async (
      mediaUrl: string,
      type: Extract<MessageType, 'image' | 'file'> = 'image',
      content?: string
    ) => {
      if (!conversationId || !currentUserId) return;
      await sendMediaMessage(conversationId, currentUserId, mediaUrl, type, content);
    },
    [conversationId, currentUserId]
  );

  const sendSticker = useCallback(
    async (sticker: string) => {
      if (!conversationId || !currentUserId || !sticker.trim()) return;
      await sendStickerMessage(conversationId, currentUserId, sticker);
    },
    [conversationId, currentUserId]
  );

  return { messages, loading, send, sendMedia, sendSticker, bottomRef };
}

// ─── Start or open DM ─────────────────────────────────────────────────────────

export function useStartDM() {
  const [loading, setLoading] = useState(false);

  const startDM = useCallback(
    async (currentUserId: string, targetUserId: string): Promise<string> => {
      setLoading(true);
      try {
        return await getOrCreateDirectConversation(currentUserId, targetUserId);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { startDM, loading };
}
