import React, { useState } from 'react';
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, Loader2, X, Lock, SquarePen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { useSidebar } from '@/App';
import { lockSession } from '@/lib/security';

/* ── Omega wordmark logo ── */
function OmegaWordmark() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Ω glyph in a clean circle badge */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'hsl(195 100% 45% / 0.12)', border: '1px solid hsl(195 100% 45% / 0.22)' }}
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <path
            d="M10 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM6 14.5c0-2.21 1.79-4 4-4s4 1.79 4 4"
            stroke="hsl(195 100% 45%)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M4.5 14.5h11M7 14.5v1.8M13 14.5v1.8"
            stroke="hsl(195 100% 45%)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span
        className="font-display font-semibold text-[15px] tracking-tight"
        style={{ color: 'hsl(0 0% 88%)' }}
      >
        Omega AI
      </span>
    </div>
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
      { data: { title: 'Yeni Sohbet' } },
      {
        onSuccess: (data) => {
          setLocation(`/chat/${data.id}`);
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
            close();
          }, 0);
        },
        onError: () => toast.error('Sohbet oluşturulamadı'),
      }
    );
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          if (currentId === id.toString()) setLocation('/');
          toast.success('Sohbet silindi');
        },
        onSettled: () => setDeletingId(null),
      }
    );
  };

  /* Group by date */
  const groups: { label: string; items: typeof conversations }[] = [];
  if (conversations?.length) {
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

    const todayList     = conversations.filter(c => new Date(c.createdAt) >= new Date(today.toDateString()));
    const yesterdayList = conversations.filter(c => {
      const d = new Date(c.createdAt);
      return d >= new Date(yesterday.toDateString()) && d < new Date(today.toDateString());
    });
    const weekList  = conversations.filter(c => {
      const d = new Date(c.createdAt);
      return d >= weekAgo && d < new Date(yesterday.toDateString());
    });
    const olderList = conversations.filter(c => new Date(c.createdAt) < weekAgo);

    if (todayList.length)     groups.push({ label: 'Bugün',     items: todayList.slice().reverse() });
    if (yesterdayList.length) groups.push({ label: 'Dün',       items: yesterdayList.slice().reverse() });
    if (weekList.length)      groups.push({ label: 'Bu Hafta',  items: weekList.slice().reverse() });
    if (olderList.length)     groups.push({ label: 'Daha Önce', items: olderList.slice().reverse() });
  }

  return (
    <div
      className="w-64 h-full flex flex-col"
      style={{ background: 'hsl(0 0% 7%)', borderRight: '1px solid hsl(0 0% 12%)' }}
    >
      {/* ── Header ── */}
      <div className="px-3 pt-4 pb-3 flex items-center justify-between">
        <OmegaWordmark />
        <button
          onClick={close}
          className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── New Chat ── */}
      <div className="px-3 pb-3">
        <button
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150 group"
          style={{ border: '1px solid hsl(0 0% 14%)' }}
        >
          {createMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
            : <SquarePen className="w-4 h-4 group-hover:text-primary transition-colors" />
          }
          <span>Yeni sohbet</span>
        </button>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: '1px', background: 'hsl(0 0% 12%)', margin: '0 12px' }} />

      {/* ── Conversation List ── */}
      <div className="flex-1 overflow-y-auto px-1.5 py-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-sm text-muted-foreground/60">Henüz sohbet yok</p>
            <p className="text-xs text-muted-foreground/40 mt-1">Yukarıdan başlayın</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest px-2.5 mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items?.map(conv => {
                    const isActive = currentId === conv.id.toString();
                    return (
                      <Link key={conv.id} href={`/chat/${conv.id}`} onClick={close}>
                        <div
                          className={cn(
                            'group flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer transition-colors duration-100',
                            isActive
                              ? 'bg-secondary text-foreground'
                              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground/90'
                          )}
                        >
                          <span className="text-[13px] truncate flex-1 leading-snug">
                            {conv.title || 'Yeni Sohbet'}
                          </span>
                          <button
                            onClick={e => handleDelete(e, conv.id)}
                            disabled={deletingId === conv.id}
                            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 flex-shrink-0 ml-1 p-0.5 rounded hover:text-destructive transition-all"
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
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid hsl(0 0% 12%)', padding: '12px' }}>
        <button
          onClick={() => { lockSession(); window.location.reload(); }}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/50 transition-colors"
        >
          <Lock className="w-3 h-3" />
          Oturumu kilitle
        </button>
        <p className="text-[10px] text-muted-foreground/25 text-center mt-2 leading-relaxed">
          Hermes 405B · Qwen3 · Llama 3.3 · Gemma 4
        </p>
      </div>
    </div>
  );
}
