import {
  Collections,
  createDocument,
  getDocument,
  deleteDocument,
  updateDocument,
  queryDocuments,
  subscribeToQuery,
  where,
  serverTimestamp,
  increment,
  db,
  arrayUnion,
} from '@/lib/firebase/firestore';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { getExternalUrl } from '@/lib/utils';
import type {
  Message,
  Conversation,
  User,
  MessageType,
  MessageReaction,
  MessageReactionEmoji,
} from '@/types';

export const MESSAGE_REACTION_EMOJIS: MessageReactionEmoji[] = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// ─── Get or create direct conversation ───────────────────────────────────────

export async function getOrCreateDirectConversation(
  userId1: string,
  userId2: string
): Promise<string> {
  const convId = [userId1, userId2].sort().join('_');

  let existing: Conversation | null = null;

  try {
    existing = await getDocument<Conversation>(Collections.CONVERSATIONS, convId);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'permission-denied') throw err;
  }

  if (!existing) {
    await setDoc(doc(db, Collections.CONVERSATIONS, convId), {
      id: convId,
      type: 'direct',
      participantIds: [userId1, userId2],
      lastMessage: null,
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return convId;
}

// ─── Create group conversation ────────────────────────────────────────────────

export async function createGroupConversation(
  creatorId: string,
  participantIds: string[],
  name: string
): Promise<string> {
  const allIds = [...new Set([creatorId, ...participantIds])];
  const ref = await addDoc(collection(db, Collections.CONVERSATIONS), {
    type: 'group',
    participantIds: allIds,
    name,
    lastMessage: null,
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Send message ─────────────────────────────────────────────────────────────

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  type: MessageType = 'text',
  mediaUrl?: string
): Promise<string> {
  const previewContent =
    type === 'text'
      ? content
      : type === 'sticker'
      ? `Sticker ${content}`
      : `📎 ${type}`;

  const ref = await addDoc(collection(db, Collections.MESSAGES), {
    conversationId,
    senderId,
    content,
    type,
    mediaUrl: getExternalUrl(mediaUrl),
    readBy: [senderId],
    reactions: {},
    createdAt: serverTimestamp(),
  });

  // Update conversation last message
  await updateDocument(Collections.CONVERSATIONS, conversationId, {
    lastMessage: {
      id: ref.id,
      content: previewContent,
      senderId,
      type,
    },
    lastMessageAt: serverTimestamp(),
  });

  return ref.id;
}

// ─── Send file message ────────────────────────────────────────────────────────

export async function sendMediaMessage(
  conversationId: string,
  senderId: string,
  mediaUrl: string,
  type: Extract<MessageType, 'image' | 'file'> = 'image',
  content?: string
): Promise<string> {
  const url = getExternalUrl(mediaUrl);
  if (!url) throw new Error('A valid HTTPS media URL is required.');

  return sendMessage(conversationId, senderId, content || url, type, url);
}

export async function sendStickerMessage(
  conversationId: string,
  senderId: string,
  sticker: string
): Promise<string> {
  const content = sticker.trim();
  if (!content) throw new Error('Sticker is required.');
  return sendMessage(conversationId, senderId, content, 'sticker');
}

// ─── Mark messages as read ────────────────────────────────────────────────────

export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  // Get unread messages and mark them
  const unread = await queryDocuments<Message>(Collections.MESSAGES, [
    where('conversationId', '==', conversationId),
  ]);
  const unreadForUser = unread.filter(
    (m) => m.senderId !== userId && !m.readBy?.includes(userId)
  );

  if (!unreadForUser.length) return;

  await Promise.all(
    unreadForUser.map((m) =>
      updateDocument(Collections.MESSAGES, m.id, {
        readBy: arrayUnion(userId),
      })
    )
  );

  await updateDocument(Collections.CONVERSATIONS, conversationId, {
    updatedAt: serverTimestamp(),
  });
}

// ─── Get user conversations ───────────────────────────────────────────────────

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const convs = await queryDocuments<Conversation>(Collections.CONVERSATIONS, [
    where('participantIds', 'array-contains', userId),
  ]);
  return enrichConversationsWithParticipants(sortConversationsByLastMessageAt(convs).slice(0, 30), userId);
}

// ─── Real-time conversations ──────────────────────────────────────────────────

export function subscribeToConversations(
  userId: string,
  callback: (convs: Conversation[]) => void
) {
  return subscribeToQuery<Conversation>(
    Collections.CONVERSATIONS,
    [
      where('participantIds', 'array-contains', userId),
    ],
    async (convs) => {
      const enriched = await enrichConversationsWithParticipants(
        sortConversationsByLastMessageAt(convs).slice(0, 30),
        userId
      );
      callback(enriched);
    }
  );
}

// ─── Real-time messages in a conversation ─────────────────────────────────────

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
) {
  return subscribeToQuery<Message>(
    Collections.MESSAGES,
    [
      where('conversationId', '==', conversationId),
    ],
    async (messages) => {
      const orderedMessages = sortMessagesByCreatedAt(messages).slice(-100);
      const enriched = await enrichMessagesWithSenders(orderedMessages);
      callback(enriched);
    }
  );
}

// ─── Get unread count per conversation ───────────────────────────────────────

export async function getUnreadCount(
  conversationId: string,
  userId: string
): Promise<number> {
  const msgs = await queryDocuments<Message>(Collections.MESSAGES, [
    where('conversationId', '==', conversationId),
  ]);
  return msgs.filter((m) => m.senderId !== userId && !m.readBy?.includes(userId)).length;
}

// ─── Delete message ───────────────────────────────────────────────────────────

export async function deleteMessage(messageId: string): Promise<void> {
  const { deleteDocument } = await import('@/lib/firebase/firestore');
  await deleteDocument(Collections.MESSAGES, messageId);
}

// ─── Message reactions ────────────────────────────────────────────────────────

export async function setMessageReaction(
  userId: string,
  messageId: string,
  emoji: MessageReactionEmoji | null
): Promise<void> {
  if (emoji && !MESSAGE_REACTION_EMOJIS.includes(emoji)) {
    throw new Error('Unsupported message reaction.');
  }

  const reactionId = `${userId}_${messageId}`;
  const existing = await getDocument<MessageReaction>(Collections.REACTIONS, reactionId);

  if (!emoji || existing?.type === emoji) {
    if (existing) await deleteDocument(Collections.REACTIONS, reactionId);
    return;
  }

  if (existing) {
    await deleteDocument(Collections.REACTIONS, reactionId);
  }

  await createDocument(Collections.REACTIONS, reactionId, {
    userId,
    targetId: messageId,
    targetType: 'message',
    type: emoji,
  });
}

export function subscribeToMessageReactions(
  messageId: string,
  callback: (reactions: Record<string, MessageReactionEmoji>) => void
) {
  return subscribeToQuery<MessageReaction>(
    Collections.REACTIONS,
    [
      where('targetId', '==', messageId),
    ],
    (reactions) => {
      const map: Record<string, MessageReactionEmoji> = {};
      reactions.forEach((reaction) => {
        if (
          reaction.targetType === 'message' &&
          MESSAGE_REACTION_EMOJIS.includes(reaction.type)
        ) {
          map[reaction.userId] = reaction.type;
        }
      });
      callback(map);
    }
  );
}

// ─── Search conversations ─────────────────────────────────────────────────────

export async function searchConversations(
  userId: string,
  query: string
): Promise<Conversation[]> {
  const all = await getUserConversations(userId);
  const q = query.toLowerCase();
  return all.filter((c) => {
    const name = c.name || c.participants?.map((p) => p.displayName).join(' ') || '';
    return name.toLowerCase().includes(q);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function enrichConversationsWithParticipants(
  convs: Conversation[],
  currentUserId: string
): Promise<Conversation[]> {
  return Promise.all(
    convs.map(async (conv) => {
      const otherIds = conv.participantIds.filter((id) => id !== currentUserId);
      const [participants, unreadCount] = await Promise.all([
        Promise.all(otherIds.map((uid) => getDocument<User>(Collections.USERS, uid))),
        conv.lastMessage && (conv.lastMessage as any).senderId !== currentUserId
          ? getUnreadCount(conv.id, currentUserId).catch(() => 0)
          : Promise.resolve(0),
      ]);
      return {
        ...conv,
        participants: participants.filter((p): p is User => p !== null),
        unreadCount,
      };
    })
  );
}

async function enrichMessagesWithSenders(messages: Message[]): Promise<Message[]> {
  const senderIds = [...new Set(messages.map((m) => m.senderId))];
  const senders: Record<string, User> = {};
  await Promise.all(
    senderIds.map(async (uid) => {
      const user = await getDocument<User>(Collections.USERS, uid);
      if (user) senders[uid] = user;
    })
  );
  return messages.map((m) => ({ ...m, sender: senders[m.senderId] }));
}

function sortMessagesByCreatedAt(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt)
  );
}

function sortConversationsByLastMessageAt(convs: Conversation[]): Conversation[] {
  return [...convs].sort(
    (a, b) => getTimestampMillis(b.lastMessageAt) - getTimestampMillis(a.lastMessageAt)
  );
}

function getTimestampMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof (value as { seconds?: number }).seconds === 'number') {
    return (value as { seconds: number }).seconds * 1000;
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}
