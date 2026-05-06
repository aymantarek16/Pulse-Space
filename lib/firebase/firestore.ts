import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
  runTransaction,
  type QueryConstraint,
  type DocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from './client';

// ─── Collection helpers ───────────────────────────────────────────────────────

export const Collections = {
  USERS: 'users',
  USERNAMES: 'usernames',
  POSTS: 'posts',
  COMMENTS: 'comments',
  REACTIONS: 'reactions',
  FOLLOWS: 'follows',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  CALLS: 'calls',
  SPACES: 'spaces',
  SAVED_POSTS: 'savedPosts',
} as const;

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

export function colRef(name: string) {
  return collection(db, name);
}

export function docRef(colName: string, docId: string) {
  return doc(db, colName, docId);
}

export async function getDocument<T>(colName: string, docId: string): Promise<T | null> {
  const snap = await getDoc(doc(db, colName, docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

export async function setDocument(
  colName: string,
  docId: string,
  data: Record<string, unknown>
) {
  return setDoc(doc(db, colName, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function createDocument(
  colName: string,
  docId: string,
  data: Record<string, unknown>
) {
  return setDoc(doc(db, colName, docId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateDocument(
  colName: string,
  docId: string,
  data: Record<string, unknown>
) {
  return updateDoc(doc(db, colName, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(colName: string, docId: string) {
  return deleteDoc(doc(db, colName, docId));
}

export async function queryDocuments<T>(
  colName: string,
  constraints: QueryConstraint[]
): Promise<T[]> {
  const q = query(collection(db, colName), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export function subscribeToDocument<T>(
  colName: string,
  docId: string,
  callback: (data: T | null) => void
) {
  return onSnapshot(doc(db, colName, docId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as T);
    } else {
      callback(null);
    }
  });
}

export function subscribeToQuery<T>(
  colName: string,
  constraints: QueryConstraint[],
  callback: (data: T[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, colName), ...constraints);
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
    },
    (error) => {
      console.error(`Firestore subscription failed for ${colName}:`, error);
      onError?.(error);
    }
  );
}

export {
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
  runTransaction,
  db,
};
