'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Image as ImageIcon, X, Loader2, Smile, FileText, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  fileToDataUrl,
  imageFileToDataUrl,
  uploadFile,
  validateUploadFile,
} from '@/lib/firebase/storage';
import { cn } from '@/lib/utils';
import type { MessageType } from '@/types';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onSendMedia: (
    url: string,
    type: Extract<MessageType, 'image' | 'file'>,
    content?: string
  ) => Promise<void>;
  onSendSticker: (sticker: string) => Promise<void>;
  disabled?: boolean;
}

const EMOJI_GROUPS = [
  {
    label: 'Smileys',
    emojis: ['😀', '😄', '😂', '😊', '😍', '🥰', '😎', '🙂', '🥹', '😅', '🙃', '😉'],
  },
  {
    label: 'Gestures',
    emojis: ['👍', '👏', '🙌', '🤝', '🙏', '💪', '✌️', '👌', '👀', '🫶', '🤌', '🤍'],
  },
  {
    label: 'Mood',
    emojis: ['🔥', '✨', '💙', '💜', '💚', '💯', '🎉', '🌟', '⚡', '☕', '🌙', '🚀'],
  },
];

const EXPANDED_EMOJI_GROUPS = [
  {
    label: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😎', '🥳', '🥹', '🥺', '😌', '😔', '😴', '🤤', '🤯'],
  },
  {
    label: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙌', '🫶', '🙏', '🤝', '💪', '✌️', '👌', '🤌', '🤙', '👋', '🤲', '🫡', '👀', '🧠', '🫵', '☝️', '🤘', '🖖', '✍️', '💅', '🫰'],
  },
  {
    label: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💯', '🔥', '✨', '⚡'],
  },
  {
    label: 'People',
    emojis: ['👶', '🧒', '👦', '👧', '🧑', '👨', '👩', '🧔', '👴', '👵', '👮', '👷', '💂', '🕵️', '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', '🧑‍🚀', '🧑‍⚕️', '🧑‍🍳', '🧑‍🏫', '🧑‍🎤', '🧑‍🔧'],
  },
  {
    label: 'Animals',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐸', '🐵', '🐔', '🐧', '🐦', '🦄', '🐝', '🦋', '🐢', '🐬', '🐳', '🦖'],
  },
  {
    label: 'Food',
    emojis: ['🍏', '🍎', '🍌', '🍉', '🍓', '🍒', '🥭', '🍍', '🥑', '🍕', '🍔', '🍟', '🌭', '🌮', '🍗', '🍖', '🍝', '🍜', '🍩', '🍪', '🎂', '🍫', '☕', '🥤'],
  },
  {
    label: 'Travel',
    emojis: ['🚗', '🚕', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚀', '✈️', '🛫', '🚁', '🚢', '🏠', '🏢', '🏝️', '🏔️', '🌍', '🌙', '☀️', '🌈', '⭐', '🌟', '💫', '☄️'],
  },
  {
    label: 'Objects',
    emojis: ['📱', '💻', '⌨️', '🖥️', '🎧', '🎤', '📷', '🎮', '🕹️', '💡', '🔋', '🔌', '📌', '📎', '📝', '📚', '💰', '💎', '🎁', '🎈', '🏆', '🥇', '🔐', '🧿'],
  },
  {
    label: 'Symbols',
    emojis: ['✅', '☑️', '❌', '⭕', '❗', '❓', '💬', '💭', '♻️', '🔁', '🔔', '🔕', '📣', '🚫', '⚠️', '🔞', '🆗', '🆕', '🆙', '🆒', '🔵', '🟢', '🟡', '🔴'],
  },
];

const STICKER_PACKS = [
  {
    label: 'Pulse',
    stickers: ['⚡', '💚', '🔥', '✨', '🚀', '🎉', '💯', '🏆'],
  },
  {
    label: 'Faces',
    stickers: ['😂', '🤣', '😍', '🥰', '😎', '🥹', '😭', '🤯', '😴', '😡', '🤔', '🫡'],
  },
  {
    label: 'Hands',
    stickers: ['👍', '👏', '🙌', '🙏', '🤝', '💪', '🫶', '👌'],
  },
  {
    label: 'Vibes',
    stickers: ['🌙', '☀️', '🌈', '⭐', '💫', '🎧', '🎮', '☕'],
  },
];

type PickerMode = 'emoji' | 'stickers';

const FILE_ACCEPT =
  '.pdf,.zip,.rar,.7z,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,application/zip,application/x-zip-compressed,application/x-rar-compressed,application/vnd.rar,application/x-7z-compressed,text/plain,text/csv';
const UPLOAD_TIMEOUT_MS = 15000;
const UPLOAD_STALL_TIMEOUT_MS = 8000;
const INLINE_ATTACHMENT_MAX_DATA_URL_LENGTH = 750000;

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileLabel(file: File, type: Extract<MessageType, 'image' | 'file'>) {
  if (type === 'image') return 'Image';
  const extension = file.name.split('.').pop()?.toUpperCase();
  return extension || 'File';
}

function getSendErrorMessage(error: unknown, dir: string, hadAttachment: boolean) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  const isRtl = dir === 'rtl';

  if (code === 'storage/unauthorized') {
    return isRtl
      ? 'مش مسموح برفع الملف. اتأكد إنك مسجل دخول وإن قواعد Storage محدثة.'
      : 'This file upload was blocked. Check your sign-in session and Storage rules.';
  }

  if (code === 'storage/canceled' || message.includes('timed out') || message.includes('stalled')) {
    return isRtl
      ? 'الرفع أخد وقت طويل واتوقف. اتأكد من النت وحاول تاني.'
      : 'The upload took too long and stopped. Check your connection and try again.';
  }

  if (code === 'storage/quota-exceeded') {
    return isRtl
      ? 'مساحة Firebase Storage ممتلئة أو الكوتة خلصت.'
      : 'Firebase Storage quota was exceeded.';
  }

  if (message.includes('too large to send without firebase storage')) {
    return isRtl
      ? 'الملف أكبر من الإرسال المؤقت بدون Firebase Storage. جرّب ملف أصغر أو راجع إعدادات Storage.'
      : 'This file is too large to send without Firebase Storage. Try a smaller file or check Storage setup.';
  }

  return isRtl
    ? hadAttachment
      ? 'تعذر إرسال المرفق. جرّب مرة تانية أو اختار ملف أصغر.'
      : 'تعذر إرسال الرسالة. حاول مرة تانية.'
    : hadAttachment
      ? 'Could not send the attachment. Try again or choose a smaller file.'
      : 'Could not send the message. Please try again.';
}

export function ChatInput({ onSend, onSendMedia, onSendSticker, disabled }: ChatInputProps) {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>('emoji');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [mediaType, setMediaType] = useState<Extract<MessageType, 'image' | 'file'>>('image');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!emojiOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        emojiPickerRef.current?.contains(target) ||
        emojiButtonRef.current?.contains(target) ||
        textareaRef.current?.contains(target)
      ) {
        return;
      }
      setEmojiOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEmojiOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [emojiOpen]);

  useEffect(() => {
    if (!mediaOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        attachMenuRef.current?.contains(target) ||
        attachButtonRef.current?.contains(target)
      ) {
        return;
      }
      setMediaOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMediaOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mediaOpen]);

  const clearMedia = () => {
    setMediaFile(null);
    setMediaError(null);
    setUploadProgress(null);
    if (mediaPreview?.startsWith('blob:')) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMediaSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    selectedType: Extract<MessageType, 'image' | 'file'>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateUploadFile(file, selectedType === 'image');
    if (error) {
      setMediaError(error);
      event.target.value = '';
      return;
    }

    if (mediaPreview?.startsWith('blob:')) URL.revokeObjectURL(mediaPreview);
    setMediaFile(file);
    setMediaType(selectedType);
    setMediaPreview(selectedType === 'image' ? URL.createObjectURL(file) : null);
    setMediaError(null);
    setUploadProgress(null);
    setMediaOpen(false);
  };

  const handleSend = async () => {
    if (disabled || sending) return;
    if (mediaFile && !user) {
      setMediaError(dir === 'rtl' ? 'سجل الدخول الأول عشان تقدر ترفع ملف.' : 'Sign in before uploading a file.');
      return;
    }

    const hadAttachment = !!mediaFile;
    let failedAttachment = hadAttachment;
    setMediaError(null);
    setSending(true);
    try {
      if (mediaFile && user) {
        setUploadProgress(0);
        let uploadedUrl: string;
        try {
          uploadedUrl = await uploadFile(mediaFile, `uploads/${user.uid}/messages`, {
            timeoutMs: UPLOAD_TIMEOUT_MS,
            stallTimeoutMs: UPLOAD_STALL_TIMEOUT_MS,
            maxAttempts: 1,
            onProgress: setUploadProgress,
          });
        } catch (storageError) {
          console.warn('Firebase Storage upload failed, using chat inline fallback:', storageError);
          setUploadProgress(35);
          uploadedUrl =
            mediaType === 'image'
              ? await imageFileToDataUrl(mediaFile, {
                  maxDimension: 1280,
                  maxDataUrlLength: INLINE_ATTACHMENT_MAX_DATA_URL_LENGTH,
                  quality: 0.78,
                })
              : await fileToDataUrl(mediaFile, {
                  maxDataUrlLength: INLINE_ATTACHMENT_MAX_DATA_URL_LENGTH,
                });

          if (uploadedUrl.length > INLINE_ATTACHMENT_MAX_DATA_URL_LENGTH) {
            throw new Error('File is too large to send without Firebase Storage.');
          }
          setUploadProgress(100);
        }
        await onSendMedia(uploadedUrl, mediaType, mediaFile.name);
        clearMedia();
        setMediaOpen(false);
      }
      if (text.trim()) {
        failedAttachment = false;
        await onSend(text.trim());
        setText('');
        setEmojiOpen(false);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    } catch (error) {
      console.error(failedAttachment ? 'Attachment send failed:' : 'Message send failed:', error);
      setMediaError(getSendErrorMessage(error, dir, failedAttachment));
    } finally {
      setUploadProgress(null);
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? text.length;
    const end = textarea?.selectionEnd ?? text.length;
    const nextText = `${text.slice(0, start)}${emoji}${text.slice(end)}`;

    setText(nextText);

    requestAnimationFrame(() => {
      if (!textarea) return;
      const cursorPosition = start + emoji.length;
      textarea.focus();
      textarea.selectionStart = cursorPosition;
      textarea.selectionEnd = cursorPosition;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    });
  };

  const sendSticker = async (sticker: string) => {
    if (disabled || sending || !sticker.trim()) return;
    setSending(true);
    setMediaError(null);

    try {
      await onSendSticker(sticker);
      setEmojiOpen(false);
    } catch (error) {
      console.error('Sticker send failed:', error);
      setMediaError(
        dir === 'rtl'
          ? 'تعذر إرسال الاستيكر. حاول مرة تانية.'
          : 'Could not send the sticker. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const canSend =
    (text.trim().length > 0 || !!mediaFile) &&
    !sending &&
    !disabled;

  return (
    <div className="border-t border-white/10 bg-[#07111f]/95 px-3 py-3 shadow-[0_-18px_45px_rgba(2,8,23,0.34)] backdrop-blur-xl sm:px-4" dir={dir}>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => handleMediaSelect(event, 'image')}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_ACCEPT}
        onChange={(event) => handleMediaSelect(event, 'file')}
        className="hidden"
      />

      <AnimatePresence>
        {mediaFile && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-2 shadow-xl shadow-black/20"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#0d1a2a]">
              {mediaType === 'image' && mediaPreview ? (
                <img src={mediaPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <FileText className="h-5 w-5 text-pulse-accent" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-pulse-text">{mediaFile.name}</p>
              <p className="text-xs text-pulse-text-muted">
                {getFileLabel(mediaFile, mediaType)} · {formatFileSize(mediaFile.size)}
              </p>
              {uploadProgress !== null && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-pulse-text-muted">
                    <span>{dir === 'rtl' ? 'جاري الرفع' : 'Uploading'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-pulse-accent transition-[width] duration-200"
                      style={{ width: `${Math.max(uploadProgress, 6)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={clearMedia}
              disabled={sending}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-pulse-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={dir === 'rtl' ? 'إزالة المرفق' : 'Remove attachment'}
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {mediaError && (
        <p className="mb-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {mediaError}
        </p>
      )}

      <div className="relative flex items-center gap-2 rounded-[1.65rem] border border-white/10 bg-[#0d1a2a] p-1.5 shadow-inner shadow-black/20">
        <button
          ref={attachButtonRef}
          type="button"
          onClick={() => setMediaOpen((open) => !open)}
          disabled={disabled || sending}
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl transition-all disabled:opacity-40',
            mediaOpen
              ? 'bg-pulse-accent text-[#07111f] shadow-lg shadow-pulse-accent/25'
              : 'text-pulse-text-muted hover:bg-white/10 hover:text-pulse-accent'
          )}
          title={dir === 'rtl' ? 'إرفاق' : 'Attach'}
          aria-label={dir === 'rtl' ? 'إرفاق ملف' : 'Attach file'}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <div className="relative flex-1">
          <AnimatePresence>
            {mediaOpen && (
              <motion.div
                ref={attachMenuRef}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className={cn(
                  'absolute bottom-full z-30 mb-3 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1525]/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl',
                  dir === 'rtl' ? 'right-0' : 'left-0'
                )}
              >
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start transition-colors hover:bg-white/10"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pulse-accent/[0.15] text-pulse-accent">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-pulse-text">
                      {dir === 'rtl' ? 'صورة' : 'Image'}
                    </span>
                    <span className="block text-xs text-pulse-text-muted">
                      JPG, PNG, WEBP, GIF
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start transition-colors hover:bg-white/10"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/[0.15] text-emerald-300">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-pulse-text">
                      {dir === 'rtl' ? 'ملف' : 'File'}
                    </span>
                    <span className="block text-xs text-pulse-text-muted">
                      PDF, ZIP, RAR, DOC
                    </span>
                  </span>
                </button>
              </motion.div>
            )}

            {emojiOpen && (
              <motion.div
                ref={emojiPickerRef}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className={cn(
                  'absolute bottom-full z-30 mb-3 w-[23rem] max-w-[calc(100vw-5rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1525]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl',
                  dir === 'rtl' ? 'right-0' : 'left-0'
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-pulse-text">
                    {pickerMode === 'emoji'
                      ? (dir === 'rtl' ? 'إيموجي' : 'Emoji')
                      : (dir === 'rtl' ? 'استيكرز' : 'Stickers')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEmojiOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-pulse-text-muted transition-colors hover:bg-white/10 hover:text-pulse-text"
                    aria-label={dir === 'rtl' ? 'إغلاق الإيموجي' : 'Close emoji picker'}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                  <button
                    type="button"
                    onClick={() => setPickerMode('emoji')}
                    className={cn(
                      'flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all',
                      pickerMode === 'emoji'
                        ? 'bg-pulse-accent text-pulse-bg shadow-lg shadow-pulse-accent/20'
                        : 'text-pulse-text-muted hover:bg-white/10 hover:text-pulse-text'
                    )}
                  >
                    <Smile className="h-3.5 w-3.5" />
                    {dir === 'rtl' ? 'إيموجي' : 'Emoji'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerMode('stickers')}
                    className={cn(
                      'flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all',
                      pickerMode === 'stickers'
                        ? 'bg-pulse-accent text-pulse-bg shadow-lg shadow-pulse-accent/20'
                        : 'text-pulse-text-muted hover:bg-white/10 hover:text-pulse-text'
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {dir === 'rtl' ? 'استيكرز' : 'Stickers'}
                  </button>
                </div>

                <div className="max-h-72 space-y-3 overflow-y-auto pr-1 scrollbar-hide">
                  {pickerMode === 'emoji' ? EXPANDED_EMOJI_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-pulse-text-muted">
                        {group.label}
                      </p>
                      <div className="grid grid-cols-8 gap-1">
                        {group.emojis.map((emoji) => (
                          <button
                            key={`${group.label}-${emoji}`}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            className="flex h-9 w-full items-center justify-center rounded-xl text-xl transition-all hover:bg-white/10 hover:scale-110 active:scale-95"
                            aria-label={`${dir === 'rtl' ? 'إضافة' : 'Add'} ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )) : STICKER_PACKS.map((pack) => (
                    <div key={pack.label}>
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-pulse-text-muted">
                        {pack.label}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {pack.stickers.map((sticker) => (
                          <button
                            key={`${pack.label}-${sticker}`}
                            type="button"
                            onClick={() => void sendSticker(sticker)}
                            disabled={disabled || sending}
                            className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-4xl shadow-inner shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-pulse-accent/30 hover:bg-pulse-accent/10 active:scale-95 disabled:opacity-50"
                            aria-label={`${dir === 'rtl' ? 'إرسال استيكر' : 'Send sticker'} ${sticker}`}
                          >
                            {sticker}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            placeholder={dir === 'rtl' ? 'اكتب رسالة...' : 'Type a message...'}
            rows={1}
            style={{ direction: 'auto' } as unknown as React.CSSProperties}
            className="max-h-[120px] min-h-10 w-full resize-none border-0 bg-transparent px-2 py-2.5 pe-11 text-sm leading-5 text-pulse-text outline-none placeholder:text-pulse-text-muted/60 disabled:opacity-50"
          />
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={() => setEmojiOpen((open) => !open)}
            disabled={disabled || sending}
            className={cn(
              'absolute bottom-1 end-1 flex h-8 w-8 items-center justify-center rounded-xl transition-all disabled:opacity-40',
            emojiOpen
                ? 'bg-pulse-accent/[0.15] text-pulse-accent'
                : 'text-pulse-text-muted hover:bg-white/10 hover:text-pulse-accent'
            )}
            title={dir === 'rtl' ? 'إيموجي' : 'Emoji'}
            aria-label={dir === 'rtl' ? 'فتح الإيموجي' : 'Open emoji picker'}
          >
            <Smile className="h-4 w-4" />
          </button>
        </div>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-200',
            canSend
              ? 'bg-gradient-to-br from-pulse-accent to-pulse-accent-dark text-white shadow-lg shadow-pulse-accent/30 hover:-translate-y-0.5 hover:shadow-pulse-accent/50'
              : 'bg-white/[0.06] text-pulse-text-muted/40'
          )}
          aria-label={dir === 'rtl' ? 'إرسال' : 'Send'}
        >
          {sending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className={cn('w-4 h-4', dir === 'rtl' ? 'rotate-180' : '')} />
          }
        </motion.button>
      </div>
    </div>
  );
}
