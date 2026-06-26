import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'wouter';
import { useGetOpenaiConversation } from '@workspace/api-client-react';
import { useChatStream } from '@/hooks/use-chat';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatInput } from '@/components/ChatInput';
import { MultiTaskProgress } from '@/components/MultiTaskProgress';
import { VideoGenerator } from '@/components/VideoGenerator';
import { useSidebar } from '@/App';
import { Loader2, AlertCircle, Menu, Image as ImageIcon } from 'lucide-react';

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
      <div
        className="md:hidden flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid hsl(0 0% 12%)', background: 'hsl(0 0% 5%)' }}
      >
        <button
          onClick={toggle}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <OmegaAvatar />
        <span className="font-semibold text-[14px] font-display" style={{ color: 'hsl(195 100% 45%)' }}>
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
              <MessageBubble role="user" content={pendingImage.prompt} />
              <div className="flex gap-3 px-4 md:px-10 py-4 animate-fade-up">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                  style={{ background: 'hsl(195 100% 45% / 0.08)', border: '1px solid hsl(195 100% 45% / 0.18)' }}
                >
                  <OmegaAvatar />
                </div>
                <div className="flex-1 max-w-xs pt-0.5">
                  <div className="text-[13px] font-semibold font-display mb-2.5" style={{ color: 'hsl(195 100% 45%)' }}>Omega</div>
                  <div
                    className="relative rounded-xl overflow-hidden shimmer"
                    style={{
                      aspectRatio: '1/1',
                      maxWidth: '280px',
                      background: 'hsl(0 0% 9%)',
                      border: '1px solid hsl(0 0% 16%)',
                    }}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'hsl(195 100% 45% / 0.5)' }} />
                      <p className="text-[12px] text-center px-4" style={{ color: 'hsl(0 0% 40%)' }}>
                        Görsel üretiliyor…<br/>
                        <span style={{ color: 'hsl(0 0% 30%)' }}>{pendingImage.style !== 'default' ? pendingImage.style : ''}</span>
                      </p>
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
            <div className="flex gap-3 px-4 md:px-10 py-4 animate-fade-up">
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                style={{ background: 'hsl(195 100% 45% / 0.08)', border: '1px solid hsl(195 100% 45% / 0.18)' }}
              >
                <OmegaAvatar />
              </div>
              <div className="flex items-center gap-1.5 pt-2">
                <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(195 100% 45% / 0.6)' }} />
                <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(195 100% 45% / 0.6)' }} />
                <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(195 100% 45% / 0.6)' }} />
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
