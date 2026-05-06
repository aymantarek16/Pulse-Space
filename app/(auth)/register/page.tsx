'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Zap } from 'lucide-react';
import { registerWithEmail } from '@/lib/firebase/auth';
import { createUserProfile } from '@/services/users.service';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { SocialAuth } from '@/components/auth/SocialAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

const registerSchema = z.object({
  displayName: z
    .string()
    .min(2, 'الاسم قصير جداً')
    .max(50, 'الاسم طويل جداً'),
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { t } = useTranslation();
  const { locale, setLocale, dir } = useLanguage();
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError('');
    try {
      const cred = await registerWithEmail(data.email, data.password, data.displayName);
      await createUserProfile(cred.user.uid, {
        email: data.email,
        displayName: data.displayName,
      });
      router.replace('/onboarding');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'هذا البريد الإلكتروني مسجل مسبقاً',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
        'auth/invalid-email': 'بريد إلكتروني غير صالح',
      };
      setServerError(messages[code || ''] || 'حدث خطأ. حاول مرة أخرى');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8" dir={dir}>
      <AuthBackground />

      {/* Language toggle */}
      <button
        onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
        className="fixed top-4 end-4 glass px-3 py-1.5 rounded-xl text-xs text-pulse-text-muted hover:text-pulse-text transition-colors z-50"
      >
        {locale === 'ar' ? 'EN' : 'عربي'}
      </button>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="auth-card"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pulse-accent to-pulse-accent-dark flex items-center justify-center shadow-lg shadow-pulse-accent/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">PulseSpace</h1>
            <p className="text-xs text-pulse-text-muted">{t.auth.joinPulseSpace}</p>
          </div>
        </motion.div>

        {/* Social */}
        <motion.div variants={itemVariants}>
          <SocialAuth label={t.auth.loginWithGoogle} />
        </motion.div>

        {/* Divider */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-pulse-text-muted">{t.common.or}</span>
          <div className="flex-1 h-px bg-white/10" />
        </motion.div>

        {/* Form */}
        <motion.form
          variants={itemVariants}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <Input
            label={t.auth.displayName}
            type="text"
            placeholder={locale === 'ar' ? 'محمد أحمد' : 'John Doe'}
            icon={<User className="w-4 h-4" />}
            error={errors.displayName?.message}
            autoComplete="name"
            {...register('displayName')}
          />

          <Input
            label={t.auth.email}
            type="email"
            placeholder="hello@example.com"
            icon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            autoComplete="email"
            {...register('email')}
          />

          <Input
            label={t.auth.password}
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            autoComplete="new-password"
            {...register('password')}
          />

          <Input
            label={t.auth.confirmPassword}
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            {...register('confirmPassword')}
          />

          {serverError && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2"
            >
              ⚠ {serverError}
            </motion.p>
          )}

          {/* Terms */}
          <p className="text-xs text-pulse-text-muted text-center">
            {t.auth.agreeTerms}
          </p>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
          >
            {t.auth.register}
          </Button>
        </motion.form>

        {/* Login link */}
        <motion.p
          variants={itemVariants}
          className="text-center text-sm text-pulse-text-muted mt-6"
        >
          {t.auth.hasAccount}{' '}
          <Link
            href="/login"
            className="text-pulse-accent hover:text-pulse-accent/80 font-medium transition-colors"
          >
            {t.auth.login}
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
