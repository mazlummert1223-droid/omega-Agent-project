import React from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { User } from 'lucide-react';

// Gemini star for AI avatar
function GeminiStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M12 2C12 2 13 9 18 12C13 15 12 22 12 22C12 22 11 15 6 12C11 9 12 2 12 2Z" fill="url(#msgGrad)"/>
      <defs>
        <linearGradient id="msgGrad" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4"/>
          <stop offset="0.5" stopColor="#9B72CB"/>
          <stop offset="1" stopColor="#D96570"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  imageUrl?: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, createdAt, imageUrl, isStreaming }: MessageBubbleProps) {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end px-4 md:px-8 py-2 animate-fade-up">
        <div className="max-w-[80%] md:max-w-[70%]">
          <div className="bg-primary/15 border border-primary/20 rounded-3xl rounded-tr-md px-5 py-3.5 text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-4 md:px-8 py-3 animate-fade-up">
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-primary/20 flex items-center justify-center mt-0.5">
        <GeminiStar />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-semibold gemini-gradient">Omega</span>
          {isStreaming && (
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>

        {/* Image if present */}
        {imageUrl && (
          <div className="mb-3">
            <img
              src={imageUrl}
              alt="Üretilen görsel"
              className="rounded-2xl max-w-sm w-full shadow-xl border border-border/50"
              loading="lazy"
            />
          </div>
        )}

        {/* Text content */}
        {content && (
          <div className="text-[15px] leading-relaxed">
            <MarkdownRenderer content={content} />
          </div>
        )}
      </div>
    </div>
  );
}
