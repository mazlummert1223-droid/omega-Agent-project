import React, { useEffect, useRef, useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Download, FileText, Film, Code2, Maximize2, Minimize2, Copy, Check } from 'lucide-react';
import { IMG_MARKER } from '@/hooks/use-chat';
import { OmegaMark } from './Sidebar';
import { normalizeSandboxHtml } from '@/lib/sandbox';

export const VIDEO_MARKER = "__VIDEO__:";
export const APP_MARKER   = "__APP__:";

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
}

type ContentKind =
  | { kind: 'image'; url: string }
  | { kind: 'video'; prompt: string }
  | { kind: 'app'; code: string }
  | { kind: 'text'; text: string };

function parseContent(content: string): ContentKind {
  if (content?.startsWith(IMG_MARKER))   return { kind: 'image', url: content.slice(IMG_MARKER.length).trim() };
  if (content?.startsWith(VIDEO_MARKER)) return { kind: 'video', prompt: content.slice(VIDEO_MARKER.length).trim() };
  if (content?.startsWith(APP_MARKER))   return { kind: 'app',   code: content.slice(APP_MARKER.length).trim() };
  return { kind: 'text', text: content };
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

/* ── App Preview sandboxed iframe ── */
function AppPreview({ code }: { code: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [sandboxError, setSandboxError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.source !== 'omega-sandbox') return;
      if (event.data.type === 'ready') setSandboxError('');
      if (event.data.type === 'error') setSandboxError(event.data.message || 'Uygulama hatası');
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'omega-app.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="mt-3 rounded-2xl overflow-hidden"
      style={{ border: '1px solid #252525', background: '#0D0D0D' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: '#141414', borderBottom: '1px solid #1E1E1E' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(240,151,46,0.12)', border: '1px solid rgba(240,151,46,0.25)' }}
          >
            <Code2 className="w-3.5 h-3.5" style={{ color: '#F0972E' }} />
          </div>
           <span className="text-xs font-semibold" style={{ color: '#C0C0C0' }}>Canlı Uygulama</span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(240,151,46,0.12)', color: '#F0972E', border: '1px solid rgba(240,151,46,0.2)' }}
          >
            Sandbox
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all"
            style={{ color: '#666', background: '#1A1A1A', border: '1px solid #252525' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#CCC')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Kopyalandı' : 'Kod'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all"
            style={{ color: '#666', background: '#1A1A1A', border: '1px solid #252525' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#CCC')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}
          >
            <Download className="w-3 h-3" />
            İndir
          </button>
          <button
            onClick={() => setExpanded(p => !p)}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: '#666', background: '#1A1A1A', border: '1px solid #252525' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#CCC')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}
            title={expanded ? 'Küçült' : 'Tam ekran'}
          >
           {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

       {sandboxError && (
         <div className="px-4 py-2 text-[11px]" style={{ background: 'rgba(239,68,68,.08)', color: '#fca5a5', borderBottom: '1px solid rgba(239,68,68,.18)' }}>
           Sandbox hatası: {sandboxError}
         </div>
       )}

      {/* iframe */}
      <iframe
         ref={iframeRef}
         srcDoc={normalizeSandboxHtml(code)}
         sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads allow-pointer-lock allow-presentation"
         allow="fullscreen; autoplay; clipboard-read; clipboard-write"
        title="Omega App Preview"
        className="w-full transition-all duration-300"
         style={{ height: expanded ? '780px' : '520px', border: 'none', background: '#fff' }}
      />
    </div>
  );
}

/* ── Video Trigger button ── */
function VideoTrigger({ prompt }: { prompt: string }) {
  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent('omega-open-video', { detail: prompt }));
  };

  return (
    <div
      className="mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all group"
      style={{ background: '#111', border: '1px solid #252525' }}
      onClick={handleOpen}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
        style={{ background: 'rgba(240,151,46,0.12)', border: '1px solid rgba(240,151,46,0.25)' }}
      >
        <Film className="w-4.5 h-4.5" style={{ color: '#F0972E' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold mb-0.5" style={{ color: '#E0E0E0' }}>Video Üret</div>
        <div className="text-xs truncate" style={{ color: '#555' }}>{prompt}</div>
      </div>
      <div
        className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
        style={{ background: 'rgba(240,151,46,0.12)', color: '#F0972E', border: '1px solid rgba(240,151,46,0.22)' }}
      >
        Aç →
      </div>
    </div>
  );
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser  = role === 'user';
  const parsed  = parseContent(content);

  /* ── User message ── */
  if (isUser) {
    const fileMsg = parseFileMessage(content);
    if (fileMsg) {
      return (
        <div className="flex justify-end px-4 md:px-10 py-2 animate-fade-up">
          <div className="max-w-[78%] flex flex-col gap-2 items-end">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'hsl(0 0% 10%)', border: '1px solid hsl(0 0% 16%)', color: 'hsl(0 0% 60%)' }}
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#F0972E' }} />
              <span className="truncate max-w-[180px] text-[13px]">{fileMsg.fileName}</span>
              {fileMsg.fileType && (
                <span className="text-[11px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                  style={{ background: 'rgba(240,151,46,0.1)', color: '#F0972E' }}>
                  {fileMsg.fileType}
                </span>
              )}
            </div>
            {fileMsg.question && (
              <div className="px-4 py-3 rounded-2xl rounded-tr-sm text-[14.5px] leading-relaxed whitespace-pre-wrap"
                style={{ background: 'hsl(0 0% 12%)', border: '1px solid hsl(0 0% 18%)', color: 'hsl(0 0% 88%)' }}>
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
          <div className="px-4 py-3 rounded-2xl rounded-tr-sm text-[14.5px] leading-relaxed whitespace-pre-wrap"
            style={{ background: 'hsl(0 0% 12%)', border: '1px solid hsl(0 0% 18%)', color: 'hsl(0 0% 88%)' }}>
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
        <OmegaMark size={30} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* Name + animated Omega thinking indicator */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="text-[13px] font-semibold font-display" style={{ color: '#F0972E' }}>
            Omega
          </span>
          {isStreaming && (
            <span className="omega-thinking" aria-label="Omega yanıt hazırlıyor">
              <OmegaMark size={18} />
            </span>
          )}
        </div>

        {/* Render based on content kind */}
        {parsed.kind === 'image' && (
          <div className="mb-3 group/img relative inline-block">
            <img
              src={parsed.url}
              alt="Üretilen görsel"
              className="rounded-xl max-w-sm w-full shadow-lg"
              style={{ border: '1px solid hsl(0 0% 18%)' }}
              loading="lazy"
            />
            <a
              href={parsed.url}
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

        {parsed.kind === 'video' && <VideoTrigger prompt={parsed.prompt} />}

        {parsed.kind === 'app' && <AppPreview code={parsed.code} />}

        {parsed.kind === 'text' && parsed.text && (
          <div className="prose">
            <MarkdownRenderer content={parsed.text} />
          </div>
        )}
      </div>
    </div>
  );
}
