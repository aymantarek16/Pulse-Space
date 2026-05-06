import {
  Collections,
  createDocument,
  getDocument,
  updateDocument,
  queryDocuments,
  subscribeToDocument,
  where,
  limit,
} from '@/lib/firebase/firestore';
import { getExternalUrl } from '@/lib/utils';
import type { User, EditProfileFormData } from '@/types';

// ─── Create user profile ──────────────────────────────────────────────────────

export async function createUserProfile(
  uid: string,
  data: {
    email: string;
    displayName: string;
    avatarUrl?: string | null;
  }
): Promise<void> {
  await createDocument(Collections.USERS, uid, {
    uid,
    email: data.email,
    displayName: data.displayName,
    username: '',
    bio: '',
    avatarUrl: getExternalUrl(data.avatarUrl) || null,
    coverUrl: null,
    verified: false,
    role: 'user',
    language: 'ar',
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    isOnboarded: false,
    website: '',
    location: '',
    notificationSettings: {
      inApp: true,
      email: false,
      sound: true,
      browser: false,
    },
    privacySettings: {
      publicProfile: true,
      showOnlineStatus: true,
      allowDirectMessages: true,
    },
  });
}

// ─── Get user by UID ──────────────────────────────────────────────────────────

export async function getUserById(uid: string): Promise<User | null> {
  return getDocument<User>(Collections.USERS, uid);
}

// ─── Get user by username ─────────────────────────────────────────────────────

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await queryDocuments<User>(Collections.USERS, [
    where('username', '==', username.toLowerCase()),
    limit(1),
  ]);
  return users[0] || null;
}

// ─── Check username availability ──────────────────────────────────────────────

export async function isUsernameAvailable(username: string, uid?: string): Promise<boolean> {
  const snap = await getDocument<{ uid: string }>(Collections.USERNAMES, username.toLowerCase());
  return !snap || snap.uid === uid;
}

// ─── Reserve username ─────────────────────────────────────────────────────────

export async function reserveUsername(uid: string, username: string): Promise<void> {
  const existing = await getDocument<{ uid: string }>(Collections.USERNAMES, username.toLowerCase());
  if (existing?.uid === uid) return;
  if (existing) throw new Error('Username is already taken.');

  await createDocument(Collections.USERNAMES, username.toLowerCase(), { uid });
}

// ─── Complete onboarding ──────────────────────────────────────────────────────

export async function completeOnboarding(
  uid: string,
  data: {
    username: string;
    bio: string;
    avatarUrl?: string;
  }
): Promise<void> {
  const username = data.username.toLowerCase().replace('@', '');
  const avatarUrl = getExternalUrl(data.avatarUrl);

  await reserveUsername(uid, username);
  await updateDocument(Collections.USERS, uid, {
    username,
    bio: data.bio,
    isOnboarded: true,
    ...(avatarUrl && { avatarUrl }),
  });
}

// ─── Update profile ───────────────────────────────────────────────────────────

export async function updateUserProfile(
  uid: string,
  data: EditProfileFormData
): Promise<void> {
  const updates: Record<string, unknown> = {
    displayName: data.displayName,
    bio: data.bio,
    website: data.website || '',
    location: data.location || '',
  };

  if (data.avatarUrl !== undefined) {
    const avatarUrl = getExternalUrl(data.avatarUrl);
    if (avatarUrl) updates.avatarUrl = avatarUrl;
  }

  if (data.coverUrl !== undefined) {
    const coverUrl = getExternalUrl(data.coverUrl);
    if (coverUrl) updates.coverUrl = coverUrl;
  }

  await updateDocument(Collections.USERS, uid, updates);
}

// ─── Update user language ─────────────────────────────────────────────────────

export async function updateUserLanguage(
  uid: string,
  language: 'ar' | 'en'
): Promise<void> {
  await updateDocument(Collections.USERS, uid, { language });
}

export async function updateUserSettings(
  uid: string,
  data: {
    notificationSettings?: User['notificationSettings'];
    privacySettings?: User['privacySettings'];
  }
): Promise<void> {
  await updateDocument(Collections.USERS, uid, data);
}

// ─── Subscribe to user ────────────────────────────────────────────────────────

export function subscribeToUser(
  uid: string,
  callback: (user: User | null) => void
) {
  return subscribeToDocument<User>(Collections.USERS, uid, callback);
}

// ─── Search users ─────────────────────────────────────────────────────────────

export async function searchUsers(query: string): Promise<User[]> {
  const username = query.trim().replace(/^@+/, '').toLowerCase();
  if (!username) return [];

  return queryDocuments<User>(Collections.USERS, [
    where('username', '==', username),
    limit(1),
  ]);
}
