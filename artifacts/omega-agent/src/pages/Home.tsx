import React from 'react';
import { useCreateOpenaiConversation } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { Menu, ArrowRight, Globe, Code2, Paintbrush, Layers, Image as ImageIcon, Film } from 'lucide-react';
import { useSidebar } from '@/App';

function OmegaLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none">
      {/* Outer ring */}
      <circle cx="40" cy="36" r="26" stroke="url(#hGrad)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="8 4" opacity="0.3"/>
      {/* Main omega body */}
      <circle cx="40" cy="34" r="20" stroke="url(#hGrad)" strokeWidth="3"/>
      {/* Omega feet */}
      <path d="M26 56c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="url(#hGrad)" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M20 56h40M29 56v4M51 56v4" stroke="url(#hGrad)" strokeWidth="3" strokeLinecap="round"/>
      <defs>
        <linearGradient id="hGrad" x1="14" y1="10" x2="66" y2="74" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4FF"/>
          <stop offset="0.5" stopColor="#7dd3fc"/>
          <stop offset="1" stopColor="#F5A623"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

const CAPABILITIES = [
  { icon: <Globe className="w-4 h-4" />, label: 'Araştırma', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  { icon: <Code2 className="w-4 h-4" />, label: 'Kod Yazma', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { icon: <Paintbrush className="w-4 h-4" />, label: 'Tasarım', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
  { icon: <ImageIcon className="w-4 h-4" />, label: 'Görsel Üretim', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { icon: <Layers className="w-4 h-4" />, label: 'Çok-Ajan', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { icon: <Film className="w-4 h-4" />, label: 'Video Üretim', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
];

const SUGGESTIONS = [
  {
    title: "Web'den araştır",
    prompt: "Yapay zekanın 2026'daki son gelişmelerini ve trendlerini araştır",
    mode: "researcher",
    accent: "from-sky-500/10 to-sky-500/5 border-sky-500/20 hover:border-sky-500/40",
    icon: "🌐",
  },
  {
    title: "Kod yaz",
    prompt: "React ile gerçek zamanlı chat uygulaması yaz",
    mode: "coder",
    accent: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40",
    icon: "💻",
  },
  {
    title: "Tasarım yap",
    prompt: "Modern ve minimalist bir SaaS landing page tasarla",
    mode: "designer",
    accent: "from-pink-500/10 to-pink-500/5 border-pink-500/20 hover:border-pink-500/40",
    icon: "🎨",
  },
  {
    title: "Çok-ajan sistemi",
    prompt: "E-ticaret platformu için kapsamlı bir teknik ve ürün stratejisi geliştir",
    mode: "multi",
    accent: "from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40",
    icon: "🤖",
  },
  {
    title: "Veri analizi",
    prompt: "Python ile pandas kullanarak satış verisi analizi ve görselleştirme kodu yaz",
    mode: "coder",
    accent: "from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:border-purple-500/40",
    icon: "📊",
  },
  {
    title: "Görsel üret",
    prompt: "Cyberpunk Tokyo gecesi, neon ışıkları, yağmur",
    mode: "auto",
    accent: "from-rose-500/10 to-rose-500/5 border-rose-500/20 hover:border-rose-500/40",
    icon: "🌃",
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { toggle } = useSidebar();
  const createMutation = useCreateOpenaiConversation();

  const handleStart = (prompt?: string, _mode?: string) => {
    createMutation.mutate(
      { data: { title: prompt ? prompt.slice(0, 50) : "Yeni Sohbet" } },
      {
        onSuccess: (data) => {
          if (prompt) {
            sessionStorage.setItem(`chat_${data.id}_init`, JSON.stringify({ prompt, mode: _mode || 'auto' }));
          }
          setLocation(`/chat/${data.id}`);
        },
        onError: () => {
          alert('Sohbet başlatılamadı. Lütfen tekrar deneyin.');
        }
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile header */}
      <div className="md:hidden flex items-center px-4 py-3 border-b border-border/30">
        <button onClick={toggle} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <span className="ml-3 font-display font-bold omega-gradient text-lg">Omega AI</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start px-4 py-10 md:py-16">
        <div className="max-w-2xl w-full flex flex-col items-center">

          {/* Logo + Brand */}
          <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
            <OmegaLogo className="w-20 h-20 md:w-24 md:h-24 drop-shadow-2xl" />
          </div>

          <div className="mt-6 text-center animate-fade-up" style={{ animationDelay: '80ms' }}>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
              <span className="omega-gradient">Merhaba!</span>
            </h1>
            <p className="mt-3 text-xl md:text-2xl font-display text-foreground/50 font-medium">
              Sana nasıl yardım edebilirim?
            </p>
          </div>

          {/* Capability pills */}
          <div
            className="flex flex-wrap justify-center gap-2 mt-7 animate-fade-up"
            style={{ animationDelay: '140ms' }}
          >
            {CAPABILITIES.map((cap, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${cap.bg} ${cap.color}`}
              >
                {cap.icon}
                {cap.label}
              </div>
            ))}
          </div>

          {/* Suggestion cards */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-9 animate-fade-up"
            style={{ animationDelay: '200ms' }}
          >
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleStart(s.prompt, s.mode)}
                disabled={createMutation.isPending}
                className={`relative flex items-start gap-3 px-4 py-4 rounded-2xl bg-gradient-to-br border text-left transition-all duration-200 group hover:shadow-lg hover:shadow-black/20 ${s.accent}`}
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1">{s.title}</div>
                  <div className="text-sm text-foreground/80 leading-snug">{s.prompt}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/70 flex-shrink-0 mt-0.5 transition-colors translate-x-0 group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => handleStart()}
            disabled={createMutation.isPending}
            className="mt-8 px-8 py-3 rounded-full font-semibold text-sm border border-border/60 text-foreground/60 hover:text-white hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 animate-fade-up"
            style={{ animationDelay: '260ms' }}
          >
            {createMutation.isPending ? 'Açılıyor...' : 'Boş sohbet başlat'}
          </button>
        </div>
      </div>
    </div>
  );
}
