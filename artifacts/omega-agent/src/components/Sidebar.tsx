import React, { useState } from 'react';
import { useListOpenaiConversations, useCreateOpenaiConversation, useDeleteOpenaiConversation, getListOpenaiConversationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, Trash2, Cpu, Loader2, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';

export function Sidebar() {
  const [location, setLocation] = useLocation();
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
        },
        onError: () => toast.error('Sohbet oluşturulamadı')
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
          if (currentId === id.toString()) {
            setLocation('/');
          }
          toast.success('Sohbet silindi');
        },
        onSettled: () => setDeletingId(null)
      }
    );
  };

  return (
    <div className="w-72 h-screen flex-shrink-0 border-r border-border bg-card/40 backdrop-blur-xl flex flex-col z-20 shadow-2xl relative">
      {/* Brand Header */}
      <div className="p-6 border-b border-border/50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_20px_rgba(176,38,255,0.4)]">
          <Cpu className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl tracking-wider text-glow bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            OMEGA
          </h1>
          <p className="text-xs font-mono text-accent tracking-widest uppercase opacity-80">AI Agent OS</p>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button 
          onClick={handleNewChat} 
          disabled={createMutation.isPending}
          className="w-full gap-2 font-bold tracking-widest bg-white/5 hover:bg-white/10 border-primary/30 hover:border-primary text-white"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          YENİ SOHBET
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        <h2 className="text-xs font-display font-semibold text-muted-foreground px-3 mb-2 mt-4 uppercase tracking-widest">
          Geçmiş Sohbetler
        </h2>
        
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : conversations?.length === 0 ? (
          <div className="text-center p-4 text-sm text-muted-foreground font-mono opacity-50 flex flex-col items-center gap-2">
            <Sparkles className="w-6 h-6" />
            Henüz sohbet yok
          </div>
        ) : (
          conversations?.slice().reverse().map(conv => {
            const isActive = currentId === conv.id.toString();
            return (
              <Link key={conv.id} href={`/chat/${conv.id}`} className="block">
                <div className={cn(
                  "group flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer border",
                  isActive 
                    ? "bg-primary/10 border-primary/30 text-white shadow-[0_0_10px_rgba(176,38,255,0.1)]" 
                    : "border-transparent text-gray-400 hover:bg-secondary hover:text-gray-200"
                )}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium truncate">
                        {conv.title || 'Yeni Sohbet'}
                      </span>
                      <span className="text-[10px] font-mono opacity-50 truncate">
                        {format(new Date(conv.createdAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    disabled={deletingId === conv.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/20 hover:text-destructive rounded-md transition-all flex-shrink-0"
                  >
                    {deletingId === conv.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-destructive" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
