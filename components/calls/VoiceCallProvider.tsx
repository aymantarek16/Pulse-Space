'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Mic, MicOff, Phone, PhoneCall, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  acceptVoiceCall,
  addVoiceCallCandidate,
  createVoiceCall,
  subscribeToIncomingVoiceCalls,
  subscribeToVoiceCall,
  updateVoiceCallStatus,
} from '@/services/calls.service';
import { getUserById } from '@/services/users.service';
import type { User, VoiceCall, VoiceCallType } from '@/types';

type CallPhase = 'idle' | 'ringing' | 'calling' | 'connecting' | 'active';

interface VoiceCallContextValue {
  startCall: (conversationId: string, target: User, type?: VoiceCallType) => Promise<void>;
  activeCallId: string | null;
  phase: CallPhase;
}

const VoiceCallContext = createContext<VoiceCallContextValue>({
  startCall: async () => {},
  activeCallId: null,
  phase: 'idle',
});

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function VoiceCallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [activeCall, setActiveCall] = useState<VoiceCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<VoiceCall | null>(null);
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callType, setCallType] = useState<VoiceCallType>('voice');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const callUnsubscribeRef = useRef<(() => void) | null>(null);
  const callIdRef = useRef<string | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const addedCandidatesRef = useRef<Set<string>>(new Set());
  const roleRef = useRef<'caller' | 'callee' | null>(null);
  const remoteDescriptionSetRef = useRef(false);

  const cleanup = useCallback((resetIncoming = true) => {
    callUnsubscribeRef.current?.();
    callUnsubscribeRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    callIdRef.current = null;
    pendingCandidatesRef.current = [];
    addedCandidatesRef.current.clear();
    roleRef.current = null;
    remoteDescriptionSetRef.current = false;
    setActiveCall(null);
    if (resetIncoming) setIncomingCall(null);
    setRemoteUser(null);
    setMuted(false);
    setCameraOff(false);
    setCallType('voice');
    setHasRemoteVideo(false);
    setPhase('idle');
  }, []);

  const resetMediaSession = useCallback(() => {
    callUnsubscribeRef.current?.();
    callUnsubscribeRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    callIdRef.current = null;
    pendingCandidatesRef.current = [];
    addedCandidatesRef.current.clear();
    roleRef.current = null;
    remoteDescriptionSetRef.current = false;
    setActiveCall(null);
    setIncomingCall(null);
    setMuted(false);
    setCameraOff(false);
    setHasRemoteVideo(false);
    setPhase('idle');
  }, []);

  const getMediaStream = async (type: VoiceCallType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Calls are not supported in this browser.');
    }
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { facingMode: 'user' } : false,
    });
  };

  const createPeer = useCallback((role: 'caller' | 'callee') => {
    const peer = new RTCPeerConnection(ICE_SERVERS);

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      const candidate = event.candidate.toJSON();
      const callId = callIdRef.current;
      if (!callId) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      void addVoiceCallCandidate(callId, role, candidate).catch(console.error);
    };

    peer.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      remoteStreamRef.current = stream;
      setHasRemoteVideo(stream.getVideoTracks().length > 0);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        void remoteAudioRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        void remoteVideoRef.current.play().catch(() => {});
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') setPhase('active');
      if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
        setError(dir === 'rtl' ? 'انقطع الاتصال.' : 'Call disconnected.');
      }
    };

    return peer;
  }, [dir]);

  const addRemoteCandidates = useCallback(async (call: VoiceCall) => {
    const peer = peerRef.current;
    const role = roleRef.current;
    if (!peer || !role || !remoteDescriptionSetRef.current) return;

    const candidates = role === 'caller' ? call.calleeCandidates : call.callerCandidates;
    for (const candidate of candidates || []) {
      const key = JSON.stringify(candidate);
      if (addedCandidatesRef.current.has(key)) continue;
      addedCandidatesRef.current.add(key);
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Could not add ICE candidate:', err);
      }
    }
  }, []);

  const subscribeActiveCall = useCallback((callId: string) => {
    callUnsubscribeRef.current?.();
    callUnsubscribeRef.current = subscribeToVoiceCall(callId, async (call) => {
      if (!call) {
        cleanup();
        return;
      }

      setActiveCall(call);
      setCallType(call.type || 'voice');

      if (call.status === 'declined' || call.status === 'ended' || call.status === 'missed') {
        cleanup();
        return;
      }

      const peer = peerRef.current;
      if (
        roleRef.current === 'caller' &&
        peer &&
        call.answer &&
        !remoteDescriptionSetRef.current
      ) {
        await peer.setRemoteDescription(new RTCSessionDescription(call.answer));
        remoteDescriptionSetRef.current = true;
        setPhase('connecting');
      }

      await addRemoteCandidates(call);
    });
  }, [addRemoteCandidates, cleanup]);

  const flushPendingCandidates = useCallback(async (callId: string, role: 'caller' | 'callee') => {
    const candidates = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    await Promise.all(
      candidates.map((candidate) => addVoiceCallCandidate(callId, role, candidate))
    );
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      void localVideoRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      void remoteVideoRef.current.play().catch(() => {});
    }
  }, [phase, callType]);

  const startCall = useCallback(async (
    conversationId: string,
    target: User,
    type: VoiceCallType = 'voice'
  ) => {
    if (!user || phase !== 'idle') return;

    setError(null);
    setRemoteUser(target);
    setCallType(type);
    setCameraOff(false);
    setPhase('calling');
    roleRef.current = 'caller';

    try {
      const stream = await getMediaStream(type);
      localStreamRef.current = stream;
      const peer = createPeer('caller');
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const callId = await createVoiceCall({
        conversationId,
        callerId: user.uid,
        calleeId: target.uid,
        type,
        offer,
      });

      callIdRef.current = callId;
      await flushPendingCandidates(callId, 'caller');
      subscribeActiveCall(callId);
    } catch (err) {
      console.error('Could not start call:', err);
      setError(
        type === 'video'
          ? (dir === 'rtl' ? 'تعذر بدء مكالمة الفيديو. اتأكد من صلاحية الكاميرا والمايك.' : 'Could not start video call. Check camera and microphone permissions.')
          : (dir === 'rtl' ? 'تعذر بدء المكالمة الصوتية.' : 'Could not start voice call.')
      );
      resetMediaSession();
    }
  }, [createPeer, dir, flushPendingCandidates, phase, resetMediaSession, subscribeActiveCall, user]);

  const acceptIncoming = async () => {
    if (!incomingCall || !user) return;
    if (!incomingCall.offer) {
      setError(dir === 'rtl' ? 'بيانات المكالمة غير مكتملة.' : 'Call data is incomplete.');
      return;
    }
    setError(null);
    const incomingType = incomingCall.type || 'voice';
    setCallType(incomingType);
    setCameraOff(false);
    setPhase('connecting');
    roleRef.current = 'callee';
    callIdRef.current = incomingCall.id;

    try {
      const stream = await getMediaStream(incomingType);
      localStreamRef.current = stream;
      const peer = createPeer('callee');
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      remoteDescriptionSetRef.current = true;
      await addRemoteCandidates(incomingCall);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await acceptVoiceCall(incomingCall.id, answer);
      await flushPendingCandidates(incomingCall.id, 'callee');

      setActiveCall(incomingCall);
      setIncomingCall(null);
      subscribeActiveCall(incomingCall.id);
    } catch (err) {
      console.error('Could not accept call:', err);
      setError(
        incomingType === 'video'
          ? (dir === 'rtl' ? 'تعذر قبول مكالمة الفيديو. اتأكد من صلاحية الكاميرا والمايك.' : 'Could not accept the video call. Check camera and microphone permissions.')
          : (dir === 'rtl' ? 'تعذر قبول المكالمة.' : 'Could not accept the call.')
      );
      await updateVoiceCallStatus(incomingCall.id, 'declined').catch(console.error);
      cleanup();
    }
  };

  const declineIncoming = async () => {
    if (!incomingCall) return;
    await updateVoiceCallStatus(incomingCall.id, 'declined').catch(console.error);
    cleanup();
  };

  const endCall = async () => {
    const callId = activeCall?.id || incomingCall?.id || callIdRef.current;
    if (callId) {
      await updateVoiceCallStatus(callId, phase === 'ringing' ? 'declined' : 'ended').catch(console.error);
    }
    cleanup();
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  };

  const toggleCamera = () => {
    const nextCameraOff = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    setCameraOff(nextCameraOff);
  };

  useEffect(() => {
    if (!user) return;
    return subscribeToIncomingVoiceCalls(user.uid, async (calls) => {
      const call = calls[0];
      if (!call) {
        if (phase === 'ringing' && incomingCall) cleanup();
        return;
      }
      if (phase !== 'idle' || activeCall || incomingCall) return;
      setIncomingCall(call);
      setActiveCall(call);
      setCallType(call.type || 'voice');
      setPhase('ringing');
      const caller = await getUserById(call.callerId);
      setRemoteUser(caller);
    });
  }, [activeCall, cleanup, incomingCall, phase, user]);

  useEffect(() => cleanup, [cleanup]);

  const currentCallType = activeCall?.type || incomingCall?.type || callType;
  const isVideoCall = currentCallType === 'video';
  const callName = remoteUser?.displayName || (dir === 'rtl' ? 'مستخدم' : 'User');
  const isCallPanelVisible =
    phase === 'ringing' ||
    phase === 'calling' ||
    phase === 'connecting' ||
    phase === 'active' ||
    !!error;
  const statusText =
    error && phase === 'idle'
      ? (dir === 'rtl' ? 'تعذر بدء المكالمة' : 'Could not start call')
      : phase === 'ringing'
      ? isVideoCall
        ? (dir === 'rtl' ? 'مكالمة فيديو واردة' : 'Incoming video call')
        : (dir === 'rtl' ? 'مكالمة صوتية واردة' : 'Incoming voice call')
      : phase === 'calling'
      ? (dir === 'rtl' ? 'جار الاتصال...' : 'Calling...')
      : phase === 'connecting'
      ? isVideoCall
        ? (dir === 'rtl' ? 'جاري توصيل الفيديو...' : 'Connecting video...')
        : (dir === 'rtl' ? 'جاري توصيل الصوت...' : 'Connecting audio...')
      : isVideoCall
      ? (dir === 'rtl' ? 'مكالمة الفيديو نشطة' : 'Video call active')
      : (dir === 'rtl' ? 'المكالمة نشطة' : 'Voice call active');

  return (
    <VoiceCallContext.Provider value={{ startCall, activeCallId: activeCall?.id || null, phase }}>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {isCallPanelVisible && (
        <div
          className={cn(
            'fixed inset-x-3 top-3 z-[70] mx-auto rounded-3xl border border-white/10 bg-[#07111f]/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl',
            isVideoCall ? 'max-w-xl' : 'max-w-md'
          )}
          dir={dir}
        >
          <div className="flex items-center gap-3">
            <Avatar src={remoteUser?.avatarUrl} name={callName} size="md" online={phase === 'active'} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-pulse-text">{callName}</p>
              <p className="text-xs text-pulse-text-muted">{statusText}</p>
            </div>
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-2xl',
              phase === 'active' ? 'bg-emerald-400/[0.15] text-emerald-300' : 'bg-pulse-accent/[0.15] text-pulse-accent'
            )}>
              {isVideoCall ? <Video className="h-5 w-5" /> : phase === 'ringing' ? <PhoneCall className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            </div>
          </div>

          {isVideoCall && phase !== 'ringing' && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <div className="relative aspect-video bg-[#03070c]">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  {!hasRemoteVideo && (
                    <div className="text-center">
                      <Avatar src={remoteUser?.avatarUrl} name={callName} size="lg" online={phase === 'active'} />
                      <p className="mt-2 text-xs text-pulse-text-muted">
                        {dir === 'rtl' ? 'في انتظار فيديو الطرف الآخر...' : 'Waiting for remote video...'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-3 end-3 h-24 w-32 overflow-hidden rounded-2xl border border-white/20 bg-black shadow-xl">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn('h-full w-full object-cover', cameraOff && 'opacity-20')}
                  />
                  {cameraOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                      <VideoOff className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            {error && phase === 'idle' ? (
              <Button
                variant="glass"
                size="md"
                fullWidth
                onClick={() => {
                  setError(null);
                  setRemoteUser(null);
                  setCallType('voice');
                }}
              >
                {dir === 'rtl' ? 'إغلاق' : 'Close'}
              </Button>
            ) : phase === 'ringing' ? (
              <>
                <Button variant="danger" size="md" fullWidth onClick={declineIncoming}>
                  <PhoneOff className="h-4 w-4" />
                  {dir === 'rtl' ? 'رفض' : 'Decline'}
                </Button>
                <Button variant="primary" size="md" fullWidth onClick={acceptIncoming}>
                  <Phone className="h-4 w-4" />
                  {dir === 'rtl' ? 'رد' : 'Answer'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="glass" size="md" fullWidth onClick={toggleMute}>
                  {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {muted ? (dir === 'rtl' ? 'فتح الصوت' : 'Unmute') : (dir === 'rtl' ? 'كتم' : 'Mute')}
                </Button>
                {isVideoCall && (
                  <Button variant="glass" size="md" fullWidth onClick={toggleCamera}>
                    {cameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    {cameraOff ? (dir === 'rtl' ? 'فتح الكاميرا' : 'Camera on') : (dir === 'rtl' ? 'إيقاف الكاميرا' : 'Camera off')}
                  </Button>
                )}
                <Button variant="danger" size="md" fullWidth onClick={endCall}>
                  <PhoneOff className="h-4 w-4" />
                  {dir === 'rtl' ? 'إنهاء' : 'End'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </VoiceCallContext.Provider>
  );
}

export function useVoiceCall() {
  return useContext(VoiceCallContext);
}
