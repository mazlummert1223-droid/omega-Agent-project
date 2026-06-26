import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Menu, Search, Code2, BarChart2, Layers, Zap, Image, ArrowRight, Globe } from 'lucide-react';
import { useSidebar } from '@/App';
import { OmegaLogo } from '@/components/Sidebar';
import { useLocalConversations } from '@/hooks/use-chat';

const SUGGESTIONS = [
  {
    icon: Search,
    label: 'Araştır',
    title: 'Derin araştırma',
    prompt: 'Yapay zekanın 2026\'daki son gelişmelerini araştır, kaynakları ve etkileriyle özetle',
    mode: 'researcher',
    color: '#0EA5E9',
    bg: 'rgba(14,165,233,0.07)',
    border: 'rgba(14,165,233,0.16)',
  },
  {
    icon: Code2,
    label: 'Mühendis',
    title: 'Kod & teknik',
    prompt: 'TypeScript ile production-ready REST API tasarla — Express, Zod validasyon, JWT auth',
    mode: 'coder',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.07)',
    border: 'rgba(34,197,94,0.16)',
  },
  {
    icon: Zap,
    label: 'Omega Quantum',
    title: 'Derin akıl yürütme',
    prompt: 'Yapay zekanın insan zekasını geçmesinin felsefi ve teknik boyutlarını derinlemesine analiz et',
    mode: 'quantum',
    color: '#A855F7',
    bg: 'rgba(168,85,247,0.07)',
    border: 'rgba(168,85,247,0.16)',
  },
  {
    icon: Layers,
    label: 'Omega Agent',
    title: '3 ajan → 1 sentez',
    prompt: 'Bir B2B SaaS ürünü için teknik mimari, iş stratejisi ve pazar analizi yap',
    mode: 'multi',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.07)',
    border: 'rgba(245,158,11,0.16)',
  },
  {
    icon: Globe,
    label: 'Web Araştır',
    title: 'Gerçek zamanlı bilgi',
    prompt: 'Bugünün en önemli teknoloji haberleri ve gelişmelerini araştır',
    mode: 'researcher',
    color: '#14B8A6',
    bg: 'rgba(20,184,166,0.07)',
    border: 'rgba(20,184,166,0.16)',
  },
  {
    icon: Image,
    label: 'Görsel Üret',
    title: 'AI görsel',
    prompt: 'Cyberpunk Tokyo gece manzarası — neon ışıklar, yağmur, duman, gerçekçi',
    mode: 'auto',
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.07)',
    border: 'rgba(236,72,153,0.16)',
  },
];

function SuggestionCard({
  s,
  index,
  onClick,
  loading,
}: {
  s: typeof SUGGESTIONS[0];
  index: number;
  onClick: () => void;
  loading: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = s.icon;

  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="animate-fade-up text-left w-full flex flex-col gap-3 p-4 rounded-2xl transition-all duration-200 group"
      style={{
        animationDelay: `${180 + index * 55}ms`,
        background: hovered ? s.bg : '#101010',
        border: `1px solid ${hovered ? s.border : '#1E1E1E'}`,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? `0 8px 28px rgba(0,0,0,0.45)` : 'none',
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
          style={{
            background: hovered ? s.bg : '#181818',
            border: `1px solid ${hovered ? s.border : '#252525'}`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: hovered ? s.color : '#555' }} />
        </div>
        <ArrowRight
          className="w-3.5 h-3.5 transition-all duration-200"
          style={{ color: s.color, opacity: hovered ? 0.7 : 0, transform: hovered ? 'translateX(0)' : 'translateX(-4px)' }}
        />
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-1 transition-colors duration-200"
          style={{ color: hovered ? s.color : '#444', letterSpacing: '0.08em' }}>
          {s.label}
        </div>
        <div className="text-[13px] font-medium leading-snug mb-1.5 transition-colors duration-200"
          style={{ color: hovered ? '#DCDCDC' : '#7A7A7A' }}>
          {s.title}
        </div>
        <div className="text-[12px] leading-relaxed line-clamp-2 transition-colors duration-200"
          style={{ color: hovered ? '#666' : '#3A3A3A' }}>
          {s.prompt}
        </div>
      </div>
    </button>
  );
}

function HeroMark() {
  return (
    <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #00B8D9 0%, #0077A8 100%)',
          boxShadow: '0 0 0 1px rgba(0,184,217,0.2), 0 16px 48px rgba(0,163,204,0.22)',
        }}
      >
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
          <path d="M10 22 C10 12 13.5 8 18 8 C22.5 8 26 12 26 22" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <path d="M7 26 L10 26 L10 22" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M29 26 L26 26 L26 22" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </div>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { toggle } = useSidebar();
  const { create } = useLocalConversations();
  const [loading, setLoading] = useState(false);

  const start = (prompt?: string, mode = 'auto') => {
    setLoading(true);
    const conv = create(prompt ? prompt.slice(0, 52) : 'Yeni Sohbet');
    if (prompt) {
      sessionStorage.setItem(`chat_${conv.id}_init`, JSON.stringify({ prompt, mode }));
    }
    setLocation(`/chat/${conv.id}`);
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0A0A0A' }}>
      {/* Mobile header */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #181818' }}>
        <button onClick={toggle} className="p-1.5 rounded-lg transition-colors" style={{ color: '#555' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#999')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
          <Menu className="w-5 h-5" />
        </button>
        <OmegaLogo size={26} />
        <span className="font-display font-semibold text-[14px]" style={{ color: '#00A3CC' }}>Omega AI</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center px-5 py-10 md:py-16">
        <div className="w-full max-w-[680px] flex flex-col items-center">
          <HeroMark />

          <h1
            className="mt-6 text-3xl md:text-[2.6rem] font-display font-bold tracking-tight text-center animate-fade-up"
            style={{ animationDelay: '70ms', color: '#EBEBEB', lineHeight: '1.18', letterSpacing: '-0.03em' }}
          >
            Nasıl yardımcı olabilirim?
          </h1>

          <p
            className="mt-3.5 text-[15px] text-center animate-fade-up max-w-sm"
            style={{ animationDelay: '110ms', color: '#454545', lineHeight: '1.65' }}
          >
            Omega Origins · Omega Agent · Omega Quantum · LTX Video
          </p>

          {/* Capability pills */}
          <div className="mt-5 flex flex-wrap justify-center gap-1.5 animate-fade-up" style={{ animationDelay: '140ms' }}>
            {['Türkçe & İngilizce', 'PDF / Dosya', 'Görsel Üretim', 'Sesli Giriş', 'LTX Video AI', 'Omega Quantum'].map(cap => (
              <span key={cap} className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                style={{ background: '#161616', border: '1px solid #252525', color: '#555' }}>
                {cap}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div className="animate-fade-up w-full mt-8 mb-6 flex items-center gap-3" style={{ animationDelay: '155ms' }}>
            <div style={{ flex: 1, height: '1px', background: '#1C1C1C' }} />
            <span className="text-[11px] font-medium" style={{ color: '#333' }}>Hızlı başlat</span>
            <div style={{ flex: 1, height: '1px', background: '#1C1C1C' }} />
          </div>

          {/* Suggestion grid */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {SUGGESTIONS.map((s, i) => (
              <SuggestionCard
                key={i}
                s={s}
                index={i}
                onClick={() => start(s.prompt, s.mode)}
                loading={loading}
              />
            ))}
          </div>

          <button
            onClick={() => start()}
            disabled={loading}
            className="mt-7 animate-fade-up text-[13px] font-medium transition-all duration-150 px-5 py-2.5 rounded-xl"
            style={{ animationDelay: '480ms', background: 'transparent', border: '1px solid #222', color: '#3A3A3A' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#888';
              (e.currentTarget as HTMLElement).style.borderColor = '#333';
              (e.currentTarget as HTMLElement).style.background = '#141414';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = '#3A3A3A';
              (e.currentTarget as HTMLElement).style.borderColor = '#222';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {loading ? 'Açılıyor…' : 'Boş sohbet başlat'}
          </button>
        </div>
      </div>
    </div>
  );
}
