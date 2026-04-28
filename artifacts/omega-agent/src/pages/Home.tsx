import React from 'react';
import { useCreateOpenaiConversation } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { Menu } from 'lucide-react';
import { useSidebar } from '@/App';

// Gemini star SVG
function GeminiStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 56 56" fill="none">
      <path d="M28 4C28 4 31 22 44 28C31 34 28 52 28 52C28 52 25 34 12 28C25 22 28 4 28 4Z" fill="url(#g1)"/>
      <defs>
        <linearGradient id="g1" x1="12" y1="4" x2="44" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4"/>
          <stop offset="0.4" stopColor="#9B72CB"/>
          <stop offset="0.8" stopColor="#D96570"/>
          <stop offset="1" stopColor="#F4A261"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

const SUGGESTIONS = [
  { icon: "🌐", text: "Web'den güncel bilgiyle araştırma yap", mode: "researcher" },
  { icon: "💻", text: "React ile todo app yaz", mode: "coder" },
  { icon: "🎨", text: "Modern bir landing page tasarla", mode: "designer" },
  { icon: "🤖", text: "Çok-ajan sistemi ile karmaşık görev çöz", mode: "multi" },
  { icon: "📊", text: "Python ile veri analizi kodu yaz", mode: "coder" },
  { icon: "🔍", text: "Yapay zeka 2026'daki son gelişmeleri araştır", mode: "researcher" },
  { icon: "🦄", text: "Pony stili sevimli bir at çiz", mode: "designer" },
  { icon: "🌃", text: "Cyberpunk şehir manzarası üret", mode: "designer" },
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
        onError: (err) => {
          console.error('[Home/NewChat]', err);
          alert('Sohbet başlatılamadı. Lütfen tekrar deneyin.');
        }
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile header */}
      <div className="md:hidden flex items-center px-4 py-3 border-b border-border/50">
        <button onClick={toggle} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <span className="ml-3 font-display font-bold gemini-gradient text-lg">Omega AI</span>
      </div>

      <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full flex flex-col items-center text-center">
          {/* Gemini Star Logo */}
          <div className="mb-6 animate-fade-up" style={{ animationDelay: '0ms' }}>
            <GeminiStar className="w-20 h-20 md:w-24 md:h-24 drop-shadow-2xl" />
          </div>

          {/* Title */}
          <h1
            className="text-4xl md:text-5xl font-display font-bold mb-3 animate-fade-up"
            style={{ animationDelay: '80ms' }}
          >
            <span className="gemini-gradient">Merhaba!</span>
          </h1>
          <p
            className="text-2xl md:text-3xl font-display text-foreground/60 mb-2 animate-fade-up"
            style={{ animationDelay: '130ms' }}
          >
            Sana nasıl yardım edebilirim?
          </p>
          <p
            className="text-sm text-muted-foreground mb-10 animate-fade-up"
            style={{ animationDelay: '180ms' }}
          >
            Araştırma · Kod · Tasarım · Görsel Üretim · Çok-Ajan Sistemi
          </p>

          {/* Suggestion chips */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-10 animate-fade-up"
            style={{ animationDelay: '230ms' }}
          >
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleStart(s.text, s.mode)}
                disabled={createMutation.isPending}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-secondary/60 hover:bg-secondary border border-border/60 hover:border-primary/30 text-left text-sm text-foreground/80 hover:text-white transition-all duration-200 group"
              >
                <span className="text-xl flex-shrink-0">{s.icon}</span>
                <span className="flex-1 leading-snug">{s.text}</span>
              </button>
            ))}
          </div>

          {/* Start button */}
          <button
            onClick={() => handleStart()}
            disabled={createMutation.isPending}
            className="px-8 py-3.5 rounded-full font-semibold text-sm bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200 animate-fade-up"
            style={{ animationDelay: '280ms' }}
          >
            {createMutation.isPending ? 'Açılıyor...' : 'Sohbeti Başlat →'}
          </button>
        </div>
      </div>
    </div>
  );
}
