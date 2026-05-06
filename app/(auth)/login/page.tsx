'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import { loginWithEmail } from '@/lib/firebase/auth';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { SocialAuth } from '@/components/auth/SocialAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور قصيرة جداً'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const { locale, setLocale, dir } = useLanguage();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');
    try {
      await loginWithEmail(data.email, data.password);
      router.replace('/');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const messages: Record<string, string> = {
        'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/too-many-requests': 'تم تجاوز الحد. حاول لاحقاً',
        'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      };
      setServerError(messages[code || ''] || 'حدث خطأ. حاول مرة أخرى');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir={dir}>
      <AuthBackground />

      {/* Language toggle */}
      <button
        onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
        className="fixed top-4 end-4 glass px-3 py-1.5 rounded-xl text-xs text-pulse-text-muted hover:text-pulse-text transition-colors"
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
            <p className="text-xs text-pulse-text-muted">{t.auth.welcomeBack}</p>
          </div>
        </motion.div>

        {/* Social auth */}
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
            label={t.auth.email}
            type="email"
            placeholder="hello@example.com"
            icon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            autoComplete="email"
            {...register('email')}
          />

          <div>
            <Input
              label={t.auth.password}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              iconPosition="left"
              error={errors.password?.message}
              autoComplete="current-password"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-pulse-text-muted hover:text-pulse-text transition-colors"
              aria-label="Toggle password"
            />
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-pulse-accent hover:text-pulse-accent/80 transition-colors"
            >
              {t.auth.forgotPassword}
            </Link>
          </div>

          {serverError && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2"
            >
              ⚠ {serverError}
            </motion.p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            className="mt-2"
          >
            {t.auth.login}
          </Button>
        </motion.form>

        {/* Register link */}
        <motion.p
          variants={itemVariants}
          className="text-center text-sm text-pulse-text-muted mt-6"
        >
          {t.auth.noAccount}{' '}
          <Link
            href="/register"
            className="text-pulse-accent hover:text-pulse-accent/80 font-medium transition-colors"
          >
            {t.auth.register}
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
