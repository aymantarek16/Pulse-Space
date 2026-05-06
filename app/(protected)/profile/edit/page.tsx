'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Camera, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/services/users.service';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { imageFileToDataUrl, uploadImageFile, validateImageFile } from '@/lib/firebase/storage';

const editProfileSchema = z.object({
  displayName: z.string().min(2, 'Name is too short').max(50, 'Name is too long'),
  bio: z.string().max(160, 'Bio is too long'),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  location: z.string().max(50, 'Location is too long').optional(),
});

type EditFormData = z.infer<typeof editProfileSchema>;

const PROFILE_SAVE_TIMEOUT_MS = 15000;
const PROFILE_IMAGE_UPLOAD_TIMEOUT_MS = 14000;
const PROFILE_IMAGE_STALL_TIMEOUT_MS = 3500;
const PROFILE_AUTH_SYNC_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export default function EditProfilePage() {
  const { user, firebaseUser, refreshUser } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState<number | null>(null);
  const [coverUploadProgress, setCoverUploadProgress] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      website: user?.website || '',
      location: user?.location || '',
    },
  });

  const avatarUrl = avatarPreview || user?.avatarUrl || null;
  const coverUrl = coverPreview || user?.coverUrl || null;

  useEffect(() => {
    if (!user) return;
    reset({
      displayName: user.displayName || '',
      bio: user.bio || '',
      website: user.website || '',
      location: user.location || '',
    });
  }, [reset, user]);

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
    setSaveError(null);
    setSaveStatus(null);
  };

  const onSubmit = async (data: EditFormData) => {
    if (!user) return;

    setUploadError(null);
    setSaveError(null);
    setSaved(false);
    setSaveStatus(dir === 'rtl' ? 'جاري تجهيز الحفظ...' : 'Preparing save...');

    try {
      if (avatarFile) setAvatarUploadProgress(0);
      if (coverFile) setCoverUploadProgress(0);
      if (avatarFile || coverFile) {
        setSaveStatus(dir === 'rtl' ? 'جاري رفع الصور...' : 'Uploading images...');
      }

      const [uploadedAvatarUrl, uploadedCoverUrl] = await Promise.all([
        avatarFile
          ? uploadProfileImage(avatarFile, 'avatar', `uploads/${user.uid}/avatars`)
          : Promise.resolve(undefined),
        coverFile
          ? uploadProfileImage(coverFile, 'cover', `uploads/${user.uid}/covers`)
          : Promise.resolve(undefined),
      ]);

      const profileUpdates = {
        displayName: data.displayName.trim(),
        bio: data.bio.trim(),
        website: data.website?.trim() || '',
        location: data.location?.trim() || '',
        ...(uploadedAvatarUrl ? { avatarUrl: uploadedAvatarUrl } : {}),
        ...(uploadedCoverUrl ? { coverUrl: uploadedCoverUrl } : {}),
      };

      setSaveStatus(dir === 'rtl' ? 'جاري حفظ البيانات...' : 'Saving profile...');
      await withTimeout(
        updateUserProfile(user.uid, profileUpdates),
        PROFILE_SAVE_TIMEOUT_MS,
        'Profile save timed out.'
      );

      if (firebaseUser) {
        setSaveStatus(dir === 'rtl' ? 'جاري مزامنة الحساب...' : 'Syncing account...');
        await withTimeout(
          updateFirebaseProfile(firebaseUser, {
            displayName: profileUpdates.displayName,
            ...(uploadedAvatarUrl ? { photoURL: uploadedAvatarUrl } : {}),
          }),
          PROFILE_AUTH_SYNC_TIMEOUT_MS,
          'Firebase auth profile sync timed out.'
        ).catch((err) => {
          console.warn('Firebase auth profile sync failed:', err);
        });
      }

      setSaveStatus(dir === 'rtl' ? 'جاري تحديث البيانات...' : 'Refreshing profile...');
      await refreshUser();
      setSaved(true);
      setSaveStatus(null);
      setTimeout(() => {
        router.replace(`/profile/${user.username}`);
      }, 1200);
    } catch (err) {
      console.error('Profile update failed:', err);
      setSaveError(
        dir === 'rtl'
          ? 'تعذر حفظ الملف الشخصي. تأكد من الاتصال وحاول مرة أخرى.'
          : 'Could not save your profile. Check your connection and try again.'
      );
      setSaveStatus(null);
    } finally {
      setAvatarUploadProgress(null);
      setCoverUploadProgress(null);
    }
  };

  const uploadProfileImage = async (
    file: File,
    kind: 'avatar' | 'cover',
    folder: string
  ) => {
    const setProgress = kind === 'avatar' ? setAvatarUploadProgress : setCoverUploadProgress;

    try {
      return await uploadImageFile(file, folder, {
        timeoutMs: PROFILE_IMAGE_UPLOAD_TIMEOUT_MS,
        stallTimeoutMs: PROFILE_IMAGE_STALL_TIMEOUT_MS,
        onProgress: setProgress,
      });
    } catch (error) {
      console.warn('Firebase Storage profile upload failed, using profile data fallback:', error);
      setSaveStatus(
        dir === 'rtl'
          ? 'Storage لا يستجيب، جاري حفظ نسخة مضغوطة...'
          : 'Storage is not responding, saving an optimized copy...'
      );
      const dataUrl = await imageFileToDataUrl(file, {
        maxDimension: kind === 'avatar' ? 520 : 1280,
        maxDataUrlLength: kind === 'avatar' ? 420000 : 780000,
        quality: kind === 'avatar' ? 0.84 : 0.78,
      });
      setProgress(100);
      return dataUrl;
    }
  };

  return (
    <div className="space-y-5" dir={dir}>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <BackIcon className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-pulse-text">{t.profile.editProfile}</h1>
          <p className="text-xs text-pulse-text-muted">
            {dir === 'rtl' ? 'تعديل بيانات ملفك الشخصي' : 'Update your profile information'}
          </p>
        </div>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <GlassCard padding="none" className="overflow-hidden">
            <div className="relative">
              <div className="h-36 relative cover-gradient">
                {coverUrl && (
                  <img
                    src={coverUrl}
                    alt="Cover"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="absolute -bottom-10 start-5">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-gradient-to-br from-pulse-accent/20 to-pulse-accent-dark/20 ring-2 ring-pulse-accent/50 ring-offset-2 ring-offset-pulse-bg shadow-xl flex items-center justify-center text-2xl font-semibold text-pulse-accent">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user?.displayName || 'Avatar'} className="h-full w-full object-cover" />
                  ) : (
                    <span>{user?.displayName?.charAt(0)?.toUpperCase() || '?'}</span>
                  )}
                </div>
              </div>
            </div>

          <div className="pt-14 pb-5 px-5 grid gap-3 sm:grid-cols-2">
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
            <Button type="button" variant="glass" disabled={isSubmitting} onClick={() => avatarInputRef.current?.click()} className="gap-2">
              <Camera className="w-4 h-4" />
              {dir === 'rtl' ? 'اختيار صورة شخصية' : 'Choose avatar'}
            </Button>
            <Button type="button" variant="glass" disabled={isSubmitting} onClick={() => coverInputRef.current?.click()} className="gap-2">
              <Camera className="w-4 h-4" />
              {dir === 'rtl' ? 'اختيار صورة الغلاف' : 'Choose cover'}
            </Button>
            {uploadError && <p className="sm:col-span-2 text-xs text-red-400">{uploadError}</p>}
            {saveError && (
              <p className="sm:col-span-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {saveError}
              </p>
            )}
            {(saveStatus || avatarUploadProgress !== null || coverUploadProgress !== null) && (
              <div className="sm:col-span-2 rounded-xl border border-pulse-accent/20 bg-pulse-accent/10 px-3 py-2">
                {saveStatus && (
                  <p className="mb-2 text-xs font-medium text-pulse-text">
                    {saveStatus}
                  </p>
                )}
                <div className="space-y-2">
                  {avatarUploadProgress !== null && (
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[10px] text-pulse-text-muted">
                        <span>{dir === 'rtl' ? 'الصورة الشخصية' : 'Avatar'}</span>
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
        </GlassCard>

        <GlassCard className="space-y-5">
          <Input
            label={t.profile.displayName}
            placeholder={dir === 'rtl' ? 'اسمك الكامل' : 'Your full name'}
            error={errors.displayName?.message}
            {...register('displayName')}
          />

          <div>
            <Textarea
              label={t.profile.bio}
              placeholder={
                dir === 'rtl'
                  ? 'أخبر الجميع شيئًا عن نفسك...'
                  : 'Tell everyone about yourself...'
              }
              rows={3}
              error={errors.bio?.message}
              {...register('bio')}
            />
            <p className="text-xs text-pulse-text-muted text-end mt-1">
              {watch('bio')?.length || 0}/160
            </p>
          </div>

          <Input
            label={t.profile.website}
            placeholder="https://yourwebsite.com"
            type="url"
            error={errors.website?.message}
            {...register('website')}
          />

          <Input
            label={t.profile.location}
            placeholder={dir === 'rtl' ? 'القاهرة، مصر' : 'Cairo, Egypt'}
            error={errors.location?.message}
            {...register('location')}
          />
        </GlassCard>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="glass"
            size="lg"
            fullWidth
            disabled={isSubmitting}
            onClick={() => router.back()}
          >
            {t.profile.cancel}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting && !saved}
          >
            {saved ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                {dir === 'rtl' ? 'تم الحفظ!' : 'Saved!'}
              </span>
            ) : (
              t.profile.saveChanges
            )}
          </Button>
        </div>
      </motion.form>
    </div>
  );
}
