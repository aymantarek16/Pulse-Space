'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MessageCircle, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActivity } from '@/contexts/ActivityContext';
import { ConversationList } from '@/components/chat/ConversationList';
import { NewConversationModal } from '@/components/chat/NewConversationModal';
import { Button } from '@/components/ui/Button';

export default function MessagesPage() {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const { conversations, conversationsLoading: loading } = useActivity();
  const [modalOpen, setModalOpen] = useState(false);
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[#07111f]/70" dir={dir}>
      <div className="flex min-h-0 w-full flex-col bg-[#07111f]/85 backdrop-blur-xl md:w-[22rem] md:flex-shrink-0 md:border-e md:border-white/10 md:shadow-2xl md:shadow-black/20">
        {/* Header */}
        <div className="flex h-[4.5rem] flex-shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/home"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-pulse-text-muted transition-all hover:border-pulse-accent/30 hover:bg-pulse-accent/10 hover:text-pulse-accent md:hidden"
              title={dir === 'rtl' ? 'العودة للرئيسية' : 'Back to home'}
              aria-label={dir === 'rtl' ? 'العودة للرئيسية' : 'Back to home'}
            >
              <BackIcon className="h-5 w-5" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-pulse-accent/20 bg-pulse-accent/10">
              <MessageCircle className="h-5 w-5 text-pulse-accent" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-bold text-pulse-text">
                {dir === 'rtl' ? 'الرسائل' : 'Messages'}
              </h1>
              <p className="text-xs text-pulse-text-muted">
                {dir === 'rtl' ? 'كل محادثاتك في مكان واحد' : 'All your chats in one place'}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="h-10 rounded-2xl px-3"
            onClick={() => setModalOpen(true)}
            aria-label={dir === 'rtl' ? 'محادثة جديدة' : 'New conversation'}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{dir === 'rtl' ? 'جديد' : 'New'}</span>
          </Button>
        </div>

        {/* Conversations list */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {conversations.length === 0 && !loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-pulse-accent/20 bg-pulse-accent/10 shadow-lg shadow-pulse-accent/10">
                <MessageCircle className="h-8 w-8 text-pulse-accent/50" />
              </div>
              <div>
                <p className="mb-1 font-semibold text-pulse-text">
                  {dir === 'rtl' ? 'لا توجد محادثات بعد' : 'No conversations yet'}
                </p>
                <p className="mb-4 text-sm leading-6 text-pulse-text-muted">
                  {dir === 'rtl' ? 'ابدأ محادثة مع أي مستخدم' : 'Start chatting with anyone'}
                </p>
                <Button variant="primary" size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 rounded-2xl">
                  <Plus className="w-4 h-4" />
                  {dir === 'rtl' ? 'محادثة جديدة' : 'New Conversation'}
                </Button>
              </div>
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              loading={loading}
              currentUserId={user?.uid || ''}
            />
          )}
        </div>
      </div>

      <div className="hidden flex-1 flex-col items-center justify-center bg-[#081321] p-8 text-center md:flex">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-pulse-accent/20 bg-pulse-accent/10 shadow-xl shadow-pulse-accent/10">
          <MessageCircle className="h-10 w-10 text-pulse-accent/50" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-pulse-text">
          {dir === 'rtl' ? 'اختر محادثة' : 'Select a conversation'}
        </h2>
        <p className="max-w-sm text-sm leading-6 text-pulse-text-muted">
          {dir === 'rtl'
            ? 'اختر محادثة من القائمة أو ابدأ محادثة جديدة للمتابعة'
            : 'Choose a chat from the list or start a new conversation to continue'}
        </p>
      </div>

      <NewConversationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
