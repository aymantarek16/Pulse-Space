import { Timestamp } from 'firebase/firestore';

// ─── User Types ──────────────────────────────────────────────────────────────

export interface User {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  verified: boolean;
  role: 'user' | 'admin' | 'moderator';
  language: 'ar' | 'en';
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isOnboarded: boolean;
  website?: string;
  location?: string;
  notificationSettings?: UserNotificationSettings;
  privacySettings?: UserPrivacySettings;
}

export interface UserNotificationSettings {
  inApp: boolean;
  email: boolean;
  sound: boolean;
  browser: boolean;
}

export interface UserPrivacySettings {
  publicProfile: boolean;
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
}

export interface UserProfile extends User {
  isFollowing?: boolean;
  isOwnProfile?: boolean;
}

// ─── Post Types ───────────────────────────────────────────────────────────────

export type PostType = 'text' | 'image' | 'video' | 'link' | 'poll';

export interface Post {
  id: string;
  authorId: string;
  author?: User;
  content: string;
  type: PostType;
  imageUrl: string | null;
  posterUrl: string | null;
  tags: string[];
  mentionedUsers: string[];
  spaceId?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isPublic: boolean;
  isPinned: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Comment Types ────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author?: User;
  content: string;
  parentId?: string;
  likesCount: number;
  repliesCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Reaction Types ───────────────────────────────────────────────────────────

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface Reaction {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'post' | 'comment' | 'message';
  type: ReactionType;
  createdAt: Timestamp;
}

export interface MessageReaction {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'message';
  type: MessageReactionEmoji;
  createdAt: Timestamp;
}

// ─── Follow Types ─────────────────────────────────────────────────────────────

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Timestamp;
}

// ─── Space Types ──────────────────────────────────────────────────────────────

export interface Space {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  ownerId: string;
  moderatorIds: string[];
  membersCount: number;
  postsCount: number;
  isPrivate: boolean;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Message Types ────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'sticker';
export type MessageReactionEmoji = '👍' | '❤️' | '😂' | '😮' | '😢' | '🙏';

export interface Message {
  id: string;
  clientId?: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  content: string;
  type: MessageType;
  mediaUrl?: string | null;
  readBy: string[];
  reactions?: Record<string, MessageReactionEmoji>;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  editedAt?: Timestamp;
  deletedAt?: Timestamp;
  deletedFor?: string[];
  deletedForAll?: boolean;
  voiceDuration?: number;
  forwardedFromMessageId?: string;
  forwardedFromSenderId?: string;
  optimistic?: boolean;
  sendFailed?: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participantIds: string[];
  participants?: User[];
  name?: string;
  avatarUrl?: string | null;
  lastMessage?: Message;
  lastMessageAt: Timestamp;
  createdAt: Timestamp;
  unreadCount?: number;
}

// ─── Voice Call Types ─────────────────────────────────────────────────────────

export type VoiceCallStatus = 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed';
export type VoiceCallType = 'voice' | 'video';

export interface VoiceCall {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  participantIds: string[];
  status: VoiceCallStatus;
  type?: VoiceCallType;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  callerCandidates?: RTCIceCandidateInit[];
  calleeCandidates?: RTCIceCandidateInit[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  endedAt?: Timestamp;
}

// ─── Notification Types ───────────────────────────────────────────────────────

export type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'reply'
  | 'mention'
  | 'space_invite';

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  sender?: User;
  type: NotificationType;
  targetId?: string;
  targetType?: 'post' | 'comment' | 'space';
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

export interface OnboardingFormData {
  username: string;
  bio: string;
  avatarUrl?: string;
}

export interface EditProfileFormData {
  displayName: string;
  bio: string;
  website?: string;
  location?: string;
  avatarUrl?: string;
  coverUrl?: string;
}

// ─── Saved Post ───────────────────────────────────────────────────────────────

export interface SavedPost {
  id: string;
  userId: string;
  postId: string;
  post?: Post;
  savedAt: Timestamp;
}

// ─── i18n Types ───────────────────────────────────────────────────────────────

export type Locale = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export interface TranslationKeys {
  auth: {
    login: string;
    register: string;
    logout: string;
    email: string;
    password: string;
    confirmPassword: string;
    displayName: string;
    forgotPassword: string;
    noAccount: string;
    hasAccount: string;
    loginWithGoogle: string;
    welcomeBack: string;
    joinPulseSpace: string;
    orContinueWith: string;
    agreeTerms: string;
    loginSuccess: string;
    registerSuccess: string;
  };
  onboarding: {
    title: string;
    subtitle: string;
    username: string;
    usernamePlaceholder: string;
    bio: string;
    bioPlaceholder: string;
    avatarUrl: string;
    completeProfile: string;
    usernameAvailable: string;
    usernameTaken: string;
    skip: string;
    complete: string;
  };
  profile: {
    follow: string;
    unfollow: string;
    followers: string;
    following: string;
    posts: string;
    editProfile: string;
    website: string;
    location: string;
    joinedDate: string;
    noPostsYet: string;
    displayName: string;
    bio: string;
    saveChanges: string;
    cancel: string;
    coverUrl: string;
    avatarUrl: string;
  };
  nav: {
    home: string;
    explore: string;
    notifications: string;
    messages: string;
    spaces: string;
    profile: string;
    settings: string;
    saved: string;
  };
  common: {
    loading: string;
    error: string;
    retry: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    share: string;
    report: string;
    back: string;
    next: string;
    done: string;
    or: string;
  };
}
