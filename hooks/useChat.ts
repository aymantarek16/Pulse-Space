'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  sendMediaMessage,
  sendStickerMessage,
  getOrCreateDirectConversation,
  markConversationRead,
} from '@/services/messages.service';
import { fileToDataUrl, uploadFile } from '@/lib/firebase/storage';
import type { Conversation, Message, MessageType } from '@/types';

const VOICE_UPLOAD_TIMEOUT_MS = 120000;
const VOICE_UPLOAD_STALL_TIMEOUT_MS = 8000;
const VOICE_INLINE_MAX_DATA_URL_LENGTH = 750000;

function createClientMessageId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getHiddenMessagesKey(userId: string) {
  return `pulsespace:hiddenMessages:${userId}`;
}

function getMessageMillis(message: Message) {
  const value = message.createdAt;
  if (!value) return 0;
  if (typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof (value as { seconds?: number }).seconds === 'number') {
    return (value as { seconds: number }).seconds * 1000;
  }
  if (value instanceof Date) return value.getTime();
  return new Date(value as unknown as string | number | Date).getTime() || 0;
}

function createOptimisticMessage({
  clientId,
  conversationId,
  senderId,
  content,
  type,
  mediaUrl,
  voiceDuration,
}: {
  clientId: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string | null;
  voiceDuration?: number;
}): Message {
  return {
    id: clientId,
    clientId,
    conversationId,
    senderId,
    content,
    type,
    mediaUrl: mediaUrl ?? null,
    readBy: [senderId],
    reactions: {},
    createdAt: new Date() as unknown as Message['createdAt'],
    ...(Number.isFinite(voiceDuration) ? { voiceDuration } : {}),
    optimistic: true,
  };
}

// ─── All conversations (real-time) ────────────────────────────────────────────

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }
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
  currentUserId: string | undefined,
  onConversationRead?: (conversationId: string) => Promise<void> | void
) {
  const [serverMessages, setServerMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const voicePreviewUrlsRef = useRef<Map<string, string>>(new Map());

  const revokeVoicePreviewUrl = useCallback((clientId: string) => {
    const previewUrl = voicePreviewUrlsRef.current.get(clientId);
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    voicePreviewUrlsRef.current.delete(clientId);
  }, []);

  const revokeAllVoicePreviewUrls = useCallback(() => {
    voicePreviewUrlsRef.current.forEach((previewUrl) => {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    });
    voicePreviewUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setHiddenMessageIds(new Set());
      return;
    }

    try {
      const raw = localStorage.getItem(getHiddenMessagesKey(currentUserId));
      const ids = raw ? JSON.parse(raw) : [];
      setHiddenMessageIds(new Set(Array.isArray(ids) ? ids.filter(Boolean) : []));
    } catch {
      setHiddenMessageIds(new Set());
    }
  }, [currentUserId]);

  useEffect(() => {
    return () => revokeAllVoicePreviewUrls();
  }, [revokeAllVoicePreviewUrls]);

  useEffect(() => {
    if (!conversationId) {
      setServerMessages([]);
      setOptimisticMessages([]);
      setLoading(false);
      revokeAllVoicePreviewUrls();
      return;
    }
    setLoading(true);
    setOptimisticMessages([]);
    revokeAllVoicePreviewUrls();
    const unsub = subscribeToMessages(conversationId, (data) => {
      setServerMessages(data);
      setLoading(false);
      // Auto-scroll to bottom
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });
    return () => unsub();
  }, [conversationId, revokeAllVoicePreviewUrls]);

  useEffect(() => {
    const confirmedClientIds = new Set(
      serverMessages
        .filter((message) => getMessageMillis(message) > 0)
        .map((message) => message.clientId)
        .filter((clientId): clientId is string => Boolean(clientId))
    );

    if (!confirmedClientIds.size) return;

    confirmedClientIds.forEach(revokeVoicePreviewUrl);

    setOptimisticMessages((current) =>
      current.filter((message) => !message.clientId || !confirmedClientIds.has(message.clientId))
    );
  }, [revokeVoicePreviewUrl, serverMessages]);

  const messages = useMemo(() => {
    const pendingClientIds = new Set(
      optimisticMessages
        .map((message) => message.clientId)
        .filter((clientId): clientId is string => Boolean(clientId))
    );
    const readyServerMessages = serverMessages.filter(
      (message) =>
        !message.clientId ||
        !pendingClientIds.has(message.clientId) ||
        getMessageMillis(message) > 0
    );
    const visibleServerMessages = readyServerMessages.filter(
      (message) =>
        !message.deletedForAll &&
        !hiddenMessageIds.has(message.id) &&
        (!currentUserId || !message.deletedFor?.includes(currentUserId))
    );
    const confirmedClientIds = new Set(
      visibleServerMessages
        .map((message) => message.clientId)
        .filter((clientId): clientId is string => Boolean(clientId))
    );
    const pendingMessages = optimisticMessages.filter(
      (message) => !message.clientId || !confirmedClientIds.has(message.clientId)
    );

    return [...visibleServerMessages, ...pendingMessages].sort(
      (a, b) => getMessageMillis(a) - getMessageMillis(b)
    );
  }, [currentUserId, hiddenMessageIds, serverMessages, optimisticMessages]);

  const pushOptimisticMessage = useCallback((message: Message) => {
    setOptimisticMessages((current) => [...current, message]);
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  }, []);

  const markOptimisticFailed = useCallback((clientId: string) => {
    setOptimisticMessages((current) =>
      current.map((message) =>
        message.clientId === clientId
          ? { ...message, optimistic: false, sendFailed: true }
          : message
      )
    );
  }, []);

  const hideMessagesLocally = useCallback(
    (messageIds: string[]) => {
      if (!currentUserId) return;
      const ids = messageIds.filter(Boolean);
      if (!ids.length) return;
      const idSet = new Set(ids);

      setOptimisticMessages((current) =>
        current.filter((message) => {
          const shouldHide =
            idSet.has(message.id) ||
            Boolean(message.clientId && idSet.has(message.clientId));
          if (shouldHide && message.clientId) revokeVoicePreviewUrl(message.clientId);
          return !shouldHide;
        })
      );

      setHiddenMessageIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.add(id));
        try {
          localStorage.setItem(getHiddenMessagesKey(currentUserId), JSON.stringify([...next]));
        } catch {}
        return next;
      });
    },
    [currentUserId, revokeVoicePreviewUrl]
  );

  const readConversation = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    if (onConversationRead) {
      await onConversationRead(conversationId);
      return;
    }
    await markConversationRead(conversationId, currentUserId);
  }, [conversationId, currentUserId, onConversationRead]);

  // Mark as read when conversation opens
  useEffect(() => {
    readConversation().catch(console.error);
  }, [readConversation]);

  useEffect(() => {
    if (!conversationId || !currentUserId || loading) return;
    const hasUnreadMessages = serverMessages.some(
      (message) =>
        !message.deletedForAll &&
        !message.deletedFor?.includes(currentUserId) &&
        message.senderId !== currentUserId &&
        !message.readBy?.includes(currentUserId)
    );

    if (hasUnreadMessages) {
      readConversation().catch(console.error);
    }
  }, [conversationId, currentUserId, loading, serverMessages, readConversation]);

  const send = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim();
      if (!conversationId || !currentUserId || !trimmedContent) return;

      const clientId = createClientMessageId();
      pushOptimisticMessage(
        createOptimisticMessage({
          clientId,
          conversationId,
          senderId: currentUserId,
          content: trimmedContent,
          type: 'text',
        })
      );

      void sendMessage(conversationId, currentUserId, trimmedContent, 'text', undefined, clientId)
        .catch((error) => {
          console.error('Message send failed:', error);
          markOptimisticFailed(clientId);
        });
    },
    [conversationId, currentUserId, markOptimisticFailed, pushOptimisticMessage]
  );

  const sendMedia = useCallback(
    async (
      mediaUrl: string,
      type: Extract<MessageType, 'image' | 'file' | 'audio'> = 'image',
      content?: string,
      options?: { voiceDuration?: number }
    ) => {
      if (!conversationId || !currentUserId) return;
      const clientId = createClientMessageId();
      const messageContent = content || mediaUrl;

      pushOptimisticMessage(
        createOptimisticMessage({
          clientId,
          conversationId,
          senderId: currentUserId,
          content: messageContent,
          type,
          mediaUrl,
          voiceDuration: options?.voiceDuration,
        })
      );

      void sendMediaMessage(conversationId, currentUserId, mediaUrl, type, content, clientId, options)
        .catch((error) => {
          console.error('Media message send failed:', error);
          markOptimisticFailed(clientId);
        });
    },
    [conversationId, currentUserId, markOptimisticFailed, pushOptimisticMessage]
  );

  const sendVoice = useCallback(
    async (
      file: File,
      previewUrl: string,
      duration: number,
      content = 'Voice message'
    ) => {
      if (!conversationId || !currentUserId) {
        if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
        return;
      }

      const clientId = createClientMessageId();
      if (previewUrl.startsWith('blob:')) {
        voicePreviewUrlsRef.current.set(clientId, previewUrl);
      }

      pushOptimisticMessage(
        createOptimisticMessage({
          clientId,
          conversationId,
          senderId: currentUserId,
          content,
          type: 'audio',
          mediaUrl: previewUrl,
          voiceDuration: duration,
        })
      );

      void (async () => {
        try {
          let uploadedUrl: string;
          try {
            uploadedUrl = await uploadFile(file, `uploads/${currentUserId}/messages/voice`, {
              timeoutMs: VOICE_UPLOAD_TIMEOUT_MS,
              stallTimeoutMs: VOICE_UPLOAD_STALL_TIMEOUT_MS,
              maxAttempts: 1,
            });
          } catch (storageError) {
            console.warn('Firebase Storage voice upload failed, using inline fallback:', storageError);
            uploadedUrl = await fileToDataUrl(file, {
              maxDataUrlLength: VOICE_INLINE_MAX_DATA_URL_LENGTH,
            });
          }

          await sendMediaMessage(
            conversationId,
            currentUserId,
            uploadedUrl,
            'audio',
            content,
            clientId,
            { voiceDuration: duration }
          );
        } catch (error) {
          console.error('Voice message send failed:', error);
          markOptimisticFailed(clientId);
        }
      })();
    },
    [conversationId, currentUserId, markOptimisticFailed, pushOptimisticMessage]
  );

  const sendSticker = useCallback(
    async (sticker: string) => {
      const trimmedSticker = sticker.trim();
      if (!conversationId || !currentUserId || !trimmedSticker) return;

      const clientId = createClientMessageId();
      pushOptimisticMessage(
        createOptimisticMessage({
          clientId,
          conversationId,
          senderId: currentUserId,
          content: trimmedSticker,
          type: 'sticker',
        })
      );

      void sendStickerMessage(conversationId, currentUserId, trimmedSticker, clientId)
        .catch((error) => {
          console.error('Sticker send failed:', error);
          markOptimisticFailed(clientId);
        });
    },
    [conversationId, currentUserId, markOptimisticFailed, pushOptimisticMessage]
  );

  return { messages, loading, send, sendMedia, sendVoice, sendSticker, hideMessagesLocally, bottomRef };
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
