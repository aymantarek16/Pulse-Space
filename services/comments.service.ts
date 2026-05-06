import {
  Collections,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  where,
  serverTimestamp,
  increment,
  db,
  subscribeToQuery,
} from '@/lib/firebase/firestore';
import { addDoc, collection } from 'firebase/firestore';
import { createNotification } from '@/services/notifications.service';
import type { Comment, Post, User } from '@/types';

// ─── Add comment ──────────────────────────────────────────────────────────────

export async function addComment(
  postId: string,
  authorId: string,
  content: string,
  parentId?: string
): Promise<string> {
  const ref = await addDoc(collection(db, Collections.COMMENTS), {
    postId,
    authorId,
    content,
    parentId: parentId || null,
    likesCount: 0,
    repliesCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDocument(Collections.POSTS, postId, {
    commentsCount: increment(1),
  });

  if (parentId) {
    await updateDocument(Collections.COMMENTS, parentId, {
      repliesCount: increment(1),
    });
  }

  const post = await getDocument<Post>(Collections.POSTS, postId);
  if (parentId) {
    const parent = await getDocument<Comment>(Collections.COMMENTS, parentId);
    if (parent) {
      await createNotification({
        recipientId: parent.authorId,
        senderId: authorId,
        type: 'reply',
        targetId: postId,
        targetType: 'post',
        message: 'رد على تعليقك',
      });
    }
  } else if (post) {
    await createNotification({
      recipientId: post.authorId,
      senderId: authorId,
      type: 'comment',
      targetId: postId,
      targetType: 'post',
      message: 'علّق على منشورك',
    });
  }

  return ref.id;
}

// ─── Get post comments (top-level) ────────────────────────────────────────────

export async function getPostComments(postId: string): Promise<Comment[]> {
  const comments = await queryDocuments<Comment>(Collections.COMMENTS, [
    where('postId', '==', postId),
  ]);
  return enrichCommentsWithAuthors(getTopLevelComments(comments));
}

// ─── Get replies for a comment ────────────────────────────────────────────────

export async function getReplies(commentId: string): Promise<Comment[]> {
  const replies = await queryDocuments<Comment>(Collections.COMMENTS, [
    where('parentId', '==', commentId),
  ]);
  return enrichCommentsWithAuthors(sortByCreatedAt(replies).slice(0, 50));
}

// ─── Subscribe to comments ────────────────────────────────────────────────────

export function subscribeToComments(
  postId: string,
  callback: (comments: Comment[]) => void,
  onError?: (error: Error) => void
) {
  return subscribeToQuery<Comment>(
    Collections.COMMENTS,
    [
      where('postId', '==', postId),
    ],
    async (comments) => {
      const enriched = await enrichCommentsWithAuthors(getTopLevelComments(comments));
      callback(enriched);
    },
    onError
  );
}

export function subscribeToReplies(
  commentId: string,
  callback: (replies: Comment[]) => void,
  onError?: (error: Error) => void
) {
  return subscribeToQuery<Comment>(
    Collections.COMMENTS,
    [
      where('parentId', '==', commentId),
    ],
    async (replies) => {
      const enriched = await enrichCommentsWithAuthors(sortByCreatedAt(replies).slice(0, 50));
      callback(enriched);
    },
    onError
  );
}

// ─── Delete comment ───────────────────────────────────────────────────────────

export async function deleteComment(
  commentId: string,
  postId: string,
  parentId?: string | null
): Promise<void> {
  if (!parentId) {
    const replies = await queryDocuments<Comment>(Collections.COMMENTS, [
      where('parentId', '==', commentId),
    ]);

    await Promise.all([
      ...replies.map((reply) => deleteDocument(Collections.COMMENTS, reply.id)),
      deleteDocument(Collections.COMMENTS, commentId),
    ]);

    await updateDocument(Collections.POSTS, postId, {
      commentsCount: increment(-(replies.length + 1)),
    });
    return;
  }

  await deleteDocument(Collections.COMMENTS, commentId);
  await updateDocument(Collections.POSTS, postId, {
    commentsCount: increment(-1),
  });
  if (parentId) {
    await updateDocument(Collections.COMMENTS, parentId, {
      repliesCount: increment(-1),
    });
  }
}

// ─── Enrich with author data ──────────────────────────────────────────────────

function getTopLevelComments(comments: Comment[]): Comment[] {
  return sortByCreatedAt(comments)
    .filter((comment) => !comment.parentId)
    .slice(0, 50);
}

function sortByCreatedAt(comments: Comment[]): Comment[] {
  return [...comments].sort((a, b) => getCommentTime(a) - getCommentTime(b));
}

function getCommentTime(comment: Comment): number {
  const createdAt = comment.createdAt as unknown as {
    toMillis?: () => number;
    toDate?: () => Date;
    seconds?: number;
  };

  if (typeof createdAt?.toMillis === 'function') return createdAt.toMillis();
  if (typeof createdAt?.toDate === 'function') return createdAt.toDate().getTime();
  if (typeof createdAt?.seconds === 'number') return createdAt.seconds * 1000;
  return 0;
}

async function enrichCommentsWithAuthors(comments: Comment[]): Promise<Comment[]> {
  if (!comments.length) return [];
  const authorIds = [...new Set(comments.map((c) => c.authorId))];
  const authors: Record<string, User> = {};

  await Promise.all(
    authorIds.map(async (uid) => {
      const user = await getDocument<User>(Collections.USERS, uid);
      if (user) authors[uid] = user;
    })
  );

  return comments.map((c) => ({ ...c, author: authors[c.authorId] }));
}
