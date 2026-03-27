import React, { useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { useGetOpenaiConversation } from '@workspace/api-client-react';
import { useChatStream } from '@/hooks/use-chat';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatInput } from '@/components/ChatInput';
import { MultiTaskProgress } from '@/components/MultiTaskProgress';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ChatPage() {
  const { id } = useParams();
  const convId = parseInt(id || '0', 10);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading, isError } = useGetOpenaiConversation(convId);
  const { sendMessage, isStreaming, currentStreamedText, multiTaskEvents, stopStream } = useChatStream(convId);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [conversation?.messages, currentStreamedText, multiTaskEvents]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent relative z-10">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError || !conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent relative z-10">
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-md border-destructive/30">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-display font-bold">Sohbet Bulunamadı</h2>
          <p className="text-muted-foreground text-sm">Bu sohbet silinmiş veya erişilemiyor olabilir.</p>
        </div>
      </div>
    );
  }

  const messages = conversation.messages || [];

  return (
    <div className="flex-1 flex flex-col h-screen relative z-10 overflow-hidden">
      {/* Top Gradient Overlay for subtle blending */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pt-20 pb-4 scroll-smooth">
        <div className="max-w-4xl mx-auto w-full flex flex-col">
          
          {messages.length === 0 ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-center px-4 animate-in slide-in-from-bottom-8 duration-700">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl border border-primary/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(176,38,255,0.2)]">
                <img src={`${import.meta.env.BASE_URL}images/ai-core-bg.png`} alt="Core" className="w-full h-full object-cover rounded-3xl opacity-50 mix-blend-screen" />
              </div>
              <h2 className="text-3xl font-display font-bold mb-2 text-glow">OMEGA SİSTEMİ HAZIR</h2>
              <p className="text-muted-foreground max-w-md font-mono text-sm leading-relaxed">
                Herhangi bir görev için komut verin. Araştırma yapabilir, kod yazabilir veya karmaşık görevleri ajanlara bölebilirim.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role as 'user' | 'assistant'}
                content={msg.content}
                createdAt={msg.createdAt}
                // We could infer agent mode from DB if stored, but assuming standard for now
              />
            ))
          )}

          {/* Active Multi-Task Stream */}
          {multiTaskEvents.length > 0 && (
            <MultiTaskProgress events={multiTaskEvents} />
          )}

          {/* Active Text Stream */}
          {isStreaming && currentStreamedText && (
            <MessageBubble
              role="assistant"
              content={currentStreamedText}
            />
          )}

        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-gradient-to-t from-background via-background/90 to-transparent pt-10">
        <ChatInput 
          onSend={sendMessage} 
          isStreaming={isStreaming} 
          onStop={stopStream}
        />
      </div>
    </div>
  );
}
