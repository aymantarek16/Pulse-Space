'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const PWA_PROMPT_COUNT_KEY = 'pulsespace:pwaPromptCount';
const PWA_PROMPT_INSTALLED_KEY = 'pulsespace:pwaInstalled';
const PWA_PROMPT_SESSION_KEY = 'pulsespace:pwaPromptShownThisSession';
const MAX_PROMPT_SHOWS = 2;

function getPromptCount() {
  try {
    return Number(window.localStorage.getItem(PWA_PROMPT_COUNT_KEY) || '0');
  } catch {
    return MAX_PROMPT_SHOWS;
  }
}

function canShowInstallPrompt() {
  try {
    const installed = window.localStorage.getItem(PWA_PROMPT_INSTALLED_KEY) === 'true';
    const shownThisSession = window.sessionStorage.getItem(PWA_PROMPT_SESSION_KEY) === 'true';
    return !installed && !shownThisSession && getPromptCount() < MAX_PROMPT_SHOWS;
  } catch {
    return false;
  }
}

function markPromptShown() {
  try {
    window.localStorage.setItem(PWA_PROMPT_COUNT_KEY, String(getPromptCount() + 1));
    window.sessionStorage.setItem(PWA_PROMPT_SESSION_KEY, 'true');
  } catch {}
}

export function PWAInstallPrompt() {
  const { dir } = useLanguage();
  const [prompt, setPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    let showTimer: number | undefined;

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      try {
        window.localStorage.setItem(PWA_PROMPT_INSTALLED_KEY, 'true');
      } catch {}
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
      if (!canShowInstallPrompt()) return;

      if (showTimer) window.clearTimeout(showTimer);
      showTimer = window.setTimeout(() => {
        if (!canShowInstallPrompt()) return;
        markPromptShown();
        setVisible(true);
      }, 10000);
    };

    const installedHandler = () => {
      try {
        window.localStorage.setItem(PWA_PROMPT_INSTALLED_KEY, 'true');
      } catch {}
      setPrompt(null);
      setVisible(false);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      if (showTimer) window.clearTimeout(showTimer);
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      try {
        window.localStorage.setItem(PWA_PROMPT_INSTALLED_KEY, 'true');
      } catch {}
      setInstalled(true);
    }
    setVisible(false);
    setPrompt(null);
  };

  if (installed || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: 'spring', bounce: 0.3 }}
        className="fixed bottom-20 md:bottom-6 start-4 end-4 md:start-auto md:end-6 md:w-80 z-50"
        dir={dir}
      >
        <div className="rounded-2xl bg-pulse-surface border border-white/10 shadow-2xl shadow-black/50 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pulse-accent to-pulse-accent-dark flex items-center justify-center flex-shrink-0 shadow-lg shadow-pulse-accent/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-pulse-text">
                {dir === 'rtl' ? 'ثبّت PulseSpace' : 'Install PulseSpace'}
              </p>
              <p className="text-xs text-pulse-text-muted mt-0.5">
                {dir === 'rtl'
                  ? 'أضف التطبيق للشاشة الرئيسية للوصول السريع'
                  : 'Add to home screen for quick access'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pulse-accent to-pulse-accent-dark text-pulse-bg text-xs font-bold hover:shadow-lg hover:shadow-pulse-accent/30 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  {dir === 'rtl' ? 'تثبيت' : 'Install'}
                </button>
                <button
                  onClick={() => setVisible(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-pulse-text-muted hover:bg-white/10 transition-colors"
                >
                  {dir === 'rtl' ? 'لاحقاً' : 'Later'}
                </button>
              </div>
            </div>
            <button onClick={() => setVisible(false)} className="text-pulse-text-muted hover:text-pulse-text transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
