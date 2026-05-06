'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  User,
  Bell,
  Shield,
  Globe,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Lock,
  Mail,
  Eye,
  Check,
  Volume2,
  Monitor,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { resetPassword } from '@/lib/firebase/auth';
import { updateUserLanguage, updateUserSettings } from '@/services/users.service';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { playMessageSound, playNotificationSound, unlockAppAudio } from '@/lib/sounds';
import type { UserNotificationSettings, UserPrivacySettings } from '@/types';

type Section = 'main' | 'account' | 'notifications' | 'privacy' | 'language';
type SavingKey = 'language' | 'notifications' | 'privacy' | 'password' | null;

const DEFAULT_NOTIFICATION_SETTINGS: UserNotificationSettings = {
  inApp: true,
  email: false,
  sound: true,
  browser: false,
};

const DEFAULT_PRIVACY_SETTINGS: UserPrivacySettings = {
  publicProfile: true,
  showOnlineStatus: true,
  allowDirectMessages: true,
};

interface ToggleRowProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

function ToggleRow({ icon: Icon, title, desc, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-start transition-all hover:border-pulse-accent/30 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-pulse-accent/20 bg-pulse-accent/10 text-pulse-accent">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-pulse-text">{title}</span>
        <span className="block text-xs text-pulse-text-muted">{desc}</span>
      </span>
      <span
        className={cn(
          'relative h-6 w-11 rounded-full border transition-all',
          checked
            ? 'border-pulse-accent bg-pulse-accent/80'
            : 'border-white/15 bg-white/10'
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all',
            checked ? 'end-1' : 'start-1'
          )}
        />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const { user, refreshUser, signOutUser } = useAuth();
  const { dir, locale, setLocale } = useLanguage();
  const { t } = useTranslation();
  const router = useRouter();
  const [section, setSection] = useState<Section>('main');
  const [loggingOut, setLoggingOut] = useState(false);
  const [saving, setSaving] = useState<SavingKey>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [privacySettings, setPrivacySettings] = useState(DEFAULT_PRIVACY_SETTINGS);

  const ChevronEnd = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;

  useEffect(() => {
    setNotificationSettings({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...user?.notificationSettings,
    });
    setPrivacySettings({
      ...DEFAULT_PRIVACY_SETTINGS,
      ...user?.privacySettings,
    });
  }, [user?.notificationSettings, user?.privacySettings]);

  const showSuccess = (text: string) => {
    setMessage(text);
    setError(null);
  };

  const showError = (text: string) => {
    setError(text);
    setMessage(null);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOutUser();
      router.replace('/login');
      window.setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }, 350);
    } catch (err) {
      console.error('Logout failed:', err);
      setLoggingOut(false);
      showError(dir === 'rtl' ? 'تعذر تسجيل الخروج. حاول مرة تانية.' : 'Could not sign out. Please try again.');
    }
  };

  const handleLangChange = async (lang: 'ar' | 'en') => {
    if (!user || saving) return;
    const previous = locale;
    setSaving('language');
    setLocale(lang);

    try {
      await updateUserLanguage(user.uid, lang);
      await refreshUser();
      showSuccess(dir === 'rtl' ? 'تم حفظ اللغة.' : 'Language saved.');
    } catch (err) {
      console.error('Language update failed:', err);
      setLocale(previous);
      showError(dir === 'rtl' ? 'تعذر حفظ اللغة.' : 'Could not save language.');
    } finally {
      setSaving(null);
    }
  };

  const saveNotificationSettings = async (next: UserNotificationSettings) => {
    if (!user || saving) return;
    const previous = notificationSettings;
    setNotificationSettings(next);
    setSaving('notifications');

    try {
      await updateUserSettings(user.uid, { notificationSettings: next });
      await refreshUser();
      showSuccess(dir === 'rtl' ? 'تم حفظ إعدادات الإشعارات.' : 'Notification settings saved.');
    } catch (err) {
      console.error('Notification settings update failed:', err);
      setNotificationSettings(previous);
      showError(dir === 'rtl' ? 'تعذر حفظ إعدادات الإشعارات.' : 'Could not save notification settings.');
    } finally {
      setSaving(null);
    }
  };

  const savePrivacySettings = async (next: UserPrivacySettings) => {
    if (!user || saving) return;
    const previous = privacySettings;
    setPrivacySettings(next);
    setSaving('privacy');

    try {
      await updateUserSettings(user.uid, { privacySettings: next });
      await refreshUser();
      showSuccess(dir === 'rtl' ? 'تم حفظ إعدادات الخصوصية.' : 'Privacy settings saved.');
    } catch (err) {
      console.error('Privacy settings update failed:', err);
      setPrivacySettings(previous);
      showError(dir === 'rtl' ? 'تعذر حفظ إعدادات الخصوصية.' : 'Could not save privacy settings.');
    } finally {
      setSaving(null);
    }
  };

  const handleBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      showError(dir === 'rtl' ? 'المتصفح لا يدعم إشعارات سطح المكتب.' : 'This browser does not support desktop notifications.');
      return;
    }

    const permission = await window.Notification.requestPermission();
    await saveNotificationSettings({
      ...notificationSettings,
      browser: permission === 'granted',
    });
  };

  const handlePasswordReset = async () => {
    if (!user?.email || saving) return;
    setSaving('password');

    try {
      await resetPassword(user.email);
      showSuccess(dir === 'rtl' ? 'تم إرسال رابط تغيير كلمة المرور على بريدك.' : 'Password reset email sent.');
    } catch (err) {
      console.error('Password reset failed:', err);
      showError(dir === 'rtl' ? 'تعذر إرسال رابط تغيير كلمة المرور.' : 'Could not send password reset email.');
    } finally {
      setSaving(null);
    }
  };

  const handleTestNotificationSound = async () => {
    if (!notificationSettings.sound) {
      showError(dir === 'rtl' ? 'شغل صوت الإشعارات الأول.' : 'Turn notification sound on first.');
      return;
    }

    await unlockAppAudio();
    const played = playNotificationSound(true);
    if (played) {
      window.setTimeout(() => playMessageSound(true), 360);
    }

    if (played) {
      showSuccess(dir === 'rtl' ? 'تم تشغيل عينة الصوت.' : 'Sound preview played.');
    } else {
      showError(dir === 'rtl' ? 'المتصفح منع تشغيل الصوت حاليًا.' : 'The browser blocked audio playback for now.');
    }
  };

  const settingSections = [
    { key: 'account', icon: User, label: dir === 'rtl' ? 'الحساب' : 'Account', desc: dir === 'rtl' ? 'البريد والبيانات الشخصية' : 'Email and personal info' },
    { key: 'notifications', icon: Bell, label: dir === 'rtl' ? 'الإشعارات' : 'Notifications', desc: dir === 'rtl' ? 'تحكم في التنبيهات' : 'Manage your alerts' },
    { key: 'privacy', icon: Shield, label: dir === 'rtl' ? 'الخصوصية والأمان' : 'Privacy & Security', desc: dir === 'rtl' ? 'كلمة المرور والحماية' : 'Password and protection' },
    { key: 'language', icon: Globe, label: dir === 'rtl' ? 'اللغة والمنطقة' : 'Language & Region', desc: dir === 'rtl' ? 'العربية / English' : 'Arabic / English' },
  ] as const;

  return (
    <div className="space-y-4" dir={dir}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-pulse-accent" />
        <h1 className="text-lg font-bold gradient-text">{dir === 'rtl' ? 'الإعدادات' : 'Settings'}</h1>
      </motion.div>

      {(message || error) && (
        <div
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm',
            error
              ? 'border-red-500/20 bg-red-500/10 text-red-300'
              : 'border-pulse-accent/20 bg-pulse-accent/10 text-pulse-text'
          )}
        >
          {error || message}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Link href={`/profile/${user?.username || ''}`}>
          <GlassCard hover className="flex items-center gap-4">
            <Avatar src={user?.avatarUrl} name={user?.displayName} size="lg" ring />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-pulse-text">{user?.displayName}</p>
              <p className="text-sm text-pulse-accent">@{user?.username}</p>
              <p className="mt-0.5 text-xs text-pulse-text-muted">{user?.email}</p>
            </div>
            <ChevronEnd className="h-5 w-5 flex-shrink-0 text-pulse-text-muted" />
          </GlassCard>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5"
      >
        {settingSections.map(({ key, icon: Icon, label, desc }, i) => (
          <motion.button
            key={key}
            initial={{ opacity: 0, x: dir === 'rtl' ? 12 : -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            onClick={() => setSection(key)}
            className="flex w-full items-center gap-4 px-5 py-4 text-start transition-colors hover:bg-white/5"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-pulse-accent/20 bg-pulse-accent/10">
              <Icon className="h-4 w-4 text-pulse-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-pulse-text">{label}</p>
              <p className="text-xs text-pulse-text-muted">{desc}</p>
            </div>
            <ChevronEnd className="h-4 w-4 flex-shrink-0 text-pulse-text-muted" />
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {section !== 'main' && (
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-3"
          >
            <button
              type="button"
              onClick={() => setSection('main')}
              className="flex items-center gap-2 text-sm text-pulse-text-muted transition-colors hover:text-pulse-text"
            >
              <BackIcon className="h-4 w-4" />
              {dir === 'rtl' ? 'رجوع للإعدادات' : 'Back to settings'}
            </button>

            {section === 'account' && (
              <GlassCard className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-xs text-pulse-text-muted">{dir === 'rtl' ? 'البريد الإلكتروني' : 'Email'}</p>
                  <p className="mt-1 text-sm font-semibold text-pulse-text">{user?.email}</p>
                </div>
                <Link href="/profile/edit">
                  <Button variant="glass" fullWidth className="gap-2">
                    <User className="h-4 w-4" />
                    {dir === 'rtl' ? 'تعديل الملف الشخصي' : 'Edit profile'}
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  fullWidth
                  loading={saving === 'password'}
                  onClick={handlePasswordReset}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {dir === 'rtl' ? 'إرسال رابط تغيير كلمة المرور' : 'Send password reset email'}
                </Button>
              </GlassCard>
            )}

            {section === 'notifications' && (
              <GlassCard className="space-y-3">
                <ToggleRow
                  icon={Bell}
                  title={dir === 'rtl' ? 'إشعارات داخل التطبيق' : 'In-app notifications'}
                  desc={dir === 'rtl' ? 'إظهار التنبيهات داخل PulseSpace' : 'Show alerts inside PulseSpace'}
                  checked={notificationSettings.inApp}
                  disabled={saving === 'notifications'}
                  onChange={() => saveNotificationSettings({ ...notificationSettings, inApp: !notificationSettings.inApp })}
                />
                <ToggleRow
                  icon={Monitor}
                  title={dir === 'rtl' ? 'إشعارات المتصفح' : 'Browser notifications'}
                  desc={dir === 'rtl' ? 'اطلب إذن المتصفح لتفعيل التنبيهات' : 'Ask the browser for notification permission'}
                  checked={notificationSettings.browser}
                  disabled={saving === 'notifications'}
                  onChange={handleBrowserNotifications}
                />
                <ToggleRow
                  icon={Volume2}
                  title={dir === 'rtl' ? 'صوت الإشعارات' : 'Notification sound'}
                  desc={dir === 'rtl' ? 'يشمل صوت الرسائل والتنبيهات الجديدة' : 'Includes new message and alert sounds'}
                  checked={notificationSettings.sound}
                  disabled={saving === 'notifications'}
                  onChange={() => saveNotificationSettings({ ...notificationSettings, sound: !notificationSettings.sound })}
                />
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-pulse-accent/20 bg-pulse-accent/10 text-pulse-accent">
                    <Volume2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-pulse-text">
                      {dir === 'rtl' ? 'اختبار الصوت' : 'Sound test'}
                    </p>
                    <p className="text-xs text-pulse-text-muted">
                      {dir === 'rtl' ? 'جرّب صوت الرسائل والإشعارات من هنا' : 'Preview the message and alert sound here'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    disabled={!notificationSettings.sound}
                    onClick={handleTestNotificationSound}
                    className="flex-shrink-0"
                  >
                    {dir === 'rtl' ? 'تجربة' : 'Test'}
                  </Button>
                </div>
                <ToggleRow
                  icon={Mail}
                  title={dir === 'rtl' ? 'ملخصات البريد' : 'Email digests'}
                  desc={dir === 'rtl' ? 'حفظ تفضيل إرسال ملخصات على البريد' : 'Save preference for email summaries'}
                  checked={notificationSettings.email}
                  disabled={saving === 'notifications'}
                  onChange={() => saveNotificationSettings({ ...notificationSettings, email: !notificationSettings.email })}
                />
              </GlassCard>
            )}

            {section === 'privacy' && (
              <GlassCard className="space-y-3">
                <ToggleRow
                  icon={Eye}
                  title={dir === 'rtl' ? 'ملف شخصي عام' : 'Public profile'}
                  desc={dir === 'rtl' ? 'السماح للآخرين برؤية صفحة حسابك' : 'Allow others to view your profile page'}
                  checked={privacySettings.publicProfile}
                  disabled={saving === 'privacy'}
                  onChange={() => savePrivacySettings({ ...privacySettings, publicProfile: !privacySettings.publicProfile })}
                />
                <ToggleRow
                  icon={Monitor}
                  title={dir === 'rtl' ? 'إظهار حالة الاتصال' : 'Show online status'}
                  desc={dir === 'rtl' ? 'إظهار نقطة الاتصال الخضراء في الشات' : 'Show your green online dot in chat'}
                  checked={privacySettings.showOnlineStatus}
                  disabled={saving === 'privacy'}
                  onChange={() => savePrivacySettings({ ...privacySettings, showOnlineStatus: !privacySettings.showOnlineStatus })}
                />
                <ToggleRow
                  icon={MessageCircle}
                  title={dir === 'rtl' ? 'السماح بالرسائل' : 'Allow direct messages'}
                  desc={dir === 'rtl' ? 'السماح للمستخدمين بفتح محادثة معك' : 'Allow users to start chats with you'}
                  checked={privacySettings.allowDirectMessages}
                  disabled={saving === 'privacy'}
                  onChange={() => savePrivacySettings({ ...privacySettings, allowDirectMessages: !privacySettings.allowDirectMessages })}
                />
                <Button
                  variant="secondary"
                  fullWidth
                  loading={saving === 'password'}
                  onClick={handlePasswordReset}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {dir === 'rtl' ? 'تغيير كلمة المرور عبر البريد' : 'Change password by email'}
                </Button>
              </GlassCard>
            )}

            {section === 'language' && (
              <GlassCard className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-medium text-pulse-text-muted">
                  <Globe className="h-4 w-4" />
                  {dir === 'rtl' ? 'اللغة' : 'Language'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[{ key: 'ar', label: 'العربية', sub: 'RTL' }, { key: 'en', label: 'English', sub: 'LTR' }].map(({ key, label, sub }) => (
                    <button
                      key={key}
                      type="button"
                      disabled={saving === 'language'}
                      onClick={() => handleLangChange(key as 'ar' | 'en')}
                      className={cn(
                        'flex items-center justify-between rounded-xl border px-4 py-3 text-start transition-all disabled:cursor-not-allowed disabled:opacity-60',
                        locale === key
                          ? 'border-pulse-accent/50 bg-pulse-accent/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      )}
                    >
                      <div>
                        <p className={cn('text-sm font-medium', locale === key ? 'text-pulse-accent' : 'text-pulse-text')}>{label}</p>
                        <p className="text-xs text-pulse-text-muted">{sub}</p>
                      </div>
                      {locale === key && <Check className="h-4 w-4 text-pulse-accent" />}
                    </button>
                  ))}
                </div>
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {section === 'main' && (
        <>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <GlassCard className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-pulse-text-muted">
                <Globe className="h-4 w-4" />
                {dir === 'rtl' ? 'اللغة' : 'Language'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[{ key: 'ar', label: 'العربية', sub: 'RTL' }, { key: 'en', label: 'English', sub: 'LTR' }].map(({ key, label, sub }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={saving === 'language'}
                    onClick={() => handleLangChange(key as 'ar' | 'en')}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-4 py-3 text-start transition-all disabled:cursor-not-allowed disabled:opacity-60',
                      locale === key
                        ? 'border-pulse-accent/50 bg-pulse-accent/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    )}
                  >
                    <div>
                      <p className={cn('text-sm font-medium', locale === key ? 'text-pulse-accent' : 'text-pulse-text')}>{label}</p>
                      <p className="text-xs text-pulse-text-muted">{sub}</p>
                    </div>
                    {locale === key && <Check className="h-4 w-4 text-pulse-accent" />}
                  </button>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Link href="/profile/edit">
              <GlassCard hover className="flex items-center gap-3">
                <User className="h-4 w-4 text-pulse-accent" />
                <span className="flex-1 text-sm font-medium text-pulse-text">
                  {dir === 'rtl' ? 'تعديل الملف الشخصي' : 'Edit Profile'}
                </span>
                <ChevronEnd className="h-4 w-4 text-pulse-text-muted" />
              </GlassCard>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Button
              variant="danger"
              size="lg"
              fullWidth
              loading={loggingOut}
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {t.auth.logout}
            </Button>
          </motion.div>
        </>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-1 py-4 text-center">
        <p className="text-xs text-pulse-text-muted/60">PulseSpace v1.0.0</p>
        <p className="text-xs text-pulse-text-muted/40">
          {dir === 'rtl' ? 'صنع لمجتمع PulseSpace' : 'Made for the PulseSpace community'}
        </p>
      </motion.div>
    </div>
  );
}
