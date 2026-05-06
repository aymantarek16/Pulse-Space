import {
  Collections,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  subscribeToQuery,
  where,
  limit,
  serverTimestamp,
  increment,
  db,
} from '@/lib/firebase/firestore';
import {
  collection,
  addDoc,
  documentId,
  Timestamp,
} from 'firebase/firestore';
import { getExternalUrl } from '@/lib/utils';
import { createNotification } from '@/services/notifications.service';
import type { Post, User } from '@/types';

// ─── Create post ──────────────────────────────────────────────────────────────

export async function createPost(
  authorId: string,
  data: { content: string; imageUrl?: string; posterUrl?: string }
): Promise<string> {
  const tags = extractHashtags(data.content);
  const mentions = extractMentions(data.content);
  const imageUrl = getExternalUrl(data.imageUrl);
  const posterUrl = getExternalUrl(data.posterUrl);

  const ref = await addDoc(collection(db, Collections.POSTS), {
    authorId,
    content: data.content,
    type: imageUrl || posterUrl ? 'image' : 'text',
    imageUrl,
    posterUrl,
    tags,
    mentionedUsers: mentions,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
    isPublic: true,
    isPinned: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDocument(Collections.USERS, authorId, { postsCount: increment(1) });
  await notifyMentionedUsers(authorId, ref.id, mentions);
  return ref.id;
}

// ─── Get single post ──────────────────────────────────────────────────────────

export async function getPost(postId: string): Promise<Post | null> {
  return getDocument<Post>(Collections.POSTS, postId);
}

export async function getPostWithAuthor(postId: string): Promise<Post | null> {
  const post = await getDocument<Post>(Collections.POSTS, postId);
  if (!post) return null;
  const author = await getDocument<User>(Collections.USERS, post.authorId);
  return { ...post, author: author || undefined };
}

// ─── Public feed (everyone) ───────────────────────────────────────────────────

export async function getFeedPosts(lastVisible?: Timestamp): Promise<Post[]> {
  const posts = await queryDocuments<Post>(Collections.POSTS, [
    where('isPublic', '==', true),
    limit(80),
  ]);
  const sorted = sortPostsByCreatedAt(posts);
  const visible = lastVisible
    ? sorted.filter((post) => getTimestampMillis(post.createdAt) < lastVisible.toMillis())
    : sorted;
  return enrichPostsWithAuthors(visible.slice(0, 15));
}

// ─── Following feed (only posts from followed users) ──────────────────────────

export async function getFollowingFeed(
  followingIds: string[],
  lastVisible?: Timestamp
): Promise<Post[]> {
  if (!followingIds.length) return [];

  // Firestore 'in' max 30, chunk if needed
  const chunks: string[][] = [];
  for (let i = 0; i < followingIds.length; i += 10) {
    chunks.push(followingIds.slice(i, i + 10));
  }

  const allPosts: Post[] = [];
  await Promise.all(
    chunks.map(async (chunk) => {
      const posts = await queryDocuments<Post>(Collections.POSTS, [
        where('authorId', 'in', chunk),
        limit(60),
      ]);
      allPosts.push(...posts.filter((post) => post.isPublic));
    })
  );

  const sorted = sortPostsByCreatedAt(allPosts);
  const visible = lastVisible
    ? sorted.filter((post) => getTimestampMillis(post.createdAt) < lastVisible.toMillis())
    : sorted;

  return enrichPostsWithAuthors(visible.slice(0, 20));
}

// ─── Real-time feed subscription ──────────────────────────────────────────────

export function subscribeFeedPosts(callback: (posts: Post[]) => void) {
  return subscribeToQuery<Post>(
    Collections.POSTS,
    [where('isPublic', '==', true), limit(80)],
    async (posts) => {
      const enriched = await enrichPostsWithAuthors(sortPostsByCreatedAt(posts).slice(0, 20));
      callback(enriched);
    }
  );
}

// ─── User posts ───────────────────────────────────────────────────────────────

export async function getUserPosts(userId: string): Promise<Post[]> {
  const posts = await queryDocuments<Post>(Collections.POSTS, [
    where('authorId', '==', userId),
    limit(80),
  ]);
  return enrichPostsWithAuthors(sortPostsByCreatedAt(posts).slice(0, 20));
}

// ─── Delete post ──────────────────────────────────────────────────────────────

export async function deletePost(postId: string, authorId: string): Promise<void> {
  await deleteDocument(Collections.POSTS, postId);
  await updateDocument(Collections.USERS, authorId, { postsCount: increment(-1) });
}

// ─── Views ────────────────────────────────────────────────────────────────────

export async function incrementViews(postId: string): Promise<void> {
  await updateDocument(Collections.POSTS, postId, { viewsCount: increment(1) });
}

// ─── Save / Unsave ────────────────────────────────────────────────────────────

export async function savePost(userId: string, postId: string): Promise<void> {
  await createDocument(Collections.SAVED_POSTS, `${userId}_${postId}`, {
    userId, postId, savedAt: serverTimestamp(),
  });
}

export async function unsavePost(userId: string, postId: string): Promise<void> {
  await deleteDocument(Collections.SAVED_POSTS, `${userId}_${postId}`);
}

export async function isPostSaved(userId: string, postId: string): Promise<boolean> {
  return !!(await getDocument(Collections.SAVED_POSTS, `${userId}_${postId}`));
}

export async function getSavedPosts(userId: string): Promise<Post[]> {
  const saved = await queryDocuments<{ postId: string; savedAt: Timestamp }>(
    Collections.SAVED_POSTS,
    [where('userId', '==', userId), limit(80)]
  );
  if (!saved.length) return [];
  const sortedSaved = [...saved]
    .sort((a, b) => getTimestampMillis(b.savedAt) - getTimestampMillis(a.savedAt))
    .slice(0, 30);
  const postIds = sortedSaved.map((s) => s.postId);
  const posts: Post[] = [];
  for (let i = 0; i < postIds.length; i += 10) {
    const batch = postIds.slice(i, i + 10);
    const results = await queryDocuments<Post>(Collections.POSTS, [
      where(documentId(), 'in', batch),
    ]);
    posts.push(...results);
  }
  const postsById = new Map(posts.map((post) => [post.id, post]));
  const orderedPosts = postIds
    .map((postId) => postsById.get(postId))
    .filter((post): post is Post => Boolean(post));
  return enrichPostsWithAuthors(orderedPosts);
}

// ─── Search posts by hashtag ──────────────────────────────────────────────────

export async function searchPostsByTag(tag: string): Promise<Post[]> {
  const posts = await queryDocuments<Post>(Collections.POSTS, [
    where('tags', 'array-contains', tag.toLowerCase().replace('#', '')),
    limit(80),
  ]);
  const publicPosts = posts.filter((post) => post.isPublic);
  return enrichPostsWithAuthors(sortPostsByCreatedAt(publicPosts).slice(0, 20));
}

// ─── Trending tags ────────────────────────────────────────────────────────────

export async function getTrendingTags(): Promise<{ tag: string; count: number }[]> {
  const posts = await queryDocuments<Post>(Collections.POSTS, [
    where('isPublic', '==', true),
    limit(160),
  ]);
  const tagMap: Record<string, number> = {};
  sortPostsByCreatedAt(posts)
    .slice(0, 100)
    .forEach((p) => p.tags?.forEach((t) => { tagMap[t] = (tagMap[t] || 0) + 1; }));
  return Object.entries(tagMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// ─── Enrich helper ────────────────────────────────────────────────────────────

async function enrichPostsWithAuthors(posts: Post[]): Promise<Post[]> {
  if (!posts.length) return [];
  const authorIds = [...new Set(posts.map((p) => p.authorId))];
  const authors: Record<string, User> = {};
  await Promise.all(
    authorIds.map(async (uid) => {
      const user = await getDocument<User>(Collections.USERS, uid);
      if (user) authors[uid] = user;
    })
  );
  return posts.map((post) => ({ ...post, author: authors[post.authorId] }));
}

function sortPostsByCreatedAt(posts: Post[]): Post[] {
  return [...posts].sort(
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

function extractHashtags(content: string): string[] {
  const m = content.match(/#[\w\u0600-\u06FF]+/g);
  return m ? m.map((t) => t.slice(1).toLowerCase()) : [];
}

function extractMentions(content: string): string[] {
  const m = content.match(/@[\w]+/g);
  return m ? m.map((x) => x.slice(1).toLowerCase()) : [];
}

async function notifyMentionedUsers(
  authorId: string,
  postId: string,
  mentions: string[]
) {
  const uniqueMentions = [...new Set(mentions)];
  await Promise.all(
    uniqueMentions.map(async (username) => {
      const users = await queryDocuments<User>(Collections.USERS, [
        where('username', '==', username),
        limit(1),
      ]);
      const mentioned = users[0];
      if (!mentioned) return;
      await createNotification({
        recipientId: mentioned.uid,
        senderId: authorId,
        type: 'mention',
        targetId: postId,
        targetType: 'post',
        message: 'ذكرك في منشور',
      });
    })
  );
}
