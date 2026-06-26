import React, { useState } from 'react';
import { useListOpenaiConversations, useCreateOpenaiConversation, useDeleteOpenaiConversation, getListOpenaiConversationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Trash2, Loader2, PenSquare, X, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { useSidebar } from '@/App';
import { lockSession } from '@/lib/security';

function OmegaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="14" r="9" stroke="url(#sGrad)" strokeWidth="2.2"/>
      <path d="M10 24c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="url(#sGrad)" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M7 24h18M11 24v2M21 24v2" stroke="url(#sGrad)" strokeWidth="2" strokeLinecap="round"/>
      <defs>
        <linearGradient id="sGrad" x1="7" y1="5" x2="25" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4FF"/>
          <stop offset="1" stopColor="#F5A623"/>
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
          setLocation(`/chat/${data.id}`);
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
            close();
          }, 0);
        },
        onError: () => {
          toast.error('Sohbet oluşturulamadı');
        }
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
    <div className="w-72 h-full flex flex-col" style={{ background: 'hsl(220 16% 7%)' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-2 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <OmegaIcon className="w-8 h-8" />
          <div>
            <span className="font-display font-bold text-base tracking-tight omega-gradient">Omega AI</span>
            <div className="text-[10px] text-muted-foreground/50 leading-none mt-0.5">Yapay Zeka Asistanı</div>
          </div>
        </div>
        <button
          onClick={close}
          className="md:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-3">
        <button
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 hover:border-primary/35 text-sm font-medium text-primary/90 hover:text-primary transition-all duration-200 group"
        >
          {createMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <PenSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
          }
          Yeni Sohbet
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center p-8 text-sm text-muted-foreground flex flex-col items-center gap-3 mt-4">
            <MessageSquare className="w-7 h-7 opacity-20" />
            <div>
              <p className="font-medium text-foreground/40">Henüz sohbet yok</p>
              <p className="text-xs opacity-60 mt-1">Yeni sohbet başlatın</p>
            </div>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest px-3 py-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items?.map(conv => {
                  const isActive = currentId === conv.id.toString();
                  return (
                    <Link key={conv.id} href={`/chat/${conv.id}`} onClick={close}>
                      <div className={cn(
                        "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-150",
                        isActive
                          ? "bg-primary/10 border border-primary/15"
                          : "hover:bg-secondary/60 border border-transparent"
                      )}>
                        <span className={cn(
                          "text-[13px] truncate flex-1 leading-snug",
                          isActive ? "text-primary/90 font-medium" : "text-foreground/60 hover:text-foreground/90"
                        )}>
                          {conv.title || 'Yeni Sohbet'}
                        </span>
                        <button
                          onClick={(e) => handleDelete(e, conv.id)}
                          disabled={deletingId === conv.id}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-1 hover:text-destructive rounded transition-all flex-shrink-0 ml-1"
                        >
                          {deletingId === conv.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />
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
      <div className="px-3 py-3 border-t border-border/30 space-y-2">
        <button
          onClick={() => { lockSession(); window.location.reload(); }}
          className="w-full flex items-center justify-center gap-2 text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/40 transition-colors text-xs py-2 rounded-lg"
        >
          <Lock className="w-3 h-3" />
          <span>Oturumu Kilitle</span>
        </button>
        <p className="text-[10px] text-muted-foreground/30 text-center leading-relaxed">
          Hermes 405B · Qwen3 80B · Llama 3.3 70B · Gemma 4
        </p>
      </div>
    </div>
  );
}
