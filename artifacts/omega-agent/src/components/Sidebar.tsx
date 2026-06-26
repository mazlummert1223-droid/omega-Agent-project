import React, { useState } from 'react';
import { Trash2, Loader2, X, LogOut, SquarePen, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { useSidebar } from '@/App';
import { useLocalConversations } from '@/hooks/use-chat';
import { getUser, signOut } from '@/lib/auth';

/* ─────────────────────────────────────────────────────────────
   OMEGA LOGO  — professional Ω mark in a teal square badge
   ───────────────────────────────────────────────────────────── */
export function OmegaLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="9" fill="url(#logoGrad)" />
      <path
        d="M10 22 C10 12 13.5 8 18 8 C22.5 8 26 12 26 22"
        stroke="white" strokeWidth="2.6" strokeLinecap="round" fill="none"
      />
      <path d="M7 26 L10 26 L10 22" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M29 26 L26 26 L26 22" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#00B8D9" />
          <stop offset="100%" stopColor="#0077A8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { close } = useSidebar();
  const { conversations, create, remove } = useLocalConversations();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoverNew, setHoverNew] = useState(false);
  const user = getUser();

  const currentId = location.match(/\/chat\/([^/]+)/)?.[1];

  const handleNewChat = () => {
    const conv = create('Yeni Sohbet');
    setLocation(`/chat/${conv.id}`);
    close();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    remove(id);
    if (currentId === id) setLocation('/');
    toast.success('Sohbet silindi');
    setDeletingId(null);
  };

  const handleSignOut = () => {
    signOut();
    window.location.reload();
  };

  /* Group conversations by date */
  const groups: { label: string; items: typeof conversations }[] = [];
  if (conversations?.length) {
    const now    = new Date();
    const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yest   = new Date(today); yest.setDate(today.getDate() - 1);
    const week   = new Date(today); week.setDate(today.getDate() - 7);

    const todayList     = conversations.filter(c => new Date(c.updatedAt) >= today);
    const yesterdayList = conversations.filter(c => { const d = new Date(c.updatedAt); return d >= yest && d < today; });
    const weekList      = conversations.filter(c => { const d = new Date(c.updatedAt); return d >= week && d < yest; });
    const olderList     = conversations.filter(c => new Date(c.updatedAt) < week);

    if (todayList.length)     groups.push({ label: 'Bugün',     items: todayList });
    if (yesterdayList.length) groups.push({ label: 'Dün',       items: yesterdayList });
    if (weekList.length)      groups.push({ label: 'Bu Hafta',  items: weekList });
    if (olderList.length)     groups.push({ label: 'Daha Önce', items: olderList });
  }

  return (
    <div
      className="w-64 h-full flex flex-col select-none"
      style={{ background: '#0A0A0A', borderRight: '1px solid #1E1E1E' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer group">
            <OmegaLogo size={32} />
            <div>
              <div className="font-display font-semibold text-[14px] tracking-tight leading-none" style={{ color: '#E8E8E8' }}>
                Omega AI
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: '#444' }}>
                Yapay Zeka Asistanı
              </div>
            </div>
          </div>
        </Link>
        <button
          onClick={close}
          className="md:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: '#555' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#999')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 pb-3">
        <button
          onClick={handleNewChat}
          onMouseEnter={() => setHoverNew(true)}
          onMouseLeave={() => setHoverNew(false)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150"
          style={{
            background: hoverNew ? '#1A1A1A' : 'transparent',
            border: `1px solid ${hoverNew ? '#2A2A2A' : '#1E1E1E'}`,
            color: hoverNew ? '#CECECE' : '#888',
          }}
        >
          <SquarePen className="w-4 h-4" style={{ color: hoverNew ? '#00A3CC' : '#555' }} />
          Yeni sohbet
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: '#181818', margin: '0 12px' }} />

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: '#141414', border: '1px solid #222' }}
            >
              <MessageSquare className="w-5 h-5" style={{ color: '#333' }} />
            </div>
            <p className="text-[12px]" style={{ color: '#444' }}>Henüz sohbet yok</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#333' }}>Yukarıdan başlayın</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(group => (
              <div key={group.label}>
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5"
                  style={{ color: '#383838', letterSpacing: '0.1em' }}
                >
                  {group.label}
                </p>
                <div className="space-y-px">
                  {group.items?.map(conv => {
                    const isActive = currentId === conv.id;
                    return (
                      <Link key={conv.id} href={`/chat/${conv.id}`} onClick={close}>
                        <div
                          className="group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-100"
                          style={{
                            background: isActive ? '#1C1C1C' : 'transparent',
                            borderLeft: isActive ? '2px solid #00A3CC' : '2px solid transparent',
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#141414'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <span
                            className="text-[13px] truncate flex-1 leading-snug"
                            style={{ color: isActive ? '#E0E0E0' : '#676767' }}
                          >
                            {conv.title || 'Yeni Sohbet'}
                          </span>
                          <button
                            onClick={e => handleDelete(e, conv.id)}
                            disabled={deletingId === conv.id}
                            className="opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1 p-1 rounded transition-all"
                            style={{ color: '#555' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
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
            ))}
          </div>
        )}
      </div>

      {/* Footer — user info + sign out */}
      <div style={{ borderTop: '1px solid #181818', padding: '10px 12px 14px' }}>
        {user && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
              style={{ background: 'rgba(0,163,204,0.12)', color: '#00A3CC', border: '1px solid rgba(0,163,204,0.2)' }}
            >
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium truncate" style={{ color: '#888' }}>
                {user.name || user.email}
              </div>
              <div className="text-[10px] truncate" style={{ color: '#3A3A3A' }}>
                {user.email}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] transition-colors"
          style={{ color: '#383838' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#666';
            (e.currentTarget as HTMLElement).style.background = '#141414';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#383838';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <LogOut className="w-3 h-3" />
          Çıkış yap
        </button>
        <p className="text-[10px] text-center mt-2" style={{ color: '#2E2E2E' }}>
          Hermes · Qwen · Llama · Quantum
        </p>
      </div>
    </div>
  );
}
