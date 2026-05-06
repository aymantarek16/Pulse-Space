import {
  Collections,
  getDocument,
  createDocument,
  deleteDocument,
  updateDocument,
  queryDocuments,
  increment,
  where,
  limit,
} from '@/lib/firebase/firestore';
import { createNotification } from '@/services/notifications.service';
import type { Follow, User } from '@/types';

// ─── Follow ───────────────────────────────────────────────────────────────────

export async function followUser(
  followerId: string,
  followingId: string
): Promise<void> {
  if (followerId === followingId) return;
  const id = `${followerId}_${followingId}`;

  await createDocument(Collections.FOLLOWS, id, {
    followerId,
    followingId,
  });
  await Promise.all([
    updateDocument(Collections.USERS, followerId, { followingCount: increment(1) }),
    updateDocument(Collections.USERS, followingId, { followersCount: increment(1) }),
    createNotification({
      recipientId: followingId,
      senderId: followerId,
      type: 'follow',
      message: 'بدأ بمتابعتك',
    }),
  ]);
}

// ─── Unfollow ─────────────────────────────────────────────────────────────────

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<void> {
  const id = `${followerId}_${followingId}`;
  await deleteDocument(Collections.FOLLOWS, id);
  await Promise.all([
    updateDocument(Collections.USERS, followerId, { followingCount: increment(-1) }),
    updateDocument(Collections.USERS, followingId, { followersCount: increment(-1) }),
  ]);
}

// ─── Check follow status ──────────────────────────────────────────────────────

export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const doc = await getDocument(Collections.FOLLOWS, `${followerId}_${followingId}`);
  return !!doc;
}

// ─── Bulk check — am I following these users? ─────────────────────────────────

export async function getFollowingMap(
  currentUserId: string,
  userIds: string[]
): Promise<Record<string, boolean>> {
  const map: Record<string, boolean> = {};
  await Promise.all(
    userIds.map(async (uid) => {
      map[uid] = await isFollowing(currentUserId, uid);
    })
  );
  return map;
}

// ─── Get followers list (with User objects) ───────────────────────────────────

export async function getFollowersWithUsers(userId: string): Promise<User[]> {
  const follows = await queryDocuments<Follow>(Collections.FOLLOWS, [
    where('followingId', '==', userId),
    limit(160),
  ]);
  return fetchUsers(sortFollowsByCreatedAt(follows).slice(0, 100).map((f) => f.followerId));
}

// ─── Get following list (with User objects) ───────────────────────────────────

export async function getFollowingWithUsers(userId: string): Promise<User[]> {
  const follows = await queryDocuments<Follow>(Collections.FOLLOWS, [
    where('followerId', '==', userId),
    limit(160),
  ]);
  return fetchUsers(sortFollowsByCreatedAt(follows).slice(0, 100).map((f) => f.followingId));
}

// ─── Get IDs only ─────────────────────────────────────────────────────────────

export async function getFollowers(userId: string): Promise<string[]> {
  const follows = await queryDocuments<Follow>(Collections.FOLLOWS, [
    where('followingId', '==', userId),
    limit(200),
  ]);
  return follows.map((f) => f.followerId);
}

export async function getFollowing(userId: string): Promise<string[]> {
  const follows = await queryDocuments<Follow>(Collections.FOLLOWS, [
    where('followerId', '==', userId),
    limit(200),
  ]);
  return follows.map((f) => f.followingId);
}

// ─── Suggested users (not yet following) ─────────────────────────────────────

export async function getSuggestedUsers(
  currentUserId: string,
  followingIds: string[]
): Promise<User[]> {
  void currentUserId;
  void followingIds;
  return [];
}

// ─── Get followed-user posts feed (Following feed) ────────────────────────────

export async function getFollowingFeedUserIds(userId: string): Promise<string[]> {
  const ids = await getFollowing(userId);
  return ids;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function fetchUsers(uids: string[]): Promise<User[]> {
  if (!uids.length) return [];
  const users = await Promise.all(
    uids.map((uid) => getDocument<User>(Collections.USERS, uid))
  );
  return users.filter((u): u is User => u !== null);
}

function sortFollowsByCreatedAt(follows: Follow[]): Follow[] {
  return [...follows].sort(
    (a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt)
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
