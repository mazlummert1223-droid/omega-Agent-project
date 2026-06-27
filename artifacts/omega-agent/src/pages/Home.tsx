import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Menu, Search, BarChart2, PenLine, Zap, Paperclip, Globe, Image as ImageIcon, Hash, ArrowUp } from 'lucide-react';
import { useSidebar } from '@/App';
import { useLocalConversations } from '@/hooks/use-chat';

/* ─── Big glowing Omega hero ─── */
function OmegaHero() {
  return (
    <div className="relative flex flex-col items-center mb-10 select-none" style={{ paddingTop: 8 }}>

      {/* Wide ambient radial glow layer */}
      <div className="absolute pointer-events-none animate-omega-pulse"
        style={{
          width: 420, height: 260, top: '18%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(240,151,46,0.32) 0%, rgba(200,100,20,0.10) 60%, transparent 100%)',
          filter: 'blur(32px)',
        }}
      />
      {/* Inner tight glow */}
      <div className="absolute pointer-events-none"
        style={{
          width: 200, height: 130, top: '14%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(255,210,120,0.30) 0%, transparent 70%)',
          filter: 'blur(18px)',
        }}
      />

      {/* The Omega SVG — large, stroke-based */}
      <div className="relative z-10 mb-7"
        style={{
          filter: 'drop-shadow(0 0 28px rgba(240,151,46,0.75)) drop-shadow(0 0 70px rgba(200,100,20,0.35))',
        }}>
        <svg width="140" height="148" viewBox="0 0 40 42" fill="none">
          <defs>
            <linearGradient id="heroOmegaGrad" x1="4" y1="2" x2="36" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#FFE08A" />
              <stop offset="38%"  stopColor="#F5A030" />
              <stop offset="100%" stopColor="#BE6010" />
            </linearGradient>
          </defs>
          {/* Outer glow ring */}
          <path
            d="M 9,34 L 9,27 A 11,11 0 1 1 31,27 L 31,34"
            fill="none"
            stroke="rgba(255,210,100,0.18)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* Main arc */}
          <path
            d="M 9,34 L 9,27 A 11,11 0 1 1 31,27 L 31,34"
            fill="none"
            stroke="url(#heroOmegaGrad)"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          {/* Left foot */}
          <path d="M 4,39 L 15,39" fill="none" stroke="url(#heroOmegaGrad)" strokeWidth="4" strokeLinecap="round" />
          {/* Right foot */}
          <path d="M 25,39 L 36,39" fill="none" stroke="url(#heroOmegaGrad)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>

      {/* Text */}
      <h1 className="font-display font-bold"
        style={{ color: '#EFEFEF', letterSpacing: '0.20em', fontSize: '2.05rem', lineHeight: 1 }}>
        OMEGA
      </h1>
      <p className="mt-2 font-semibold"
        style={{ color: '#525252', letterSpacing: '0.30em', fontSize: '10px' }}>
        AI AGENT
      </p>
      <p className="mt-4 text-[14px]" style={{ color: '#5A5A5A' }}>
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

  const submit = (mode = 'auto') => {
    if (!text.trim()) return;
    onSend(text.trim(), mode);
    setText('');
  };

  return (
    <div className="w-full rounded-2xl transition-all duration-200 input-glow"
      style={{ background: '#111', border: '1px solid #1E1E1E', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
      <textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
        placeholder="How can Omega help you today?"
        rows={1}
        className="w-full bg-transparent text-[14px] leading-relaxed resize-none outline-none px-5 pt-4 pb-3 max-h-[120px]"
        style={{ color: '#C8C8C8', caretColor: '#F0972E' }}
        autoFocus
      />
      <div className="flex items-center justify-between px-4 pb-3.5 gap-2">
        <div className="flex items-center gap-1.5">
          {[
            { icon: <Paperclip className="w-4 h-4" />, label: 'Attach' },
            { icon: <Globe     className="w-4 h-4" />, label: 'Web search', onClick: () => submit('researcher') },
            { icon: <ImageIcon className="w-4 h-4" />, label: 'Image' },
            { icon: <Hash      className="w-4 h-4" />, label: 'More' },
          ].map((btn, i) => (
            <button key={i} title={btn.label} onClick={btn.onClick}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ color: '#484848', border: '1px solid #1E1E1E', background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget.style.color = '#B8B8B8'); (e.currentTarget.style.background = '#1C1C1C'); (e.currentTarget.style.borderColor = '#2A2A2A'); }}
              onMouseLeave={e => { (e.currentTarget.style.color = '#484848'); (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.borderColor = '#1E1E1E'); }}
            >
              {btn.icon}
            </button>
          ))}
        </div>
        <button onClick={() => submit()}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
          style={text.trim()
            ? { background: '#F0972E', border: '1px solid transparent', boxShadow: '0 2px 12px rgba(240,151,46,0.35)' }
            : { background: '#181818', border: '1px solid #252525', cursor: 'not-allowed' }
          }
        >
          <ArrowUp className="w-4 h-4" style={{ color: text.trim() ? '#0A0A0A' : '#383838' }} />
        </button>
      </div>
    </div>
  );
}

/* ─── Action cards ─── */
const CARDS = [
  { Icon: Search,    label: 'Research',  desc: 'In-depth research\non any topic',    prompt: 'Research the latest AI trends in 2025', mode: 'researcher' },
  { Icon: BarChart2, label: 'Analyze',   desc: 'Analyze data and\nderive insights',  prompt: 'Help me analyze this dataset',           mode: 'coder' },
  { Icon: PenLine,   label: 'Create',    desc: 'Generate content\nand visuals',      prompt: 'Write a creative piece for me',          mode: 'auto' },
  { Icon: Zap,       label: 'Automate',  desc: 'Automate tasks\nand workflows',      prompt: 'Help me automate a complex workflow',    mode: 'quantum' },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { toggle } = useSidebar();
  const { create } = useLocalConversations();

  const start = (prompt: string, mode = 'auto') => {
    const conv = create(prompt.slice(0, 50));
    sessionStorage.setItem(`chat_${conv.id}_init`, JSON.stringify({ prompt, mode }));
    setLocation(`/chat/${conv.id}`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0B0B0B' }}>
      {/* Mobile header */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #191919' }}>
        <button onClick={toggle} className="p-1.5 rounded-lg" style={{ color: '#555' }}>
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Centered content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[600px] flex flex-col items-center animate-fade-up">

          <OmegaHero />

          {/* Prompt bar */}
          <div className="w-full mb-5">
            <HomePromptBar onSend={start} />
          </div>

          {/* Action cards */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CARDS.map((card, i) => {
              const [hov, setHov] = useState(false);
              const Icon = card.Icon;
              return (
                <button key={i}
                  onClick={() => start(card.prompt, card.mode)}
                  onMouseEnter={() => setHov(true)}
                  onMouseLeave={() => setHov(false)}
                  className="flex flex-col gap-3 p-4 rounded-2xl text-left transition-all duration-200"
                  style={{
                    background: hov ? '#181818' : '#111',
                    border: `1px solid ${hov ? '#272727' : '#1C1C1C'}`,
                    transform: hov ? 'translateY(-2px)' : 'none',
                    boxShadow: hov ? '0 8px 30px rgba(0,0,0,0.6)' : 'none',
                  }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                    style={{
                      background: hov ? 'rgba(240,151,46,0.14)' : '#1A1A1A',
                      border: `1px solid ${hov ? 'rgba(240,151,46,0.28)' : '#242424'}`,
                    }}>
                    <Icon className="w-[17px] h-[17px]" style={{ color: hov ? '#F0972E' : '#484848' }} />
                  </div>
                  <div>
                    <div className="text-[12.5px] font-semibold mb-0.5"
                      style={{ color: hov ? '#E0E0E0' : '#777' }}>{card.label}</div>
                    <div className="text-[11.5px] leading-relaxed whitespace-pre-line"
                      style={{ color: hov ? '#555' : '#333' }}>{card.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
