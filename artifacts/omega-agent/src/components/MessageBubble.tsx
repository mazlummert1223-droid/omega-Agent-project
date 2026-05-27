import React from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Download, FileText } from 'lucide-react';
import { IMG_MARKER } from '@/hooks/use-chat';

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
  isStreaming?: boolean;
}

// Detect image marker in content and extract URL
function parseImageContent(content: string): { imageUrl: string | null; text: string } {
  if (content?.startsWith(IMG_MARKER)) {
    return { imageUrl: content.slice(IMG_MARKER.length).trim(), text: '' };
  }
  return { imageUrl: null, text: content };
}

// Detect embedded file context and extract filename + user question
// Format: "[DOSYA: name | type | meta]\nİçerik:\n...\n---\nKullanıcı sorusu: question"
function parseFileMessage(content: string): { fileName: string; fileType: string; question: string } | null {
  if (!content?.startsWith('[DOSYA:')) return null;
  try {
    const headerEnd = content.indexOf(']');
    if (headerEnd === -1) return null;
    const header = content.slice(7, headerEnd); // after "[DOSYA:"
    const parts = header.split('|').map(s => s.trim());
    const fileName = parts[0] ?? '';
    const fileType = parts[1] ?? '';
    const sep = '---\nKullanıcı sorusu:';
    const idx = content.indexOf(sep);
    const question = idx !== -1 ? content.slice(idx + sep.length).trim() : '';
    return { fileName, fileType, question };
  } catch {
    return null;
  }
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === 'user';
  const { imageUrl, text } = parseImageContent(content);

  if (isUser) {
    const fileMsg = parseFileMessage(content);
    if (fileMsg) {
      return (
        <div className="flex justify-end px-4 md:px-8 py-2 animate-fade-up">
          <div className="max-w-[80%] md:max-w-[70%] flex flex-col gap-2 items-end">
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/70 border border-border rounded-xl text-sm text-muted-foreground">
              <FileText className="w-4 h-4 flex-shrink-0 text-primary" />
              <span className="truncate max-w-[200px]">{fileMsg.fileName}</span>
              {fileMsg.fileType && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">{fileMsg.fileType}</span>
              )}
            </div>
            {fileMsg.question && (
              <div className="bg-primary/15 border border-primary/20 rounded-3xl rounded-tr-md px-5 py-3.5 text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {fileMsg.question}
              </div>
            )}
          </div>
        </div>
      );
    }
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

        {/* Image (from marker) */}
        {imageUrl && (
          <div className="mb-3 group relative inline-block">
            <img
              src={imageUrl}
              alt="Üretilen görsel"
              className="rounded-2xl max-w-md w-full shadow-xl border border-border/50"
              loading="lazy"
            />
            <a
              href={imageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              title="İndir"
            >
              <Download className="w-4 h-4 text-white" />
            </a>
          </div>
        )}

        {/* Text content */}
        {text && (
          <div className="text-[15px] leading-relaxed">
            <MarkdownRenderer content={text} />
          </div>
        )}
      </div>
    </div>
  );
}
