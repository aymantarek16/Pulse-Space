'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActivity } from '@/contexts/ActivityContext';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ConversationList } from '@/components/chat/ConversationList';
import { NewConversationModal } from '@/components/chat/NewConversationModal';
import { Button } from '@/components/ui/Button';
import { MessageCircle, Plus } from 'lucide-react';
import type { Conversation } from '@/types';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params?.conversationId as string;
  const { user } = useAuth();
  const { dir } = useLanguage();
  const { conversations, conversationsLoading: loading } = useActivity();
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!conversationId || !conversations.length) return;
    const found = conversations.find((c) => c.id === conversationId);
    setActiveConv(found || null);
  }, [conversationId, conversations]);

  if (!user) return null;

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[#07111f]/70" dir={dir}>
      {/* Conversations sidebar */}
      <div className="hidden min-h-0 w-[22rem] flex-shrink-0 flex-col border-e border-white/10 bg-[#07111f]/85 shadow-2xl shadow-black/20 backdrop-blur-xl md:flex">
        {/* Sidebar header */}
        <div className="flex h-[4.5rem] flex-shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-pulse-accent/20 bg-pulse-accent/10">
              <MessageCircle className="h-5 w-5 text-pulse-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-bold text-pulse-text">
                {dir === 'rtl' ? 'الرسائل' : 'Messages'}
              </h2>
              <p className="text-xs text-pulse-text-muted">
                {dir === 'rtl' ? 'محادثاتك النشطة' : 'Your active chats'}
              </p>
            </div>
          </div>
          <Button
            variant="glass"
            size="icon"
            onClick={() => setModalOpen(true)}
            className="h-10 w-10 rounded-2xl"
            aria-label={dir === 'rtl' ? 'محادثة جديدة' : 'New conversation'}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <ConversationList
            conversations={conversations}
            loading={loading}
            activeId={conversationId}
            currentUserId={user.uid}
          />
        </div>
      </div>

      {/* Chat window */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center bg-[#081321]">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-3xl border border-pulse-accent/20 bg-pulse-accent/10 shadow-lg shadow-pulse-accent/10" />
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-pulse-accent/40 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        ) : !activeConv ? (
          /* No conversation selected */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#081321] p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-pulse-accent/20 bg-pulse-accent/10 shadow-xl shadow-pulse-accent/10">
              <MessageCircle className="h-10 w-10 text-pulse-accent/50" />
            </div>
            <div>
              <p className="mb-2 text-xl font-bold text-pulse-text">
                {dir === 'rtl' ? 'اختر محادثة' : 'Select a conversation'}
              </p>
              <p className="max-w-sm text-sm leading-6 text-pulse-text-muted">
                {dir === 'rtl'
                  ? 'اختر محادثة من القائمة أو ابدأ محادثة جديدة'
                  : 'Choose a conversation or start a new one'}
              </p>
            </div>
          </div>
        ) : (
          <ChatWindow
            conversation={activeConv}
            currentUserId={user.uid}
          />
        )}
      </div>

      <NewConversationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
