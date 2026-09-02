import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'wouter';
import { useChatStream, useLocalConversation } from '@/hooks/use-chat';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatInput } from '@/components/ChatInput';
import { MultiTaskProgress } from '@/components/MultiTaskProgress';
import { VideoGenerator } from '@/components/VideoGenerator';
import { useSidebar } from '@/App';
import { OmegaMark } from '@/components/Sidebar';
import { Loader2, Menu } from 'lucide-react';

export default function ChatPage() {
  const { id } = useParams();
  const convId = id || null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toggle } = useSidebar();
  const [videoPrompt, setVideoPrompt] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ prompt: string; style: string } | null>(null);

  const { data: conversation, loading } = useLocalConversation(convId);
  const { sendMessage, isStreaming, currentStreamedText, multiTaskEvents, synthesisText, stopStream } = useChatStream(convId);

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
      await sendMessage(prompt, 'auto');
    } finally {
      setPendingImage(null);
    }
  };

  useEffect(() => {
    if (!convId) return;
    const key = `chat_${convId}_init`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      sessionStorage.removeItem(key);
      try {
        const { prompt, mode } = JSON.parse(stored);
        if (prompt) setTimeout(() => sendMessage(prompt, mode), 300);
        if (JSON.parse(stored).openFile) {
          setTimeout(() => window.dispatchEvent(new Event('omega-open-files')), 300);
        }
      } catch {}
    }
  }, [convId]);

  /* Listen for video-open events fired by VideoTrigger buttons in messages */
  useEffect(() => {
    const handler = (e: Event) => {
      const prompt = (e as CustomEvent<string>).detail;
      if (prompt) setVideoPrompt(prompt);
    };
    window.addEventListener('omega-open-video', handler);
    return () => window.removeEventListener('omega-open-video', handler);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [conversation?.messages, currentStreamedText, multiTaskEvents]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#F0972E' }} />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center px-4" style={{ background: '#0A0A0A' }}>
        <div className="p-8 flex flex-col items-center gap-3 text-center max-w-sm rounded-2xl"
          style={{ background: '#111', border: '1px solid #1E1E1E' }}>
          <h2 className="font-semibold text-base" style={{ color: '#E0E0E0' }}>Sohbet Bulunamadı</h2>
          <a href="/" className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{ background: '#F0972E', color: '#0A0A0A' }}>
            Ana Sayfa
          </a>
        </div>
      </div>
    );
  }

  const allMessages = (conversation.messages || []).map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    createdAt: m.createdAt,
  }));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: '#0A0A0A' }}>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid #181818', background: '#0C0C0C' }}
      >
        {/* Mobile menu */}
        <button onClick={toggle} className="md:hidden p-1.5 rounded-lg" style={{ color: '#555' }}>
          <Menu className="w-5 h-5" />
        </button>

        <OmegaMark size={22} />

        <span
          className="flex-1 text-[13px] font-medium truncate"
          style={{ color: '#888' }}
        >
          {conversation.title || 'New Chat'}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full py-6 flex flex-col">

          {allMessages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-60 text-center px-4 animate-fade-up">
              <div className="mb-5 opacity-30">
                <OmegaMark size={48} />
              </div>
              <h2 className="text-lg font-display font-semibold mb-1.5" style={{ color: '#888' }}>Ready</h2>
              <p className="text-[13px] max-w-xs leading-relaxed" style={{ color: '#444' }}>
                Type a message below or use the Globe button for web research.
              </p>
            </div>
          ) : (
            allMessages.map(msg => (
              <MessageBubble key={msg.id} role={msg.role} content={msg.content} createdAt={msg.createdAt} />
            ))
          )}

          {(multiTaskEvents.length > 0 || synthesisText) && (
            <MultiTaskProgress events={multiTaskEvents} synthesisText={synthesisText} />
          )}

          {pendingImage && (
            <>
              <MessageBubble role="user" content={pendingImage.prompt} />
              <div className="flex gap-3 px-4 md:px-10 py-4 animate-fade-up">
                <div className="flex-shrink-0 mt-0.5">
                  <OmegaMark size={28} />
                </div>
                <div className="flex-1 max-w-xs pt-0.5">
                  <div className="text-[13px] font-semibold font-display mb-2.5" style={{ color: '#F0972E' }}>Omega</div>
                  <div className="relative rounded-xl overflow-hidden shimmer"
                    style={{ aspectRatio: '1/1', maxWidth: '280px', background: '#111', border: '1px solid #222' }}>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'rgba(240,151,46,0.5)' }} />
                      <p className="text-[12px] text-center px-4" style={{ color: '#555' }}>
                        Generating image…
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {isStreaming && currentStreamedText && (
            <MessageBubble role="assistant" content={currentStreamedText} isStreaming={true} />
          )}

          {isStreaming && !currentStreamedText && multiTaskEvents.length === 0 && (
            <div className="flex gap-3 px-4 md:px-10 py-4 animate-fade-up">
              <div className="flex-shrink-0 mt-0.5">
                <OmegaMark size={28} />
              </div>
              <div className="flex items-center gap-1.5 pt-2">
                <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(240,151,46,0.6)' }} />
                <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(240,151,46,0.6)' }} />
                <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(240,151,46,0.6)' }} />
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>

      {/* Input */}
      <div style={{ background: 'linear-gradient(to top, #0A0A0A 80%, transparent)' }} className="pt-4">
        <ChatInput
          onSend={sendMessage}
          isStreaming={isStreaming}
          onStop={stopStream}
          onVideoGenerate={(prompt) => setVideoPrompt(prompt)}
          onImageGenerate={handleImageGenerate}
          isGeneratingImage={pendingImage !== null}
        />
      </div>

      {videoPrompt !== null && (
        <VideoGenerator prompt={videoPrompt} onClose={() => setVideoPrompt(null)} />
      )}
    </div>
  );
}
