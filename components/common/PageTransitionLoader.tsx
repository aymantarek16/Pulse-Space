'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Zap } from 'lucide-react';

const SHOW_DELAY_MS = 160;
const MIN_VISIBLE_MS = 180;
const MAX_VISIBLE_MS = 2500;

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function shouldHandleLink(anchor: HTMLAnchorElement, event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || isModifiedClick(event)) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;
  if (anchor.dataset.pageLoader === 'false') return false;

  const rawHref = anchor.getAttribute('href');
  if (!rawHref) return false;
  if (
    rawHref.startsWith('#') ||
    rawHref.startsWith('mailto:') ||
    rawHref.startsWith('tel:') ||
    rawHref.startsWith('javascript:')
  ) {
    return false;
  }

  const targetUrl = new URL(anchor.href, window.location.href);
  if (targetUrl.origin !== window.location.origin) return false;

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const targetPath = `${targetUrl.pathname}${targetUrl.search}`;

  return currentPath !== targetPath;
}

export function PageTransitionLoader() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const startedAtRef = useRef(0);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  const clearTimer = (timerRef: MutableRefObject<number | null>) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const hide = useCallback(() => {
    clearTimer(showTimerRef);
    clearTimer(fallbackTimerRef);
    clearTimer(hideTimerRef);

    if (!startedAtRef.current) {
      setVisible(false);
      return;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(MIN_VISIBLE_MS - elapsed, 0);

    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      startedAtRef.current = 0;
    }, remaining);
  }, []);

  const show = useCallback(() => {
    clearTimer(showTimerRef);
    clearTimer(hideTimerRef);
    clearTimer(fallbackTimerRef);

    showTimerRef.current = window.setTimeout(() => {
      startedAtRef.current = Date.now();
      setVisible(true);

      fallbackTimerRef.current = window.setTimeout(() => {
        hide();
      }, MAX_VISIBLE_MS);
    }, SHOW_DELAY_MS);
  }, [hide]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!shouldHandleLink(anchor, event)) return;

      show();
    };

    const handlePopState = () => show();

    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [show]);

  useEffect(() => {
    hide();
  }, [pathname, hide]);

  useEffect(() => {
    return () => {
      clearTimer(hideTimerRef);
      clearTimer(showTimerRef);
      clearTimer(fallbackTimerRef);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-pulse-bg/10"
          role="status"
          aria-label="Loading page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden bg-pulse-accent/10">
            <motion.div
              className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-pulse-accent to-transparent shadow-[0_0_18px_rgba(77,214,167,0.9)]"
              initial={{ x: '-120%' }}
              animate={prefersReducedMotion ? { x: '120%' } : { x: ['-120%', '360%'] }}
              transition={{
                duration: prefersReducedMotion ? 0.4 : 1.05,
                repeat: prefersReducedMotion ? 0 : Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>

          <motion.div
            className="relative flex h-28 w-28 items-center justify-center"
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <motion.span
              className="absolute h-28 w-28 rounded-[2rem] border border-pulse-accent/20 bg-pulse-surface/50 shadow-[0_24px_70px_rgba(77,214,167,0.22)]"
              animate={prefersReducedMotion ? undefined : { scale: [0.96, 1.05, 0.96], opacity: [0.55, 0.9, 0.55] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.span
              className="absolute h-24 w-24 rounded-full border border-pulse-accent/[0.15]"
              animate={prefersReducedMotion ? undefined : { scale: [1, 1.14, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.span
              className="absolute h-[4.8rem] w-[4.8rem] rounded-full border-2 border-pulse-accent/20 border-t-pulse-accent border-e-pulse-accent/80"
              animate={prefersReducedMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pulse-accent to-pulse-accent-dark text-pulse-bg shadow-lg shadow-pulse-accent/30"
              animate={prefersReducedMotion ? undefined : { y: [0, -3, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Zap className="h-7 w-7" />
            </motion.div>
            <div className="absolute -bottom-3 flex gap-1.5">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="h-1.5 w-1.5 rounded-full bg-pulse-accent/75"
                  animate={prefersReducedMotion ? undefined : { y: [0, -5, 0], opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: dot * 0.12, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
