import React, { useState } from 'react';
import { useListOpenaiConversations, useCreateOpenaiConversation, useDeleteOpenaiConversation, getListOpenaiConversationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, Trash2, Loader2, PenSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { useSidebar } from '@/App';

// Gemini-style star SVG
function GeminiStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2C14 2 15.5 10 22 14C15.5 18 14 26 14 26C14 26 12.5 18 6 14C12.5 10 14 2 14 2Z" fill="url(#geminiGrad)"/>
      <defs>
        <linearGradient id="geminiGrad" x1="6" y1="2" x2="22" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4"/>
          <stop offset="0.5" stopColor="#9B72CB"/>
          <stop offset="1" stopColor="#D96570"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { close } = useSidebar();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading } = useListOpenaiConversations();
  const createMutation = useCreateOpenaiConversation();
  const deleteMutation = useDeleteOpenaiConversation();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const currentId = location.match(/\/chat\/(\d+)/)?.[1];

  const handleNewChat = () => {
    createMutation.mutate(
      { data: { title: "Yeni Sohbet" } },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          setLocation(`/chat/${data.id}`);
          close();
        },
        onError: () => toast.error('Sohbet oluşturulamadı')
      }
    );
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (currentId === id.toString()) setLocation('/');
        toast.success('Sohbet silindi');
      },
      onSettled: () => setDeletingId(null)
    });
  };

  // Group conversations by date
  const groups: { label: string; items: typeof conversations }[] = [];
  if (conversations?.length) {
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const week = new Date(today); week.setDate(today.getDate() - 7);

    const todayItems = conversations.filter(c => new Date(c.createdAt) >= new Date(today.toDateString()));
    const yesterdayItems = conversations.filter(c => {
      const d = new Date(c.createdAt);
      return d >= new Date(yesterday.toDateString()) && d < new Date(today.toDateString());
    });
    const weekItems = conversations.filter(c => {
      const d = new Date(c.createdAt);
      return d >= week && d < new Date(yesterday.toDateString());
    });
    const olderItems = conversations.filter(c => new Date(c.createdAt) < week);

    if (todayItems.length) groups.push({ label: 'Bugün', items: todayItems.slice().reverse() });
    if (yesterdayItems.length) groups.push({ label: 'Dün', items: yesterdayItems.slice().reverse() });
    if (weekItems.length) groups.push({ label: 'Bu Hafta', items: weekItems.slice().reverse() });
    if (olderItems.length) groups.push({ label: 'Eskiler', items: olderItems.slice().reverse() });
  }

  return (
    <div className="w-72 h-full bg-card/80 backdrop-blur-2xl border-r border-border flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <GeminiStar className="w-8 h-8" />
          <span className="font-display font-bold text-xl gemini-gradient">Omega AI</span>
        </div>
        {/* Close on mobile */}
        <button
          onClick={close}
          className="md:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 pb-2">
        <button
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-full bg-secondary/60 hover:bg-secondary border border-border/60 text-sm font-medium text-foreground/90 hover:text-white transition-all duration-200"
        >
          {createMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
            : <PenSquare className="w-4 h-4 text-primary" />
          }
          Yeni Sohbet
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center p-6 text-sm text-muted-foreground flex flex-col items-center gap-2 mt-8">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <p>Henüz sohbet yok</p>
            <p className="text-xs opacity-60">Yukarıdan yeni sohbet başlat</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 py-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items?.map(conv => {
                  const isActive = currentId === conv.id.toString();
                  return (
                    <Link key={conv.id} href={`/chat/${conv.id}`} onClick={close}>
                      <div className={cn(
                        "group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150",
                        isActive
                          ? "bg-primary/10 text-white"
                          : "text-foreground/70 hover:bg-secondary/80 hover:text-foreground"
                      )}>
                        <span className="text-sm truncate flex-1 leading-snug">
                          {conv.title || 'Yeni Sohbet'}
                        </span>
                        <button
                          onClick={(e) => handleDelete(e, conv.id)}
                          disabled={deletingId === conv.id}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive rounded-md transition-all flex-shrink-0 ml-1"
                        >
                          {deletingId === conv.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/50">
        <p className="text-[11px] text-muted-foreground/50 text-center">
          Llama 405B · Qwen3 Coder · NVIDIA 120B
        </p>
      </div>
    </div>
  );
}
