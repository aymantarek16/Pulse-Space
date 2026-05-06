'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, AtSign, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding, isUsernameAvailable } from '@/services/users.service';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { uploadImageFile, validateImageFile } from '@/lib/firebase/storage';

const onboardingSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or fewer')
    .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, and underscores only'),
  bio: z.string().max(160, 'Bio must be 160 characters or fewer'),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const ONBOARDING_SAVE_TIMEOUT_MS = 15000;
const AVATAR_UPLOAD_TIMEOUT_MS = 60000;

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

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const { user, refreshUser, firebaseUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken'
  >('idle');
  const [checkTimer, setCheckTimer] = useState<NodeJS.Timeout | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { username: '', bio: '' },
  });

  const usernameValue = watch('username');
  const currentAvatarUrl = avatarPreview || user?.avatarUrl || firebaseUser?.photoURL || null;

  useEffect(() => {
    if (user?.isOnboarded) {
      router.replace('/home');
    }
  }, [user, router]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (checkTimer) clearTimeout(checkTimer);

    if (!usernameValue || usernameValue.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');

    const timer = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(usernameValue, firebaseUser?.uid);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 600);

    setCheckTimer(timer);

    return () => clearTimeout(timer);
  }, [usernameValue, firebaseUser?.uid]);

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setAvatarError(error);
      event.target.value = '';
      return;
    }

    if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarError(null);
  };

  const onSubmit = async (data: OnboardingFormData) => {
    if (!firebaseUser) {
      setSubmitError(
        dir === 'rtl'
          ? 'انتهت جلسة الدخول. سجل الدخول مرة أخرى.'
          : 'Your session expired. Please sign in again.'
      );
      return;
    }

    if (usernameStatus === 'taken' || usernameStatus === 'checking') return;

    setSubmitError(null);

    try {
      let uploadedAvatarUrl: string | undefined;

      if (avatarFile) {
        try {
          uploadedAvatarUrl = await withTimeout(
            uploadImageFile(avatarFile, `uploads/${firebaseUser.uid}/avatars`),
            AVATAR_UPLOAD_TIMEOUT_MS,
            'Avatar upload timed out.'
          );
        } catch (err) {
          console.error('Avatar upload failed:', err);
          setAvatarError(
            dir === 'rtl'
              ? 'تعذر رفع الصورة. جرّب مرة أخرى أو اضغط تخطي للإكمال بدون صورة.'
              : 'Could not upload the photo. Try again or press Skip to continue without a photo.'
          );
          return;
        }
      }

      await withTimeout(
        completeOnboarding(firebaseUser.uid, {
          username: data.username,
          bio: data.bio,
          avatarUrl: uploadedAvatarUrl || undefined,
        }),
        ONBOARDING_SAVE_TIMEOUT_MS,
        'Profile save timed out.'
      );

      void refreshUser().catch((err) => console.warn('Profile refresh after onboarding failed:', err));
      window.location.replace('/home');
    } catch (err) {
      console.error('Onboarding failed:', err);
      setSubmitError(
        dir === 'rtl'
          ? 'تعذر حفظ الملف. تأكد من الاتصال وحاول مرة أخرى.'
          : 'Could not save your profile. Check your connection and try again.'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir={dir}>
      <AuthBackground />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="auth-card max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-pulse-accent/20 to-pulse-accent-dark/20 border border-pulse-accent/30 mb-4">
            <Camera className="w-5 h-5 text-pulse-accent" />
          </div>
          <h1 className="text-2xl font-bold text-pulse-text mb-1">
            {t.onboarding.title}
          </h1>
          <p className="text-sm text-pulse-text-muted">{t.onboarding.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24">
              <div className="w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-pulse-accent/20 to-pulse-accent-dark/10 border-2 border-dashed border-white/20 flex items-center justify-center">
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-pulse-text-muted" />
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="glass"
              size="md"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Camera className="w-4 h-4" />
              {dir === 'rtl' ? 'اختيار صورة من الجهاز' : 'Choose photo'}
            </Button>
            {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}
          </div>

          <div className="relative">
            <Input
              label={t.onboarding.username}
              placeholder={t.onboarding.usernamePlaceholder}
              icon={<AtSign className="w-4 h-4" />}
              error={errors.username?.message}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              {...register('username')}
            />

            <AnimatePresence>
              {usernameStatus !== 'idle' && usernameValue.length >= 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute end-3 top-8 flex items-center"
                >
                  {usernameStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 text-pulse-text-muted animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Check className="w-3 h-3" />
                      {t.onboarding.usernameAvailable}
                    </span>
                  )}
                  {usernameStatus === 'taken' && (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <X className="w-3 h-3" />
                      {t.onboarding.usernameTaken}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <Textarea
              label={t.onboarding.bio}
              placeholder={t.onboarding.bioPlaceholder}
              rows={3}
              error={errors.bio?.message}
              {...register('bio')}
            />
            <p className="text-xs text-pulse-text-muted text-end mt-1">
              {watch('bio')?.length || 0}/160
            </p>
          </div>

          {submitError && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-sm text-red-300">
              {submitError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => router.replace('/home')}
              className="flex-1"
            >
              {t.onboarding.skip}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={usernameStatus === 'taken' || usernameStatus === 'checking'}
              className="flex-2 flex-grow-[2]"
            >
              {t.onboarding.complete}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
