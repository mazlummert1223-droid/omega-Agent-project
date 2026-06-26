import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'wouter';
import { useGetOpenaiConversation } from '@workspace/api-client-react';
import { useChatStream } from '@/hooks/use-chat';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatInput } from '@/components/ChatInput';
import { MultiTaskProgress } from '@/components/MultiTaskProgress';
import { VideoGenerator } from '@/components/VideoGenerator';
import { useSidebar } from '@/App';
import { Loader2, AlertCircle, Menu } from 'lucide-react';

function OmegaAvatar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      <circle cx="12" cy="10" r="6" stroke="url(#avGrad)" strokeWidth="1.8"/>
      <path d="M8 17c0-2.209 1.791-4 4-4s4 1.791 4 4" stroke="url(#avGrad)" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M6 17h12M9.5 17v2M14.5 17v2" stroke="url(#avGrad)" strokeWidth="1.6" strokeLinecap="round"/>
      <defs>
        <linearGradient id="avGrad" x1="6" y1="4" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4FF"/>
          <stop offset="1" stopColor="#F5A623"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function ChatPage() {
  const { id } = useParams();
  const convId = parseInt(id || '0', 10);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toggle } = useSidebar();
  const [videoPrompt, setVideoPrompt] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ prompt: string; style: string } | null>(null);

  const { data: conversation, isLoading, isError, refetch } = useGetOpenaiConversation(convId, {
    query: { retry: 3, retryDelay: 600 },
  });
  const { sendMessage, isStreaming, currentStreamedText, multiTaskEvents, synthesisText, stopStream } = useChatStream(convId);

  // Resim üretme handler - önce yer tutucu göster, sonra üret
  const handleImageGenerate = async (prompt: string, style: string) => {
    setPendingImage({ prompt, style });
    try {
      const response = await fetch('/api/openai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style }),
      });
      const data = await response.json();
      if (data.url) {
        await sendMessage(prompt, 'auto', data.url);
      } else {
        throw new Error('no url');
      }
    } catch {
      // Hata - sadece düz mesaj gönder
      await sendMessage(prompt, 'auto');
    } finally {
      setPendingImage(null);
    }
  };

  // Check for initial prompt from Home page suggestion click
  useEffect(() => {
    const key = `chat_${convId}_init`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      sessionStorage.removeItem(key);
      try {
        const { prompt, mode } = JSON.parse(stored);
        if (prompt) {
          setTimeout(() => sendMessage(prompt, mode), 300);
        }
      } catch {}
    }
  }, [convId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [conversation?.messages, currentStreamedText, multiTaskEvents]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    );
  }

  if (isError || !conversation) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-3 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <h2 className="font-semibold text-lg">Sohbet Yüklenemedi</h2>
          <p className="text-muted-foreground text-sm">Bağlantı sorunu olabilir. Tekrar deneyebilir veya ana sayfaya dönebilirsin.</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-full bg-primary hover:bg-primary/90 text-white text-sm font-medium"
            >
              Tekrar Dene
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium"
            >
              Ana Sayfa
            </a>
          </div>
        </div>
      </div>
    );
  }

  const allMessages = (conversation.messages || []).map(m => ({
    id: String(m.id),
    role: m.role as 'user' | 'assistant',
    content: m.content,
    createdAt: m.createdAt,
  }));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <button onClick={toggle} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <OmegaAvatar />
        <span className="font-semibold text-sm omega-gradient font-display">
          {conversation.title || 'Sohbet'}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full py-6 flex flex-col">

          {allMessages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-60 text-center px-4 animate-fade-up">
              <div className="w-14 h-14 mb-5 opacity-40">
                <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
                  <circle cx="28" cy="24" r="16" stroke="url(#emptyGrad)" strokeWidth="3"/>
                  <path d="M18 42c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="url(#emptyGrad)" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M12 42h32M20 42v4M36 42v4" stroke="url(#emptyGrad)" strokeWidth="2.5" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="emptyGrad" x1="12" y1="8" x2="44" y2="52" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#00D4FF"/>
                      <stop offset="1" stopColor="#F5A623"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2 className="text-xl font-display font-semibold mb-1.5">Sohbet Hazır</h2>
              <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                Aşağıya bir şey yaz veya sesli komut ver. Her türlü soru ve görev için buradayım.
              </p>
            </div>
          ) : (
            allMessages.map(msg => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                createdAt={msg.createdAt}
              />
            ))
          )}

          {/* Multi-task streaming */}
          {(multiTaskEvents.length > 0 || synthesisText) && (
            <MultiTaskProgress events={multiTaskEvents} synthesisText={synthesisText} />
          )}

          {/* Resim üretme yer tutucusu - kullanıcı msg + animasyonlu kart */}
          {pendingImage && (
            <>
              <MessageBubble
                role="user"
                content={pendingImage.prompt}
              />
              <div className="flex gap-3 px-4 md:px-8 py-3 animate-fade-up">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <OmegaAvatar />
                </div>
                <div className="flex-1 max-w-md">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 border border-purple-500/20">
                    {/* Animasyonlu shimmer overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    {/* Pulse circles */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-pink-500/30 animate-ping" />
                        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    {/* Bottom label */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <div className="flex items-center gap-2 text-white text-xs">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                        <span className="font-medium">Pollinations.AI ({pendingImage.style}) çiziyor…</span>
                      </div>
                      <p className="text-white/80 text-xs mt-1 line-clamp-1">{pendingImage.prompt}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Regular text stream */}
          {isStreaming && currentStreamedText && (
            <MessageBubble
              role="assistant"
              content={currentStreamedText}
              isStreaming={true}
            />
          )}

          {/* Streaming indicator when no text yet */}
          {isStreaming && !currentStreamedText && multiTaskEvents.length === 0 && (
            <div className="flex gap-3 px-4 md:px-8 py-3 animate-fade-up">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20 flex items-center justify-center">
                <OmegaAvatar />
              </div>
              <div className="flex items-center gap-1.5 pt-2.5">
                <span className="typing-dot w-2 h-2 rounded-full bg-primary/70" />
                <span className="typing-dot w-2 h-2 rounded-full bg-primary/70" />
                <span className="typing-dot w-2 h-2 rounded-full bg-primary/70" />
              </div>
            </div>
          )}

          {/* Bottom padding */}
          <div className="h-4" />
        </div>
      </div>

      {/* Input */}
      <div className="bg-gradient-to-t from-background via-background/95 to-transparent pt-6">
        <ChatInput
          onSend={sendMessage}
          isStreaming={isStreaming}
          onStop={stopStream}
          onVideoGenerate={(prompt) => setVideoPrompt(prompt)}
          onImageGenerate={handleImageGenerate}
          isGeneratingImage={pendingImage !== null}
        />
      </div>

      {/* Video Generator Modal */}
      {videoPrompt !== null && (
        <VideoGenerator
          prompt={videoPrompt}
          onClose={() => setVideoPrompt(null)}
        />
      )}
    </div>
  );
}
