import React from 'react';
import { useCreateOpenaiConversation } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { Menu, ArrowUpRight } from 'lucide-react';
import { useSidebar } from '@/App';

/* ── Omega Logo — clean SVG mark ── */
function OmegaMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* outer ring – dashed, subtle */}
      <circle cx="24" cy="21" r="16" stroke="hsl(195 100% 45% / 0.18)" strokeWidth="1.5" strokeDasharray="5 3.5" />
      {/* main Ω body */}
      <circle cx="24" cy="21" r="11" stroke="hsl(195 100% 45%)" strokeWidth="2.2" />
      {/* feet */}
      <path
        d="M14 35c0-5.523 4.477-10 10-10s10 4.477 10 10"
        stroke="hsl(195 100% 45%)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M10 35h28M17 35v3.5M31 35v3.5"
        stroke="hsl(195 100% 45%)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SUGGESTIONS = [
  {
    label: 'Araştır',
    prompt: 'Yapay zekanın 2026\'daki son gelişmelerini araştır ve özetle',
    mode: 'researcher',
  },
  {
    label: 'Kod yaz',
    prompt: 'TypeScript ile REST API tasarla, Express + Zod kullan',
    mode: 'coder',
  },
  {
    label: 'Analiz et',
    prompt: 'Python pandas ile veri analizi ve görselleştirme yap',
    mode: 'coder',
  },
  {
    label: 'Çok-ajan',
    prompt: 'Bir SaaS ürünü için teknik ve iş stratejisi geliştir',
    mode: 'multi',
  },
  {
    label: 'Tasarla',
    prompt: 'Modern bir landing page için HTML/CSS/Tailwind yaz',
    mode: 'designer',
  },
  {
    label: 'Görsel üret',
    prompt: 'Cyberpunk Tokyo manzarası, gece, neon ışıklar, yağmur',
    mode: 'auto',
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { toggle } = useSidebar();
  const createMutation = useCreateOpenaiConversation();

  const start = (prompt?: string, mode = 'auto') => {
    createMutation.mutate(
      { data: { title: prompt ? prompt.slice(0, 52) : 'Yeni Sohbet' } },
      {
        onSuccess: (data) => {
          if (prompt) {
            sessionStorage.setItem(
              `chat_${data.id}_init`,
              JSON.stringify({ prompt, mode })
            );
          }
          setLocation(`/chat/${data.id}`);
        },
        onError: () => alert('Sohbet başlatılamadı.'),
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Mobile top bar */}
      <div
        className="md:hidden flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid hsl(0 0% 12%)' }}
      >
        <button
          onClick={toggle}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-display font-semibold text-[15px] omega-gradient">Omega AI</span>
      </div>

      {/* Center content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-5 py-12 md:py-20">
        <div className="w-full max-w-[640px] flex flex-col items-center">

          {/* Logo */}
          <div className="mb-7 animate-fade-up" style={{ animationDelay: '0ms' }}>
            <OmegaMark size={52} />
          </div>

          {/* Heading */}
          <h1
            className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-center animate-fade-up"
            style={{ animationDelay: '60ms', color: 'hsl(0 0% 90%)' }}
          >
            Merhaba, nasıl yardımcı olabilirim?
          </h1>
          <p
            className="mt-3 text-[15px] text-center animate-fade-up"
            style={{ animationDelay: '100ms', color: 'hsl(0 0% 42%)' }}
          >
            Araştırma, kod, tasarım, görsel üretim ve çok-ajan sistemi
          </p>

          {/* Suggestion grid */}
          <div
            className="mt-10 w-full grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fade-up"
            style={{ animationDelay: '150ms' }}
          >
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => start(s.prompt, s.mode)}
                disabled={createMutation.isPending}
                className="group flex items-start justify-between gap-3 px-4 py-3.5 rounded-xl text-left transition-colors duration-150"
                style={{
                  background: 'hsl(0 0% 8%)',
                  border: '1px solid hsl(0 0% 14%)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'hsl(0 0% 20%)';
                  (e.currentTarget as HTMLElement).style.background = 'hsl(0 0% 10%)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'hsl(0 0% 14%)';
                  (e.currentTarget as HTMLElement).style.background = 'hsl(0 0% 8%)';
                }}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[11px] font-medium uppercase tracking-wider mb-1.5"
                    style={{ color: 'hsl(195 100% 45%)' }}
                  >
                    {s.label}
                  </div>
                  <div className="text-[13px] leading-snug" style={{ color: 'hsl(0 0% 65%)' }}>
                    {s.prompt}
                  </div>
                </div>
                <ArrowUpRight
                  className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity"
                  style={{ color: 'hsl(0 0% 60%)' }}
                />
              </button>
            ))}
          </div>

          {/* Plain start */}
          <button
            onClick={() => start()}
            disabled={createMutation.isPending}
            className="mt-6 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 animate-fade-up"
            style={{
              animationDelay: '200ms',
              background: 'transparent',
              border: '1px solid hsl(0 0% 18%)',
              color: 'hsl(0 0% 50%)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'hsl(0 0% 75%)';
              (e.currentTarget as HTMLElement).style.borderColor = 'hsl(0 0% 26%)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'hsl(0 0% 50%)';
              (e.currentTarget as HTMLElement).style.borderColor = 'hsl(0 0% 18%)';
            }}
          >
            {createMutation.isPending ? 'Açılıyor…' : 'Boş sohbet başlat'}
          </button>
        </div>
      </div>
    </div>
  );
}
