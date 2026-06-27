import React, { useState } from 'react';
import { Trash2, Loader2, X, Plus, Home, Users, Cpu, BookOpen, Wrench, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { useSidebar } from '@/App';
import { useLocalConversations } from '@/hooks/use-chat';
import { getUser, signOut } from '@/lib/auth';

/* ─── OMEGA LOGO — standalone amber Ω mark ─── */
export function OmegaLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path
        d="M20 6C11.716 6 5 12.716 5 21c0 4.356 1.788 8.288 4.672 11.116L5 36h9.6c1.716.6 3.548.928 5.46.928 1.9 0 3.724-.324 5.43-.916L34.944 36l-4.672-3.884A14.938 14.938 0 0 0 34.944 21C34.944 12.716 28.284 6 20 6z"
        fill="url(#omegaGold)"
      />
      <path
        d="M20 9C13.373 9 8 14.373 8 21c0 3.627 1.55 6.9 4.022 9.196L8.5 33.5h5.3A12.9 12.9 0 0 0 20 34.944c2.278 0 4.42-.587 6.282-1.62l5.218.176-3.522-3.3A11.943 11.943 0 0 0 32 21c0-6.627-5.373-12-12-12z"
        fill="#0A0A0A"
      />
      <defs>
        <linearGradient id="omegaGold" x1="5" y1="6" x2="35" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#E8A84A" />
          <stop offset="50%"  stopColor="#D4893A" />
          <stop offset="100%" stopColor="#B86E22" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Small mark used in message bubbles ─── */
export function OmegaMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path
        d="M20 6C11.716 6 5 12.716 5 21c0 4.356 1.788 8.288 4.672 11.116L5 36h9.6c1.716.6 3.548.928 5.46.928 1.9 0 3.724-.324 5.43-.916L34.944 36l-4.672-3.884A14.938 14.938 0 0 0 34.944 21C34.944 12.716 28.284 6 20 6z"
        fill="url(#omegaGoldMini)"
      />
      <path
        d="M20 9C13.373 9 8 14.373 8 21c0 3.627 1.55 6.9 4.022 9.196L8.5 33.5h5.3A12.9 12.9 0 0 0 20 34.944c2.278 0 4.42-.587 6.282-1.62l5.218.176-3.522-3.3A11.943 11.943 0 0 0 32 21c0-6.627-5.373-12-12-12z"
        fill="#0A0A0A"
      />
      <defs>
        <linearGradient id="omegaGoldMini" x1="5" y1="6" x2="35" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#E8A84A" />
          <stop offset="50%"  stopColor="#D4893A" />
          <stop offset="100%" stopColor="#B86E22" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '/',          label: 'Home',      Icon: Home },
  { href: '/agents',    label: 'Agents',    Icon: Users },
  { href: '/models',    label: 'Models',    Icon: Cpu },
  { href: '/knowledge', label: 'Knowledge', Icon: BookOpen },
  { href: '/tools',     label: 'Tools',     Icon: Wrench },
];

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { close } = useSidebar();
  const { conversations, create, remove } = useLocalConversations();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const user = getUser();

  const currentId = location.match(/\/chat\/([^/]+)/)?.[1];

  const handleNewChat = () => {
    const conv = create('Yeni Sohbet');
    setLocation(`/chat/${conv.id}`);
    close();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    setDeletingId(id);
    remove(id);
    if (currentId === id) setLocation('/');
    toast.success('Silindi');
    setDeletingId(null);
  };

  /* Group conversations by date */
  const groups: { label: string; items: typeof conversations }[] = [];
  if (conversations?.length) {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yest  = new Date(today); yest.setDate(today.getDate() - 1);
    const week  = new Date(today); week.setDate(today.getDate() - 7);

    const todayList = conversations.filter(c => new Date(c.updatedAt) >= today);
    const yestList  = conversations.filter(c => { const d = new Date(c.updatedAt); return d >= yest && d < today; });
    const weekList  = conversations.filter(c => { const d = new Date(c.updatedAt); return d >= week && d < yest; });
    const older     = conversations.filter(c => new Date(c.updatedAt) < week);

    if (todayList.length) groups.push({ label: 'Today',     items: todayList });
    if (yestList.length)  groups.push({ label: 'Yesterday', items: yestList });
    if (weekList.length)  groups.push({ label: 'This Week', items: weekList });
    if (older.length)     groups.push({ label: 'Earlier',   items: older });
  }

  return (
    <div
      className="w-[165px] h-full flex flex-col select-none"
      style={{ background: '#0C0C0C', borderRight: '1px solid #1A1A1A' }}
    >
      {/* ── Logo ── */}
      <Link href="/" onClick={close}>
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-4 cursor-pointer">
          <OmegaLogo size={36} />
          <div>
            <div className="font-display font-bold text-[13px] leading-none tracking-wide" style={{ color: '#E8E8E8', letterSpacing: '0.04em' }}>OMEGA</div>
            <div className="text-[9px] mt-0.5 tracking-widest font-semibold" style={{ color: '#555', letterSpacing: '0.12em' }}>AI AGENT</div>
          </div>
        </div>
      </Link>

      {/* ── New Chat ── */}
      <div className="px-3 pb-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
          style={{ background: 'transparent', border: '1px solid #222', color: '#888' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#181818'; (e.currentTarget as HTMLElement).style.color = '#CCC'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888'; }}
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="px-2 pb-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = href === '/' ? location === '/' : location.startsWith(href);
          return (
            <Link key={href} href={href} onClick={close}>
              <div
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 cursor-pointer transition-all text-[13px]"
                style={{
                  background: isActive ? '#1C1C1C' : 'transparent',
                  color: isActive ? '#E0E0E0' : '#666',
                  fontWeight: isActive ? '500' : '400',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#161616'; (e.currentTarget as HTMLElement).style.color = '#AAA'; }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#666'; } }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? '#D4893A' : '#555' }} />
                {label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* ── Divider ── */}
      <div style={{ height: '1px', background: '#181818', margin: '4px 12px' }} />

      {/* ── Conversations ── */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {groups.length === 0 ? (
          <p className="text-[11px] text-center pt-6" style={{ color: '#333' }}>No conversations yet</p>
        ) : (
          <div className="space-y-4">
            {groups.map(group => (
              <div key={group.label}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] px-2 mb-1.5" style={{ color: '#333' }}>
                  {group.label}
                </p>
                <div className="space-y-px">
                  {group.items.map(conv => {
                    const isAct = currentId === conv.id;
                    return (
                      <Link key={conv.id} href={`/chat/${conv.id}`} onClick={close}>
                        <div
                          className="group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all"
                          style={{ background: isAct ? '#1C1C1C' : 'transparent', borderLeft: isAct ? '2px solid #D4893A' : '2px solid transparent' }}
                          onMouseEnter={e => { if (!isAct) (e.currentTarget as HTMLElement).style.background = '#151515'; }}
                          onMouseLeave={e => { if (!isAct) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <span className="text-[11.5px] truncate flex-1 leading-snug" style={{ color: isAct ? '#DDD' : '#5A5A5A' }}>
                            {conv.title || 'New Chat'}
                          </span>
                          <button
                            onClick={e => handleDelete(e, conv.id)}
                            disabled={deletingId === conv.id}
                            className="opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1 p-0.5 rounded"
                            style={{ color: '#444' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#444')}
                          >
                            {deletingId === conv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
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

      {/* ── User card ── */}
      {user && (
        <div
          className="px-3 py-3 mx-2 mb-3 rounded-xl cursor-pointer transition-all"
          style={{ background: '#141414', border: '1px solid #1E1E1E' }}
          onClick={() => { signOut(); window.location.reload(); }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1A1A1A')}
          onMouseLeave={e => (e.currentTarget.style.background = '#141414')}
          title="Çıkış yap"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
              style={{ background: 'rgba(212,137,58,0.2)', color: '#D4893A', border: '1px solid rgba(212,137,58,0.3)' }}
            >
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold truncate" style={{ color: '#CCC' }}>{user.name || 'User'}</div>
              <div className="text-[9px] truncate" style={{ color: '#D4893A' }}>Pro Plan</div>
            </div>
            <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: '#444' }} />
          </div>
        </div>
      )}
    </div>
  );
}
