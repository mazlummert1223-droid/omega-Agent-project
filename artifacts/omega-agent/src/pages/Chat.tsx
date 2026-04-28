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

function GeminiStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M12 2C12 2 13 9 18 12C13 15 12 22 12 22C12 22 11 15 6 12C11 9 12 2 12 2Z" fill="url(#hGrad)"/>
      <defs>
        <linearGradient id="hGrad" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4"/>
          <stop offset="0.5" stopColor="#9B72CB"/>
          <stop offset="1" stopColor="#D96570"/>
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

  const { data: conversation, isLoading, isError, refetch } = useGetOpenaiConversation(convId, {
    query: { retry: 3, retryDelay: 600 },
  });
  const { sendMessage, isStreaming, currentStreamedText, multiTaskEvents, stopStream } = useChatStream(convId);

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
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <button onClick={toggle} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <GeminiStar />
        <span className="font-semibold text-sm gemini-gradient">
          {conversation.title || 'Sohbet'}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full py-6 flex flex-col">

          {allMessages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-60 text-center px-4 animate-fade-up">
              <div className="w-16 h-16 mb-5 opacity-50">
                <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
                  <path d="M28 4C28 4 31 22 44 28C31 34 28 52 28 52C28 52 25 34 12 28C25 22 28 4 28 4Z" fill="url(#emptyGrad)"/>
                  <defs>
                    <linearGradient id="emptyGrad" x1="12" y1="4" x2="44" y2="52" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#4285F4"/>
                      <stop offset="0.5" stopColor="#9B72CB"/>
                      <stop offset="1" stopColor="#D96570"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-1">Sohbet Hazır</h2>
              <p className="text-muted-foreground text-sm max-w-xs">
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
          {multiTaskEvents.length > 0 && (
            <MultiTaskProgress events={multiTaskEvents} />
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
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-primary/20 flex items-center justify-center">
                <GeminiStar />
              </div>
              <div className="flex items-center gap-1.5 pt-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
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
