import {
  Collections,
  getDocument,
  updateDocument,
  queryDocuments,
  subscribeToQuery,
  where,
  orderBy,
  limit,
  serverTimestamp,
  db,
} from '@/lib/firebase/firestore';
import { addDoc, collection, writeBatch, doc } from 'firebase/firestore';
import type { Notification, NotificationType, User } from '@/types';

// ─── Create notification ──────────────────────────────────────────────────────

export async function createNotification(data: {
  recipientId: string;
  senderId: string;
  type: NotificationType;
  targetId?: string;
  targetType?: 'post' | 'comment' | 'space';
  message: string;
}): Promise<void> {
  if (data.recipientId === data.senderId) return;
  await addDoc(collection(db, Collections.NOTIFICATIONS), {
    ...data,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

// ─── Mark single as read ──────────────────────────────────────────────────────

export async function markAsRead(notificationId: string): Promise<void> {
  await updateDocument(Collections.NOTIFICATIONS, notificationId, { isRead: true });
}

// ─── Mark all as read ─────────────────────────────────────────────────────────

export async function markAllAsRead(userId: string): Promise<void> {
  const unread = await queryDocuments<Notification>(Collections.NOTIFICATIONS, [
    where('recipientId', '==', userId),
    where('isRead', '==', false),
    limit(50),
  ]);
  if (!unread.length) return;
  const batch = writeBatch(db);
  unread.forEach((n) => {
    batch.update(doc(db, Collections.NOTIFICATIONS, n.id), { isRead: true });
  });
  await batch.commit();
}

// ─── Subscribe real-time ──────────────────────────────────────────────────────

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
) {
  return subscribeToQuery<Notification>(
    Collections.NOTIFICATIONS,
    [
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(40),
    ],
    async (notifications) => {
      callback(await enrichNotificationsWithSenders(notifications));
    }
  );
}

// ─── Get unread count ─────────────────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  const items = await queryDocuments<Notification>(Collections.NOTIFICATIONS, [
    where('recipientId', '==', userId),
    where('isRead', '==', false),
    limit(99),
  ]);
  return items.length;
}

// ─── Delete notification ──────────────────────────────────────────────────────

export async function deleteNotification(id: string): Promise<void> {
  const { deleteDocument } = await import('@/lib/firebase/firestore');
  await deleteDocument(Collections.NOTIFICATIONS, id);
}

async function enrichNotificationsWithSenders(
  notifications: Notification[]
): Promise<Notification[]> {
  if (!notifications.length) return [];
  const senderIds = [...new Set(notifications.map((n) => n.senderId))];
  const senders: Record<string, User> = {};

  await Promise.all(
    senderIds.map(async (uid) => {
      const user = await getDocument<User>(Collections.USERS, uid);
      if (user) senders[uid] = user;
    })
  );

  return notifications.map((notification) => ({
    ...notification,
    sender: senders[notification.senderId],
  }));
}
