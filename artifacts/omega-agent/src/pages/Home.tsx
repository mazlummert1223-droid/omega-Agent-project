import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Menu, Paperclip, Globe, Image as ImageIcon, Hash, ArrowUp } from 'lucide-react';
import { useSidebar } from '@/App';
import { OmegaLogo } from '@/components/Sidebar';
import { useLocalConversations } from '@/hooks/use-chat';

/* ─── Research / Analyze / Create / Automate icons (pixel-perfect SVG) ─── */
function IconResearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
function IconAnalyze() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="m7 16 4-4 4 4 4-4"/>
    </svg>
  );
}
function IconCreate() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );
}
function IconAutomate() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  );
}

/* ─── Big glowing Omega hero — matches reference exactly ─── */
function OmegaHero() {
  return (
    <div className="relative flex flex-col items-center mb-10 select-none" style={{ paddingTop: 20 }}>

      {/* === HUGE outer atmospheric glow (the wide warm halo in the reference) === */}
      <div className="absolute pointer-events-none"
        style={{
          width: 560, height: 320, top: '22%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse 75% 55% at 50% 52%, rgba(220,130,30,0.38) 0%, rgba(180,90,10,0.18) 45%, rgba(140,60,5,0.07) 70%, transparent 100%)',
          filter: 'blur(36px)',
        }}
      />

      {/* === Wide glowing horizon arc below the Ω (distinctive in reference) === */}
      <div className="absolute pointer-events-none"
        style={{
          width: 420, height: 60, top: '55%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(240,151,46,0.22) 0%, rgba(200,110,20,0.08) 60%, transparent 100%)',
          filter: 'blur(18px)',
        }}
      />

      {/* === Inner concentrated glow around the Ω === */}
      <div className="absolute pointer-events-none"
        style={{
          width: 220, height: 160, top: '18%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(255,215,130,0.35) 0%, rgba(240,151,46,0.15) 50%, transparent 80%)',
          filter: 'blur(16px)',
        }}
      />

      {/* === Original Omega artwork — animation lives around the image, never inside it === */}
      <div className="omega-hero-stage relative z-10 mb-8">
        <OmegaLogo
          className="omega-hero-logo"
          size={168}
          style={{
            display: 'block',
            filter: 'drop-shadow(0 0 30px rgba(255,210,80,0.95)) drop-shadow(0 0 70px rgba(230,130,30,0.65)) drop-shadow(0 0 140px rgba(190,90,10,0.40))',
          }}
        />
      </div>

      {/* Text */}
      <h1 className="font-display font-bold tracking-widest"
        style={{ color: '#EFEFEF', letterSpacing: '0.22em', fontSize: '2.15rem', lineHeight: 1 }}>
        OMEGA
      </h1>
      <p className="mt-[7px] font-semibold tracking-[0.32em] text-[10px]" style={{ color: '#4A4A4A' }}>
        AI AGENT
      </p>
      <p className="mt-5 text-[14px] font-medium" style={{ color: '#505050', letterSpacing: '0.02em' }}>
        Clarity. Intelligence. Results.
      </p>
    </div>
  );
}

/* ─── Home prompt bar ─── */
function HomePromptBar({
  onSend,
  onAttach,
}: {
  onSend: (text: string, mode: string) => void;
  onAttach: () => void;
}) {
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

  const active = text.trim().length > 0;
  const addPrefix = (prefix: string) => setText(current => current.startsWith(prefix) ? current : `${prefix}${current}`);

  return (
    <div
      className="w-full rounded-2xl transition-all duration-200"
      style={{
        background: '#111114',
        border: active ? '1px solid rgba(240,151,46,0.30)' : '1px solid #1E1E22',
        boxShadow: active
          ? '0 0 0 3px rgba(240,151,46,0.06), 0 6px 40px rgba(0,0,0,0.60)'
          : '0 6px 40px rgba(0,0,0,0.50)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
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
             { icon: <Paperclip className="w-[15px] h-[15px]" />, label: 'Attach', onClick: onAttach },
             { icon: <Globe     className="w-[15px] h-[15px]" />, label: 'Web search', onClick: () => text.trim() ? submit('researcher') : (addPrefix('Web’de ara: '), ref.current?.focus()) },
             { icon: <ImageIcon className="w-[15px] h-[15px]" />, label: 'Image', onClick: () => { addPrefix('Görsel oluştur: '); ref.current?.focus(); } },
             { icon: <Hash      className="w-[15px] h-[15px]" />, label: 'More', onClick: () => { addPrefix('Omega Agent: '); ref.current?.focus(); } },
          ].map((btn, i) => (
            <button key={i} title={btn.label} onClick={btn.onClick}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ color: '#3E3E3E', background: 'transparent', border: '1px solid #202024' }}
              onMouseEnter={e => { (e.currentTarget.style.color = '#A8A8A8'); (e.currentTarget.style.background = '#1C1C20'); (e.currentTarget.style.borderColor = '#2C2C30'); }}
              onMouseLeave={e => { (e.currentTarget.style.color = '#3E3E3E'); (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.borderColor = '#202024'); }}
            >
              {btn.icon}
            </button>
          ))}
        </div>
        <button onClick={() => submit()}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
          style={active
            ? { background: 'linear-gradient(135deg,#F5C842,#F0972E)', border: '1px solid transparent', boxShadow: '0 2px 14px rgba(240,151,46,0.40)' }
            : { background: '#181820', border: '1px solid #252530', cursor: 'not-allowed' }
          }
        >
          <ArrowUp className="w-4 h-4" style={{ color: active ? '#0A0A0A' : '#363640' }} />
        </button>
      </div>
    </div>
  );
}

/* ─── Action cards ─── */
const CARDS = [
  { label: 'Research',  desc: 'In-depth research\non any topic',    prompt: 'Research the latest AI trends in 2025', mode: 'researcher' },
  { label: 'Analyze',   desc: 'Analyze data and\nderive insights',  prompt: 'Help me analyze this dataset',           mode: 'coder' },
  { label: 'Create',    desc: 'Generate content\nand visuals',      prompt: 'Write a creative piece for me',          mode: 'auto' },
  { label: 'Automate',  desc: 'Automate tasks\nand workflows',      prompt: 'Help me automate a complex workflow',    mode: 'quantum' },
];

const CARD_ICONS = [
  <IconResearch key="r" />, <IconAnalyze key="a" />, <IconCreate key="c" />,
  <svg key="z" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>,
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { toggle } = useSidebar();
  const { create } = useLocalConversations();
  const [hovered, setHovered] = useState<number | null>(null);

  const start = (prompt: string, mode = 'auto') => {
    const conv = create(prompt.slice(0, 50));
    sessionStorage.setItem(`chat_${conv.id}_init`, JSON.stringify({ prompt, mode }));
    setLocation(`/chat/${conv.id}`);
  };

  const openChatForFile = () => {
    const conv = create('Dosya analizi');
    sessionStorage.setItem(`chat_${conv.id}_init`, JSON.stringify({ openFile: true }));
    setLocation(`/chat/${conv.id}`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#090909' }}>
      {/* Mobile header */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #181818' }}>
        <button onClick={toggle} className="p-1.5 rounded-lg" style={{ color: '#555' }}>
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[600px] flex flex-col items-center" style={{ animation: 'fadeUp 0.5s ease both' }}>

          <OmegaHero />

          {/* Prompt bar */}
          <div className="w-full mb-5">
            <HomePromptBar onSend={start} onAttach={openChatForFile} />
          </div>

          {/* Action cards */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CARDS.map((card, i) => {
              const isHov = hovered === i;
              return (
                <button key={i}
                  onClick={() => start(card.prompt, card.mode)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  className="flex flex-col gap-3 p-4 rounded-2xl text-left transition-all duration-200"
                  style={{
                    background: isHov ? '#161618' : '#101012',
                    border: `1px solid ${isHov ? '#262628' : '#1A1A1C'}`,
                    transform: isHov ? 'translateY(-2px)' : 'none',
                    boxShadow: isHov ? '0 8px 30px rgba(0,0,0,0.7)' : 'none',
                  }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                    style={{
                      background: isHov ? 'rgba(240,151,46,0.13)' : '#181818',
                      border: `1px solid ${isHov ? 'rgba(240,151,46,0.26)' : '#242424'}`,
                      color: isHov ? '#F0972E' : '#424242',
                    }}>
                    {CARD_ICONS[i]}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-semibold mb-0.5"
                      style={{ color: isHov ? '#E0E0E0' : '#666' }}>{card.label}</div>
                    <div className="text-[11px] leading-relaxed whitespace-pre-line"
                      style={{ color: isHov ? '#4A4A4A' : '#2E2E2E' }}>{card.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
