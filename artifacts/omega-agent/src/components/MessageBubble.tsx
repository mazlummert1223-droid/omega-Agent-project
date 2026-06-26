import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Download, FileText } from 'lucide-react';
import { IMG_MARKER } from '@/hooks/use-chat';
import { OmegaLogo } from './Sidebar';

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

  /* ── User message ── */
  if (isUser) {
    const fileMsg = parseFileMessage(content);
    if (fileMsg) {
      return (
        <div className="flex justify-end px-4 md:px-10 py-2 animate-fade-up">
          <div className="max-w-[78%] flex flex-col gap-2 items-end">
            {/* File badge */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'hsl(0 0% 10%)',
                border: '1px solid hsl(0 0% 16%)',
                color: 'hsl(0 0% 60%)',
              }}
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'hsl(195 100% 45%)' }} />
              <span className="truncate max-w-[180px] text-[13px]">{fileMsg.fileName}</span>
              {fileMsg.fileType && (
                <span
                  className="text-[11px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                  style={{ background: 'hsl(195 100% 45% / 0.1)', color: 'hsl(195 100% 45%)' }}
                >
                  {fileMsg.fileType}
                </span>
              )}
            </div>
            {/* Question bubble */}
            {fileMsg.question && (
              <div
                className="px-4 py-3 rounded-2xl rounded-tr-sm text-[14.5px] leading-relaxed whitespace-pre-wrap"
                style={{
                  background: 'hsl(0 0% 12%)',
                  border: '1px solid hsl(0 0% 18%)',
                  color: 'hsl(0 0% 88%)',
                }}
              >
                {fileMsg.question}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-end px-4 md:px-10 py-2 animate-fade-up">
        <div className="max-w-[78%]">
          <div
            className="px-4 py-3 rounded-2xl rounded-tr-sm text-[14.5px] leading-relaxed whitespace-pre-wrap"
            style={{
              background: 'hsl(0 0% 12%)',
              border: '1px solid hsl(0 0% 18%)',
              color: 'hsl(0 0% 88%)',
            }}
          >
            {content}
          </div>
        </div>
      </div>
    );
  }

  /* ── Assistant message ── */
  return (
    <div className="flex gap-3 px-4 md:px-10 py-4 animate-fade-up group/msg">
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <OmegaLogo size={30} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* Name + streaming dots */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <span
            className="text-[13px] font-semibold font-display"
            style={{ color: 'hsl(195 100% 45%)' }}
          >
            Omega
          </span>
          {isStreaming && (
            <span className="flex gap-1 items-center">
              <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(195 100% 45% / 0.6)' }} />
              <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(195 100% 45% / 0.6)' }} />
              <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(195 100% 45% / 0.6)' }} />
            </span>
          )}
        </div>

        {/* Image */}
        {imageUrl && (
          <div className="mb-3 group/img relative inline-block">
            <img
              src={imageUrl}
              alt="Üretilen görsel"
              className="rounded-xl max-w-sm w-full shadow-lg"
              style={{ border: '1px solid hsl(0 0% 18%)' }}
              loading="lazy"
            />
            <a
              href={imageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)' }}
              title="İndir"
            >
              <Download className="w-3.5 h-3.5 text-white" />
            </a>
          </div>
        )}

        {/* Text */}
        {text && (
          <div className="prose">
            <MarkdownRenderer content={text} />
          </div>
        )}
      </div>
    </div>
  );
}
