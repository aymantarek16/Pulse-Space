import {
  Collections,
  updateDocument,
  subscribeToDocument,
  subscribeToQuery,
  where,
  serverTimestamp,
  arrayUnion,
  db,
} from '@/lib/firebase/firestore';
import { addDoc, collection } from 'firebase/firestore';
import type { VoiceCall, VoiceCallStatus, VoiceCallType } from '@/types';

export async function createVoiceCall(data: {
  conversationId: string;
  callerId: string;
  calleeId: string;
  type?: VoiceCallType;
  offer: RTCSessionDescriptionInit;
}): Promise<string> {
  const ref = await addDoc(collection(db, Collections.CALLS), {
    conversationId: data.conversationId,
    callerId: data.callerId,
    calleeId: data.calleeId,
    participantIds: [data.callerId, data.calleeId],
    status: 'ringing' satisfies VoiceCallStatus,
    type: data.type || 'voice',
    offer: data.offer,
    callerCandidates: [],
    calleeCandidates: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function acceptVoiceCall(
  callId: string,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  await updateDocument(Collections.CALLS, callId, {
    status: 'accepted' satisfies VoiceCallStatus,
    answer,
  });
}

export async function updateVoiceCallStatus(
  callId: string,
  status: VoiceCallStatus
): Promise<void> {
  await updateDocument(Collections.CALLS, callId, {
    status,
    ...(status === 'ended' || status === 'declined' || status === 'missed'
      ? { endedAt: serverTimestamp() }
      : {}),
  });
}

export async function addVoiceCallCandidate(
  callId: string,
  role: 'caller' | 'callee',
  candidate: RTCIceCandidateInit
): Promise<void> {
  await updateDocument(Collections.CALLS, callId, {
    [role === 'caller' ? 'callerCandidates' : 'calleeCandidates']: arrayUnion(candidate),
  });
}

export function subscribeToVoiceCall(
  callId: string,
  callback: (call: VoiceCall | null) => void
) {
  return subscribeToDocument<VoiceCall>(Collections.CALLS, callId, callback);
}

export function subscribeToIncomingVoiceCalls(
  userId: string,
  callback: (calls: VoiceCall[]) => void
) {
  return subscribeToQuery<VoiceCall>(
    Collections.CALLS,
    [
      where('calleeId', '==', userId),
    ],
    (calls) => callback(calls.filter((call) => call.status === 'ringing').slice(0, 1))
  );
}
