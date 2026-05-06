import {
  Collections,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  subscribeToQuery,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  db,
} from '@/lib/firebase/firestore';
import { collection, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getExternalUrl } from '@/lib/utils';
import type { Space, User } from '@/types';

// ─── Space Members subcollection path ────────────────────────────────────────

const membersCol = (spaceId: string) => `spaces/${spaceId}/members`;

// ─── Create space ─────────────────────────────────────────────────────────────

export interface CreateSpaceData {
  name: string;
  description: string;
  isPrivate: boolean;
  tags: string[];
  avatarUrl?: string;
  coverUrl?: string;
}

export async function createSpace(
  ownerId: string,
  data: CreateSpaceData
): Promise<string> {
  const slug = slugify(data.name);

  const ref = await addDoc(collection(db, Collections.SPACES), {
    name: data.name,
    slug,
    description: data.description,
    ownerId,
    moderatorIds: [ownerId],
    membersCount: 1,
    postsCount: 0,
    isPrivate: data.isPrivate,
    tags: data.tags,
    avatarUrl: getExternalUrl(data.avatarUrl),
    coverUrl: getExternalUrl(data.coverUrl),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Auto-join owner as member
  await setDoc(doc(db, membersCol(ref.id), ownerId), {
    userId: ownerId,
    role: 'owner',
    joinedAt: serverTimestamp(),
  });

  return ref.id;
}

// ─── Get space ────────────────────────────────────────────────────────────────

export async function getSpace(spaceId: string): Promise<Space | null> {
  return getDocument<Space>(Collections.SPACES, spaceId);
}

export async function getSpaceBySlug(slug: string): Promise<Space | null> {
  const results = await queryDocuments<Space>(Collections.SPACES, [
    where('slug', '==', slug),
    limit(1),
  ]);
  return results[0] || null;
}

// ─── List spaces ──────────────────────────────────────────────────────────────

export async function getPublicSpaces(): Promise<Space[]> {
  const spaces = await queryDocuments<Space>(Collections.SPACES, [
    where('isPrivate', '==', false),
    limit(50),
  ]);
  return sortSpacesByMembers(spaces).slice(0, 20);
}

export async function getUserSpaces(userId: string): Promise<Space[]> {
  // Spaces where user is owner or moderator
  const owned = await queryDocuments<Space>(Collections.SPACES, [
    where('ownerId', '==', userId),
    limit(50),
  ]);
  return sortSpacesByCreatedAt(owned).slice(0, 20);
}

export async function searchSpaces(query: string): Promise<Space[]> {
  return queryDocuments<Space>(Collections.SPACES, [
    where('name', '>=', query),
    where('name', '<=', query + '\uf8ff'),
    limit(10),
  ]);
}

// ─── Join / Leave space ───────────────────────────────────────────────────────

export async function joinSpace(spaceId: string, userId: string): Promise<void> {
  await setDoc(doc(db, membersCol(spaceId), userId), {
    userId,
    role: 'member',
    joinedAt: serverTimestamp(),
  });
  await updateDocument(Collections.SPACES, spaceId, {
    membersCount: increment(1),
  });
}

export async function leaveSpace(spaceId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, membersCol(spaceId), userId));
  await updateDocument(Collections.SPACES, spaceId, {
    membersCount: increment(-1),
  });
}

export async function isMember(spaceId: string, userId: string): Promise<boolean> {
  const snap = await getDocument(membersCol(spaceId), userId);
  return !!snap;
}

// ─── Get members ──────────────────────────────────────────────────────────────

export interface SpaceMember {
  userId: string;
  role: 'owner' | 'moderator' | 'member';
  joinedAt: unknown;
  user?: User;
}

export async function getSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
  const members = await queryDocuments<SpaceMember>(membersCol(spaceId), [
    orderBy('joinedAt', 'desc'),
    limit(50),
  ]);
  const users = await Promise.all(
    members.map((m) => getDocument<User>(Collections.USERS, m.userId))
  );
  return members.map((m, i) => ({ ...m, user: users[i] || undefined }));
}

// ─── Update space ─────────────────────────────────────────────────────────────

export async function updateSpace(
  spaceId: string,
  data: Partial<Pick<Space, 'name' | 'description' | 'tags' | 'isPrivate'>>
): Promise<void> {
  await updateDocument(Collections.SPACES, spaceId, data);
}

// ─── Delete space ─────────────────────────────────────────────────────────────

export async function deleteSpace(spaceId: string): Promise<void> {
  await deleteDocument(Collections.SPACES, spaceId);
}

// ─── Real-time subscription ───────────────────────────────────────────────────

export function subscribePublicSpaces(
  callback: (spaces: Space[]) => void,
  onError?: (error: Error) => void
) {
  return subscribeToQuery<Space>(
    Collections.SPACES,
    [where('isPrivate', '==', false), limit(50)],
    (spaces) => callback(sortSpacesByMembers(spaces).slice(0, 20)),
    onError
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s\u0600-\u06FF]+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-')
    .slice(0, 50);
}

function sortSpacesByMembers(spaces: Space[]) {
  return [...spaces].sort((a, b) => (b.membersCount || 0) - (a.membersCount || 0));
}

function sortSpacesByCreatedAt(spaces: Space[]) {
  return [...spaces].sort((a, b) => {
    const bTime = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
    const aTime = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
}
