import React, { useState } from 'react';
import { Trash2, Loader2, Plus, Home, Users, Cpu, BookOpen, Wrench, ChevronDown, Settings, Code2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { useSidebar } from '@/App';
import { useLocalConversations } from '@/hooks/use-chat';
import { getUser, signOut } from '@/lib/auth';

/* ─── Omega Logo — SVG luminance→alpha filter removes dark background ─── */
export function OmegaLogo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/omega-logo.png"
      alt="Omega"
      className="omega-logo"
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
        filter: 'url(#omega-logo-filter) drop-shadow(0 0 8px rgba(255,200,80,0.9))',
      }}
    />
  );
}

/* ─── Small mark for message bubbles ─── */
export function OmegaMark({ size = 22 }: { size?: number }) {
  return (
    <img
      src="/omega-logo.png"
      alt="Ω"
      className="omega-logo omega-mark"
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
        filter: 'url(#omega-logo-filter) drop-shadow(0 0 5px rgba(255,200,80,0.75))',
      }}
    />
  );
}

const NAV_ITEMS = [
  { href: '/',          label: 'Home',      Icon: Home },
  { href: '/apps',      label: 'My Apps',   Icon: Code2 },
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
    const conv = create('New Chat');
    setLocation(`/chat/${conv.id}`);
    close();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    setDeletingId(id);
    remove(id);
    if (currentId === id) setLocation('/');
    toast.success('Deleted');
    setDeletingId(null);
  };

  /* Group by date */
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
    <div className="w-[162px] h-full flex flex-col select-none"
      style={{ background: '#0D0D0D', borderRight: '1px solid #191919' }}>

      {/* Logo */}
      <Link href="/" onClick={close}>
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-3.5 cursor-pointer">
          <OmegaLogo size={34} />
          <div>
            <div className="font-display font-bold text-[12.5px] leading-none"
              style={{ color: '#EEEEEE', letterSpacing: '0.08em' }}>OMEGA</div>
            <div className="text-[9px] mt-[3px] font-semibold"
              style={{ color: '#444', letterSpacing: '0.18em' }}>AI AGENT</div>
          </div>
        </div>
      </Link>

      {/* New Chat */}
      <div className="px-3 pb-2">
        <button onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-all group"
          style={{ background: 'transparent', border: '1px solid #222', color: '#666' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#191919'; (e.currentTarget as HTMLElement).style.color = '#CCC'; (e.currentTarget as HTMLElement).style.borderColor = '#2C2C2C'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#666'; (e.currentTarget as HTMLElement).style.borderColor = '#222'; }}
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </button>
      </div>

      {/* Nav */}
      <nav className="px-2 pb-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = href === '/' ? location === '/' : location.startsWith(href);
          return (
            <Link key={href} href={href} onClick={close}>
              <div
                className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg mb-px cursor-pointer transition-all text-[12.5px]"
                style={{
                  background: isActive ? '#1C1C1C' : 'transparent',
                  color: isActive ? '#EAEAEA' : '#5A5A5A',
                  fontWeight: isActive ? '500' : '400',
                  borderLeft: isActive ? '2px solid #F0972E' : '2px solid transparent',
                  paddingLeft: isActive ? '10px' : '12px',
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = '#161616'; (e.currentTarget as HTMLElement).style.color = '#999'; } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#5A5A5A'; } }}
              >
                <Icon className="w-[15px] h-[15px] flex-shrink-0"
                  style={{ color: isActive ? '#F0972E' : '#484848' }} />
                {label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: '1px', background: '#191919', margin: '3px 12px 6px' }} />

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {groups.length === 0 ? (
          <p className="text-[10.5px] text-center pt-8" style={{ color: '#2E2E2E' }}>No conversations yet</p>
        ) : (
          <div className="space-y-3.5">
            {groups.map(group => (
              <div key={group.label}>
                <p className="text-[9px] font-bold uppercase px-2 mb-1"
                  style={{ color: '#303030', letterSpacing: '0.12em' }}>
                  {group.label}
                </p>
                <div className="space-y-px">
                  {group.items.map(conv => {
                    const isAct = currentId === conv.id;
                    return (
                      <Link key={conv.id} href={`/chat/${conv.id}`} onClick={close}>
                        <div
                          className="group/conv flex items-center justify-between px-2 py-[5px] rounded-md cursor-pointer transition-all"
                          style={{
                            background: isAct ? '#1C1C1C' : 'transparent',
                            borderLeft: isAct ? '2px solid #F0972E' : '2px solid transparent',
                          }}
                          onMouseEnter={e => { if (!isAct) (e.currentTarget as HTMLElement).style.background = '#161616'; }}
                          onMouseLeave={e => { if (!isAct) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <span className="text-[11px] truncate flex-1 leading-snug"
                            style={{ color: isAct ? '#D8D8D8' : '#505050' }}>
                            {conv.title || 'New Chat'}
                          </span>
                          <button
                            onClick={e => handleDelete(e, conv.id)}
                            disabled={deletingId === conv.id}
                            className="opacity-0 group-hover/conv:opacity-100 flex-shrink-0 ml-1 p-0.5 rounded"
                            style={{ color: '#404040' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#404040')}
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

      {/* User card */}
      {user && (
        <div className="px-2 pb-3 mt-2">
          <Link href="/settings" onClick={close}>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
              style={{ background: '#141414', border: '1px solid #202020' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1C1C1C'; (e.currentTarget as HTMLElement).style.borderColor = '#2A2A2A'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#141414'; (e.currentTarget as HTMLElement).style.borderColor = '#202020'; }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{ background: 'rgba(240,151,46,0.18)', color: '#F0972E', border: '1.5px solid rgba(240,151,46,0.35)' }}>
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold truncate" style={{ color: '#D0D0D0' }}>
                  {user.name || 'User'}
                </div>
                <div className="text-[9px]" style={{ color: '#F0972E', letterSpacing: '0.05em' }}>Pro Plan</div>
              </div>
              <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: '#3A3A3A' }} />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
