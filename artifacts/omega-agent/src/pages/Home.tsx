import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Menu, Search, BarChart2, PenLine, Zap, Paperclip, Globe, Image as ImageIcon, Hash, Send } from 'lucide-react';
import { useSidebar } from '@/App';
import { OmegaLogo } from '@/components/Sidebar';
import { useLocalConversations } from '@/hooks/use-chat';

/* ─── Quick action cards ─── */
const CARDS = [
  { icon: Search,   label: 'Research',  desc: 'In-depth research\non any topic',         mode: 'researcher', color: '#D4893A' },
  { icon: BarChart2,label: 'Analyze',   desc: 'Analyze data and\nderive insights',        mode: 'coder',      color: '#D4893A' },
  { icon: PenLine,  label: 'Create',    desc: 'Generate content\nand visuals',            mode: 'auto',       color: '#D4893A' },
  { icon: Zap,      label: 'Automate',  desc: 'Automate tasks\nand workflows',            mode: 'quantum',    color: '#D4893A' },
];

/* ─── Big glowing Omega hero ─── */
function OmegaHero() {
  return (
    <div className="relative flex flex-col items-center mb-10 select-none">
      {/* Ambient glow layers */}
      <div
        className="absolute rounded-full animate-omega-pulse pointer-events-none"
        style={{
          width: 320, height: 200, top: '30%',
          background: 'radial-gradient(ellipse, rgba(212,137,58,0.35) 0%, transparent 70%)',
          filter: 'blur(28px)',
          transform: 'translateY(-50%)',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 180, height: 100, top: '20%',
          background: 'radial-gradient(ellipse, rgba(232,168,74,0.22) 0%, transparent 70%)',
          filter: 'blur(16px)',
          transform: 'translateY(-50%)',
        }}
      />

      {/* The Ω SVG — large, glowing */}
      <div className="relative z-10 mb-5" style={{ filter: 'drop-shadow(0 0 24px rgba(212,137,58,0.7)) drop-shadow(0 0 60px rgba(212,137,58,0.3))' }}>
        <svg width="130" height="130" viewBox="0 0 100 100" fill="none">
          {/* Outer ring */}
          <circle cx="50" cy="45" r="36" stroke="url(#heroGold)" strokeWidth="6" fill="none" strokeOpacity="0.25" />
          {/* Ω body */}
          <path
            d="M50 14C34.536 14 22 26.536 22 42c0 8.4 3.696 15.96 9.576 21.16L22 72H42.64a22.872 22.872 0 0 0 7.36 1.2A22.872 22.872 0 0 0 57.36 72H78L68.424 63.16C74.304 57.96 78 50.4 78 42 78 26.536 65.464 14 50 14z"
            fill="url(#heroGold2)"
          />
          <path
            d="M50 21C38.954 21 30 29.954 30 41c0 5.89 2.446 11.21 6.382 15.024L32 64H48.5c.492.06.99.09 1.5.09s1.008-.03 1.5-.09H68l-4.382-7.976C67.554 52.21 70 46.89 70 41 70 29.954 61.046 21 50 21z"
            fill="#0C0C0C"
          />
          <defs>
            <linearGradient id="heroGold" x1="14" y1="9" x2="86" y2="81" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#FFD280" />
              <stop offset="50%"  stopColor="#D4893A" />
              <stop offset="100%" stopColor="#9A5C18" />
            </linearGradient>
            <linearGradient id="heroGold2" x1="22" y1="14" x2="78" y2="73" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#FFD280" />
              <stop offset="50%"  stopColor="#D4893A" />
              <stop offset="100%" stopColor="#9A5C18" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Text */}
      <h1
        className="font-display font-bold tracking-[0.22em] text-[2.1rem]"
        style={{ color: '#E8E8E8', letterSpacing: '0.18em', lineHeight: 1 }}
      >
        OMEGA
      </h1>
      <p
        className="mt-1.5 text-[11px] font-semibold tracking-[0.3em]"
        style={{ color: '#888', letterSpacing: '0.25em' }}
      >
        AI AGENT
      </p>
      <p
        className="mt-4 text-[14px]"
        style={{ color: '#666' }}
      >
        Clarity. Intelligence. Results.
      </p>
    </div>
  );
}

/* ─── Home prompt bar ─── */
function HomePromptBar({ onSend }: { onSend: (text: string, mode: string) => void }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };
  const submit = () => {
    if (!text.trim()) return;
    onSend(text.trim(), 'auto');
    setText('');
  };

  return (
    <div
      className="w-full rounded-2xl transition-all input-glow"
      style={{ background: '#111', border: '1px solid #222' }}
    >
      <textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="How can Omega help you today?"
        rows={1}
        className="w-full bg-transparent text-[14px] leading-relaxed resize-none outline-none px-5 pt-4 pb-2 max-h-[120px]"
        style={{ color: '#C0C0C0', caretColor: '#D4893A' }}
      />
      <div className="flex items-center justify-between px-4 pb-3.5 pt-1">
        <div className="flex items-center gap-1.5">
          <ToolBtn icon={<Paperclip className="w-4 h-4" />} title="Attach" />
          <ToolBtn icon={<Globe     className="w-4 h-4" />} title="Web search" onClick={() => { if (text.trim()) onSend(text.trim(), 'researcher'); }} />
          <ToolBtn icon={<ImageIcon className="w-4 h-4" />} title="Image" />
          <ToolBtn icon={<Hash      className="w-4 h-4" />} title="More" />
        </div>
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
          style={text.trim()
            ? { background: '#D4893A', border: '1px solid transparent' }
            : { background: '#181818', border: '1px solid #252525', cursor: 'not-allowed' }
          }
        >
          <Send className="w-3.5 h-3.5 ml-0.5" style={{ color: text.trim() ? '#0A0A0A' : '#3A3A3A' }} />
        </button>
      </div>
    </div>
  );
}

function ToolBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
      style={{ color: '#555', border: '1px solid #222', background: 'transparent' }}
      onMouseEnter={e => { (e.currentTarget.style.color = '#AAA'); (e.currentTarget.style.background = '#1A1A1A'); }}
      onMouseLeave={e => { (e.currentTarget.style.color = '#555'); (e.currentTarget.style.background = 'transparent'); }}
    >
      {icon}
    </button>
  );
}

/* ─── Quick action card ─── */
function ActionCard({ card, onClick }: { card: typeof CARDS[0]; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const Icon = card.icon;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex flex-col gap-3 p-5 rounded-2xl text-left transition-all duration-200"
      style={{
        background: hov ? '#161616' : '#111',
        border: `1px solid ${hov ? '#2A2A2A' : '#1E1E1E'}`,
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? '0 8px 28px rgba(0,0,0,0.5)' : 'none',
      }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: hov ? 'rgba(212,137,58,0.12)' : '#1A1A1A', border: `1px solid ${hov ? 'rgba(212,137,58,0.25)' : '#252525'}` }}>
        <Icon className="w-4 h-4" style={{ color: hov ? '#D4893A' : '#555' }} />
      </div>
      <div>
        <div className="text-[13px] font-semibold mb-1" style={{ color: hov ? '#E0E0E0' : '#888' }}>{card.label}</div>
        <div className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: hov ? '#666' : '#3A3A3A' }}>{card.desc}</div>
      </div>
    </button>
  );
}

/* ─── Page ─── */
export default function Home() {
  const [, setLocation] = useLocation();
  const { toggle } = useSidebar();
  const { create } = useLocalConversations();

  const start = (prompt: string, mode = 'auto') => {
    const conv = create(prompt.slice(0, 52));
    sessionStorage.setItem(`chat_${conv.id}_init`, JSON.stringify({ prompt, mode }));
    setLocation(`/chat/${conv.id}`);
  };

  const startBlank = () => {
    const conv = create('New Chat');
    setLocation(`/chat/${conv.id}`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0A0A0A' }}>
      {/* Mobile header */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #181818' }}>
        <button onClick={toggle} className="p-1.5 rounded-lg" style={{ color: '#555' }}>
          <Menu className="w-5 h-5" />
        </button>
        <OmegaLogo size={24} />
        <span className="font-display font-bold text-[13px] tracking-widest" style={{ color: '#E0E0E0', letterSpacing: '0.12em' }}>OMEGA</span>
      </div>

      {/* Centered content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-[580px] flex flex-col items-center animate-fade-up">

          <OmegaHero />

          {/* Prompt bar */}
          <div className="w-full mb-6">
            <HomePromptBar onSend={start} />
          </div>

          {/* Action cards */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CARDS.map((card, i) => (
              <ActionCard
                key={i}
                card={card}
                onClick={() => start(
                  card.mode === 'researcher' ? 'Yapay zeka trendlerini araştır' :
                  card.mode === 'coder'      ? 'Veri analiz scripti yaz' :
                  card.mode === 'quantum'    ? 'Karmaşık bir problemi çöz' :
                  'Yaratıcı bir içerik oluştur',
                  card.mode
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
