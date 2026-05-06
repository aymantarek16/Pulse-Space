'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, X, Send, Hash, AtSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { createPost } from '@/services/posts.service';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { uploadImageFile, validateImageFile } from '@/lib/firebase/storage';
import { cn } from '@/lib/utils';

interface CreatePostBoxProps {
  onCreated?: () => void;
}

export function CreatePostBox({ onCreated }: CreatePostBoxProps) {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [mediaOpen, setMediaOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  const placeholder =
    dir === 'rtl' ? 'ما الذي يدور في ذهنك؟' : "What's on your mind?";

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
  };

  const clearMedia = () => {
    setMediaOpen(false);
    setImageFile(null);
    setMediaError(null);
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setMediaError(error);
      event.target.value = '';
      return;
    }

    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setMediaError(null);
  };

  const handleSubmit = async () => {
    if (!user || (!content.trim() && !imageFile)) return;

    setSubmitting(true);
    try {
      const uploadedImageUrl = imageFile
        ? await uploadImageFile(imageFile, `uploads/${user.uid}/posts`)
        : undefined;

      await createPost(user.uid, {
        content: content.trim(),
        imageUrl: uploadedImageUrl,
      });
      setContent('');
      clearMedia();
      setFocused(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      onCreated?.();
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const canPost = (content.trim().length > 0 || !!imageFile) && !submitting;
  const charCount = content.length;
  const charLimit = 2000;

  return (
    <GlassCard className={cn('transition-all duration-300', focused && 'border-pulse-accent/30 shadow-lg shadow-pulse-accent/5')}>
      <div className="flex gap-3" dir={dir}>
        <Avatar src={user?.avatarUrl} name={user?.displayName} size="md" />

        <div className="flex-1 min-w-0 space-y-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onFocus={() => setFocused(true)}
            placeholder={placeholder}
            rows={focused ? 3 : 1}
            className={cn(
              'w-full bg-transparent text-pulse-text placeholder:text-pulse-text-muted/50',
              'resize-none focus:outline-none text-base leading-relaxed',
              'transition-all duration-200'
            )}
            style={{ direction: dir }}
            maxLength={charLimit}
          />

          <AnimatePresence>
            {mediaOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2"
              >
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-pulse-text-muted hover:text-pulse-text hover:border-pulse-accent/40 transition-colors text-start"
                  >
                    {imageFile?.name || (dir === 'rtl' ? 'اختيار صورة من الجهاز' : 'Choose image from device')}
                  </button>
                  <button
                    type="button"
                    onClick={clearMedia}
                    className="w-9 h-9 rounded-lg text-pulse-text-muted hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {mediaError && <p className="text-xs text-red-400">{mediaError}</p>}
                {imagePreview && (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-pulse-muted">
                    <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {focused && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between pt-2 border-t border-white/10"
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFocused(true);
                      setMediaOpen((open) => !open);
                    }}
                    className="p-2 rounded-lg text-pulse-text-muted hover:text-pulse-accent hover:bg-pulse-accent/10 transition-all"
                    title={dir === 'rtl' ? 'إضافة صورة' : 'Add image'}
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent((c) => c + '#')}
                    className="p-2 rounded-lg text-pulse-text-muted hover:text-pulse-accent hover:bg-pulse-accent/10 transition-all"
                    title={dir === 'rtl' ? 'وسم' : 'Hashtag'}
                  >
                    <Hash className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent((c) => c + '@')}
                    className="p-2 rounded-lg text-pulse-text-muted hover:text-pulse-accent hover:bg-pulse-accent/10 transition-all"
                    title={dir === 'rtl' ? 'إشارة' : 'Mention'}
                  >
                    <AtSign className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {content.length > charLimit * 0.8 && (
                    <span className={cn(
                      'text-xs font-medium tabular-nums',
                      content.length >= charLimit ? 'text-red-400' : 'text-pulse-text-muted'
                    )}>
                      {charLimit - charCount}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setFocused(false);
                      setContent('');
                      clearMedia();
                    }}
                    className="text-xs text-pulse-text-muted hover:text-pulse-text transition-colors"
                  >
                    {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                  </button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!canPost}
                    loading={submitting}
                    className="gap-1.5 min-w-[80px]"
                  >
                    {!submitting && <Send className="w-3.5 h-3.5" />}
                    {dir === 'rtl' ? 'نشر' : 'Post'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </GlassCard>
  );
}
