import {
  Collections,
  getDocument,
  createDocument,
  deleteDocument,
  updateDocument,
  queryDocuments,
  increment,
  where,
} from '@/lib/firebase/firestore';
import { createNotification } from '@/services/notifications.service';
import type { Comment, Post, ReactionType, Reaction } from '@/types';

// ─── Toggle reaction ──────────────────────────────────────────────────────────

export async function toggleReaction(
  userId: string,
  targetId: string,
  targetType: 'post' | 'comment',
  type: ReactionType
): Promise<{ liked: boolean; reaction: ReactionType | null }> {
  const reactionId = `${userId}_${targetId}`;
  const existing = await getDocument<Reaction>(Collections.REACTIONS, reactionId);
  const col = targetType === 'post' ? Collections.POSTS : Collections.COMMENTS;

  if (existing?.type === type) {
    await deleteDocument(Collections.REACTIONS, reactionId);
    await updateDocument(col, targetId, { likesCount: increment(-1) });
    return { liked: false, reaction: null };
  }

  if (existing) {
    await deleteDocument(Collections.REACTIONS, reactionId);
    await createDocument(Collections.REACTIONS, reactionId, {
      userId,
      targetId,
      targetType,
      type,
    });
    return { liked: true, reaction: type };
  } else {
    await createDocument(Collections.REACTIONS, reactionId, {
      userId,
      targetId,
      targetType,
      type,
    });
    await updateDocument(col, targetId, { likesCount: increment(1) });
    const target =
      targetType === 'post'
        ? await getDocument<Post>(Collections.POSTS, targetId)
        : await getDocument<Comment>(Collections.COMMENTS, targetId);
    if (target) {
      await createNotification({
        recipientId: target.authorId,
        senderId: userId,
        type: 'like',
        targetId: targetType === 'post' ? targetId : (target as Comment).postId,
        targetType: 'post',
        message: targetType === 'post' ? 'أعجب بمنشورك' : 'أعجب بتعليقك',
      });
    }
    return { liked: true, reaction: type };
  }
}

// ─── Check if user reacted ────────────────────────────────────────────────────

export async function getUserReaction(
  userId: string,
  targetId: string
): Promise<Reaction | null> {
  return getDocument<Reaction>(Collections.REACTIONS, `${userId}_${targetId}`);
}

export async function hasUserReacted(userId: string, targetId: string): Promise<boolean> {
  const r = await getUserReaction(userId, targetId);
  return !!r;
}

// ─── Get all reactions for a target ──────────────────────────────────────────

export async function getReactions(targetId: string): Promise<Reaction[]> {
  return queryDocuments<Reaction>(Collections.REACTIONS, [
    where('targetId', '==', targetId),
  ]);
}
