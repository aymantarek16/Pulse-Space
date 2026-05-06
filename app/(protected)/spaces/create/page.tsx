'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Camera, ArrowLeft, ArrowRight, Plus, X, Lock, Globe, Hash } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { createSpace } from '@/services/spaces.service';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { uploadImageFile, validateImageFile } from '@/lib/firebase/storage';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(3, 'Name is too short').max(50, 'Name is too long'),
  description: z.string().max(300, 'Description is too long'),
  isPrivate: z.boolean(),
  tagInput: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
const SPACE_IMAGE_UPLOAD_TIMEOUT_MS = 60000;

export default function CreateSpacePage() {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const router = useRouter();
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState<number | null>(null);
  const [coverUploadProgress, setCoverUploadProgress] = useState<number | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      isPrivate: false,
      tagInput: '',
    },
  });

  const isPrivate = watch('isPrivate');
  const tagInput = watch('tagInput') || '';
  const avatarUrl = avatarPreview;
  const coverUrl = coverPreview;

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
      if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    };
  }, [avatarPreview, coverPreview]);

  const selectImage = (
    event: React.ChangeEvent<HTMLInputElement>,
    kind: 'avatar' | 'cover',
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setUploadError(error);
      event.target.value = '';
      return;
    }

    setFile(file);
    setPreview((current) => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    if (kind === 'avatar') setAvatarUploadProgress(null);
    if (kind === 'cover') setCoverUploadProgress(null);
    setUploadError(null);
    setSubmitStatus(null);
  };

  const addTag = () => {
    const t = tagInput.trim().replace('#', '').toLowerCase();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags((prev) => [...prev, t]);
      setValue('tagInput', '');
    }
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSubmitting(true);
    setUploadError(null);
    setSubmitStatus(dir === 'rtl' ? 'جاري تجهيز المجموعة...' : 'Preparing group...');
    try {
      if (avatarFile) setAvatarUploadProgress(0);
      if (coverFile) setCoverUploadProgress(0);
      if (avatarFile || coverFile) {
        setSubmitStatus(dir === 'rtl' ? 'جاري رفع الصور...' : 'Uploading images...');
      }

      const [uploadedAvatarUrl, uploadedCoverUrl] = await Promise.all([
        avatarFile
          ? uploadImageFile(avatarFile, `uploads/${user.uid}/spaces/avatars`, {
              timeoutMs: SPACE_IMAGE_UPLOAD_TIMEOUT_MS,
              onProgress: setAvatarUploadProgress,
            })
          : Promise.resolve(undefined),
        coverFile
          ? uploadImageFile(coverFile, `uploads/${user.uid}/spaces/covers`, {
              timeoutMs: SPACE_IMAGE_UPLOAD_TIMEOUT_MS,
              onProgress: setCoverUploadProgress,
            })
          : Promise.resolve(undefined),
      ]);

      setSubmitStatus(dir === 'rtl' ? 'جاري إنشاء المجموعة...' : 'Creating group...');
      const id = await createSpace(user.uid, {
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate,
        tags,
        avatarUrl: uploadedAvatarUrl,
        coverUrl: uploadedCoverUrl,
      });
      router.replace(`/spaces/${id}`);
    } catch (err) {
      console.error('Create space failed:', err);
      setUploadError(
        dir === 'rtl'
          ? 'تعذر إنشاء المجموعة أو رفع الصور. اتأكد من الاتصال وإعدادات Firebase Storage.'
          : 'Could not create the group or upload images. Check your connection and Firebase Storage setup.'
      );
      setSubmitting(false);
      setSubmitStatus(null);
    } finally {
      setAvatarUploadProgress(null);
      setCoverUploadProgress(null);
    }
  };

  return (
    <div className="space-y-5" dir={dir}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <BackIcon className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-pulse-text">{dir === 'rtl' ? 'إنشاء مجموعة جديدة' : 'Create a Group'}</h1>
          <p className="text-xs text-pulse-text-muted">{dir === 'rtl' ? 'أنشئ مجتمعك الخاص' : 'Build your own community'}</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard padding="none" className="overflow-hidden">
            <div className="h-32 relative bg-gradient-to-br from-pulse-accent/10 to-pulse-accent-dark/5">
              {coverUrl && <img src={coverUrl} alt="" className="h-full w-full object-cover" />}
            </div>

            <div className="px-5 pb-4">
              <div className="relative -mt-8 w-16 h-16 mb-3">
                <div className="w-full h-full rounded-2xl overflow-hidden bg-pulse-surface border-2 border-pulse-bg flex items-center justify-center shadow-lg">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="object-cover w-full h-full" />
                    : <Hash className="w-7 h-7 text-pulse-accent/40" />
                  }
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => selectImage(event, 'avatar', setAvatarFile, setAvatarPreview)}
                  className="hidden"
                />
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => selectImage(event, 'cover', setCoverFile, setCoverPreview)}
                  className="hidden"
                />
                <Button type="button" variant="glass" disabled={submitting} onClick={() => avatarInputRef.current?.click()} className="gap-2">
                  <Camera className="w-4 h-4" />
                  {dir === 'rtl' ? 'اختيار صورة المجموعة' : 'Choose avatar'}
                </Button>
                <Button type="button" variant="glass" disabled={submitting} onClick={() => coverInputRef.current?.click()} className="gap-2">
                  <Camera className="w-4 h-4" />
                  {dir === 'rtl' ? 'اختيار صورة الغلاف' : 'Choose cover'}
                </Button>
                {uploadError && <p className="sm:col-span-2 text-xs text-red-400">{uploadError}</p>}
                {(submitStatus || avatarUploadProgress !== null || coverUploadProgress !== null) && (
                  <div className="sm:col-span-2 rounded-xl border border-pulse-accent/20 bg-pulse-accent/10 px-3 py-2">
                    {submitStatus && <p className="mb-2 text-xs font-medium text-pulse-text">{submitStatus}</p>}
                    <div className="space-y-2">
                      {avatarUploadProgress !== null && (
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px] text-pulse-text-muted">
                            <span>{dir === 'rtl' ? 'صورة المجموعة' : 'Avatar'}</span>
                            <span>{avatarUploadProgress}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-pulse-accent transition-[width] duration-200"
                              style={{ width: `${Math.max(avatarUploadProgress, 6)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {coverUploadProgress !== null && (
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px] text-pulse-text-muted">
                            <span>{dir === 'rtl' ? 'صورة الغلاف' : 'Cover'}</span>
                            <span>{coverUploadProgress}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-pulse-accent transition-[width] duration-200"
                              style={{ width: `${Math.max(coverUploadProgress, 6)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="space-y-5">
            <Input
              label={dir === 'rtl' ? 'اسم المجموعة' : 'Group Name'}
              placeholder={dir === 'rtl' ? 'مثال: محبي البرمجة' : 'e.g. Programming Lovers'}
              error={errors.name?.message}
              {...register('name')}
            />

            <Textarea
              label={dir === 'rtl' ? 'الوصف' : 'Description'}
              placeholder={dir === 'rtl' ? 'صف مجموعتك ولمن تناسب...' : 'Describe your group and who it is for...'}
              rows={3}
              error={errors.description?.message}
              {...register('description')}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-pulse-text-muted">
                {dir === 'rtl' ? 'الوسوم (حتى 5)' : 'Tags (up to 5)'}
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Hash className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pulse-text-muted pointer-events-none" />
                  <input
                    placeholder={dir === 'rtl' ? 'أضف وسمًا...' : 'Add a tag...'}
                    className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-pulse-text placeholder:text-pulse-text-muted/50 ps-9 pe-3 focus:outline-none focus:border-pulse-accent/50 text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    {...register('tagInput')}
                  />
                </div>
                <Button type="button" variant="glass" size="sm" onClick={addTag} disabled={tags.length >= 5}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-pulse-accent/10 text-pulse-accent border border-pulse-accent/20">
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-pulse-text-muted mb-2">
                {dir === 'rtl' ? 'الخصوصية' : 'Privacy'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: false, icon: Globe, label: dir === 'rtl' ? 'عام' : 'Public', desc: dir === 'rtl' ? 'يظهر للجميع' : 'Visible to everyone' },
                  { value: true, icon: Lock, label: dir === 'rtl' ? 'خاص' : 'Private', desc: dir === 'rtl' ? 'بالدعوة فقط' : 'Invite only' },
                ].map(({ value, icon: Icon, label, desc }) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => setValue('isPrivate', value)}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl border transition-all text-start',
                      isPrivate === value
                        ? 'border-pulse-accent/50 bg-pulse-accent/10 text-pulse-accent'
                        : 'border-white/10 bg-white/5 text-pulse-text-muted hover:border-white/20'
                    )}
                  >
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs opacity-70">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting} className="gap-2">
            {!submitting && <Plus className="w-5 h-5" />}
            {dir === 'rtl' ? 'إنشاء المجموعة' : 'Create Group'}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
