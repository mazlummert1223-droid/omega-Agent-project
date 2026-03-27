import React from 'react';
import { Sparkles, ArrowRight, Code2, Search, Paintbrush } from 'lucide-react';
import { useCreateOpenaiConversation } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const [, setLocation] = useLocation();
  const createMutation = useCreateOpenaiConversation();

  const handleStart = (initialPrompt?: string) => {
    createMutation.mutate(
      { data: { title: "Yeni Sohbet" } },
      {
        onSuccess: (data) => {
          // If we had a way to pass initial prompt via state/query, we would here.
          // For now just route to new chat.
          setLocation(`/chat/${data.id}`);
        }
      }
    );
  };

  return (
    <div className="flex-1 flex items-center justify-center relative z-10 p-6 overflow-y-auto">
      <div className="max-w-3xl w-full flex flex-col items-center text-center animate-in fade-in zoom-in duration-1000">
        
        <div className="relative mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent blur-2xl opacity-30 animate-pulse rounded-full" />
          <div className="w-24 h-24 rounded-3xl glass-panel border-primary/50 flex items-center justify-center relative shadow-[0_0_40px_rgba(176,38,255,0.4)]">
            <Sparkles className="w-10 h-10 text-primary animate-bounce" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-500 text-glow">
          OMEGA PROTOKOLÜ
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
          Yeni nesil, otonom yapay zeka asistanınız. Araştırma yapar, kod yazar, görsel tasarlar ve karmaşık hedefleri parçalara bölerek kendi kendine çözer.
        </p>

        <Button 
          size="lg" 
          onClick={() => handleStart()}
          disabled={createMutation.isPending}
          className="text-lg px-12 py-8 rounded-2xl mb-16 shadow-[0_0_30px_rgba(0,240,255,0.3)] border-accent/50"
        >
          Sistemi Başlat <ArrowRight className="ml-2 w-5 h-5" />
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/30 text-blue-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2 text-white">Derin Araştırma</h3>
            <p className="text-sm text-muted-foreground">İnterneti tarar, en güncel bilgileri sentezler ve raporlar sunar.</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4 border border-green-500/30 text-green-400">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2 text-white">Kod Jeneratörü</h3>
            <p className="text-sm text-muted-foreground">Modern framework'ler ile üretim kalitesinde kod yazar ve mimari kurar.</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-4 border border-pink-500/30 text-pink-400">
              <Paintbrush className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2 text-white">Görsel Sentez</h3>
            <p className="text-sm text-muted-foreground">Metin komutlarınızdan anında yüksek çözünürlüklü görseller üretir.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
