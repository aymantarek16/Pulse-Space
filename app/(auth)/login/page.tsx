'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Code2, Copyright, Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import { loginWithEmail } from '@/lib/firebase/auth';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { SocialAuth } from '@/components/auth/SocialAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور قصيرة جداً'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const { locale, setLocale, dir } = useLanguage();
  const { user, loading, initialized } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const currentYear = new Date().getFullYear();

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

  useEffect(() => {
    if (!initialized || loading || !user) return;
    router.replace(user.isOnboarded ? '/home' : '/onboarding');
  }, [initialized, loading, router, user]);

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
    <div className="login-page" dir={dir}>
      <AuthBackground />

      {/* Language toggle */}
      <button
        onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
        className="fixed top-4 end-4 z-50 glass px-3 py-1.5 rounded-xl text-xs text-pulse-text-muted hover:text-pulse-text transition-colors"
      >
        {locale === 'ar' ? 'EN' : 'عربي'}
      </button>

      <main className="login-main">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="auth-card login-card"
        >
          {/* Logo */}
          <motion.div variants={itemVariants} className="login-logo-row flex items-center justify-start gap-3">
            <div className="login-logo-icon rounded-xl bg-gradient-to-br from-pulse-accent to-pulse-accent-dark flex items-center justify-center shadow-lg shadow-pulse-accent/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 text-start">
              <h1 className="text-lg font-bold gradient-text">PulseSpace</h1>
              <p className="text-xs text-pulse-text-muted">{t.auth.welcomeBack}</p>
            </div>
          </motion.div>

          {/* Social auth */}
          <motion.div variants={itemVariants}>
            <SocialAuth label={t.auth.loginWithGoogle} buttonClassName="login-social-button gap-3 rounded-xl text-sm" />
          </motion.div>

          {/* Divider */}
          <motion.div variants={itemVariants} className="login-divider flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-pulse-text-muted">{t.common.or}</span>
            <div className="flex-1 h-px bg-white/10" />
          </motion.div>

          {/* Form */}
          <motion.form
            variants={itemVariants}
            onSubmit={handleSubmit(onSubmit)}
            className="login-form"
          >
            <Input
              label={t.auth.email}
              type="email"
              placeholder="hello@example.com"
              icon={<Mail className="w-4 h-4" />}
              className="login-input"
              error={errors.email?.message}
              autoComplete="email"
              {...register('email')}
            />

            <div className="login-password-field">
              <Input
                label={t.auth.password}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                iconPosition="left"
                className="login-input pe-12"
                error={errors.password?.message}
                autoComplete="current-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-password-toggle"
                aria-label="Toggle password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
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
              className="login-submit mt-1 rounded-xl text-base"
            >
              {t.auth.login}
            </Button>
          </motion.form>

          {/* Register link */}
          <motion.p
            variants={itemVariants}
            className="login-register text-center text-sm text-pulse-text-muted"
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

        <motion.footer
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.35 }}
          className="login-footer"
        >
          <div className="login-footer-inner">
            <span className="login-footer-icon">
              <Code2 className="h-3.5 w-3.5" />
            </span>
            <span className="login-footer-copy">
              <Copyright className="h-3.5 w-3.5 flex-shrink-0 text-pulse-accent/80" />
              <span>{currentYear}</span>
              <span>
                {dir === 'rtl' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
              </span>
              <span className="text-pulse-text-muted/50">·</span>
              <span>{dir === 'rtl' ? 'تطوير' : 'Developed by'}</span>
              <span className="font-semibold text-pulse-accent">Ayman Tarek</span>
            </span>
          </div>
        </motion.footer>
      </main>
    </div>
  );
}
