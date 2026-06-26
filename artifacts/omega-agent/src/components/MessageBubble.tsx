import React from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Download, FileText } from 'lucide-react';
import { IMG_MARKER } from '@/hooks/use-chat';

function OmegaAvatar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      <circle cx="12" cy="10" r="6" stroke="url(#msgGrad)" strokeWidth="1.8"/>
      <path d="M8 17c0-2.209 1.791-4 4-4s4 1.791 4 4" stroke="url(#msgGrad)" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M6 17h12M9.5 17v2M14.5 17v2" stroke="url(#msgGrad)" strokeWidth="1.6" strokeLinecap="round"/>
      <defs>
        <linearGradient id="msgGrad" x1="6" y1="4" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4FF"/>
          <stop offset="1" stopColor="#F5A623"/>
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

function parseImageContent(content: string): { imageUrl: string | null; text: string } {
  if (content?.startsWith(IMG_MARKER)) {
    return { imageUrl: content.slice(IMG_MARKER.length).trim(), text: '' };
  }
  return { imageUrl: null, text: content };
}

function parseFileMessage(content: string): { fileName: string; fileType: string; question: string } | null {
  if (!content?.startsWith('[DOSYA:')) return null;
  try {
    const headerEnd = content.indexOf(']');
    if (headerEnd === -1) return null;
    const header = content.slice(7, headerEnd);
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
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/60 border border-border/60 rounded-xl text-sm text-muted-foreground">
              <FileText className="w-4 h-4 flex-shrink-0 text-primary" />
              <span className="truncate max-w-[200px] text-foreground/70">{fileMsg.fileName}</span>
              {fileMsg.fileType && (
                <span className="text-[11px] bg-primary/10 text-primary/80 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">
                  {fileMsg.fileType}
                </span>
              )}
            </div>
            {fileMsg.question && (
              <div className="bg-secondary border border-border/60 rounded-2xl rounded-tr-sm px-4 py-3 text-[15px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
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
          <div className="bg-secondary border border-border/60 rounded-2xl rounded-tr-sm px-4 py-3 text-[15px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-4 md:px-8 py-3 animate-fade-up group">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/15 flex items-center justify-center mt-0.5">
        <OmegaAvatar />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold omega-gradient font-display">Omega</span>
          {isStreaming && (
            <span className="flex gap-1 items-center">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
            </span>
          )}
        </div>

        {/* Image */}
        {imageUrl && (
          <div className="mb-3 group/img relative inline-block">
            <img
              src={imageUrl}
              alt="Üretilen görsel"
              className="rounded-2xl max-w-md w-full shadow-xl border border-border/40"
              loading="lazy"
            />
            <a
              href={imageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80"
              title="İndir"
            >
              <Download className="w-4 h-4 text-white" />
            </a>
          </div>
        )}

        {/* Text content */}
        {text && (
          <div className="prose text-[15px]">
            <MarkdownRenderer content={text} />
          </div>
        )}
      </div>
    </div>
  );
}
