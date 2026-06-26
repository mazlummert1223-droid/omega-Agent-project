import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Image as ImageIcon, Square, Mic, MicOff,
  Bot, Search, Code2, Paintbrush, Layers, ChevronDown, Film, Paperclip, Sparkles,
} from 'lucide-react';
import { AgentMode } from '@/hooks/use-chat';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { checkSuspicious, recordRequest, recordBlocked, speakAlert } from '@/lib/security';
import { FileUploadPanel, FileCard, type ParsedFile } from './FileUploadPanel';

interface ChatInputProps {
  onSend: (message: string, mode: AgentMode, imageUrl?: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  onVideoGenerate?: (prompt: string) => void;
  onImageGenerate?: (prompt: string, style: string) => void;
  isGeneratingImage?: boolean;
}

const MODES: { id: AgentMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'auto',       label: 'Otomatik',   icon: <Bot className="w-4 h-4" />,       desc: 'Genel asistan' },
  { id: 'researcher', label: 'Araştırmacı', icon: <Search className="w-4 h-4" />,    desc: 'Derin araştırma' },
  { id: 'coder',      label: 'Mühendis',   icon: <Code2 className="w-4 h-4" />,      desc: 'Kod & teknik' },
  { id: 'designer',   label: 'Tasarımcı',  icon: <Paintbrush className="w-4 h-4" />, desc: 'UI/UX tasarım' },
  { id: 'multi',      label: 'Çok-Ajan',   icon: <Layers className="w-4 h-4" />,     desc: '3 ajan → 1 cevap' },
];

const IMAGE_STYLES = [
  { id: 'default',   label: 'Otomatik' },
  { id: 'realistic', label: 'Gerçekçi' },
  { id: 'anime',     label: 'Anime' },
  { id: 'pony',      label: 'Pony' },
  { id: '3d',        label: '3D' },
  { id: 'art',       label: 'Sanatsal' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'fantasy',   label: 'Fantastik' },
];

const IMAGE_KEYWORDS = ['resim', 'görsel', 'çiz', 'üret', 'fotoğraf', 'anime', 'pony', 'image', 'draw', 'generate', 'picture', 'photo'];

/* ─── small helper: popup wrapper ─── */
function Popup({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute bottom-full mb-2 left-0 right-0 rounded-xl shadow-2xl z-50 animate-fade-up overflow-hidden"
      style={{ background: 'hsl(0 0% 9%)', border: '1px solid hsl(0 0% 16%)' }}
    >
      {children}
    </div>
  );
}

export function ChatInput({
  onSend, isStreaming, onStop, onVideoGenerate, onImageGenerate, isGeneratingImage: extGen,
}: ChatInputProps) {
  const [input,           setInput]           = useState('');
  const [mode,            setMode]            = useState<AgentMode>('auto');
  const [showModes,       setShowModes]       = useState(false);
  const [showImgStyles,   setShowImgStyles]   = useState(false);
  const [showFilePanel,   setShowFilePanel]   = useState(false);
  const [attachedFile,    setAttachedFile]    = useState<ParsedFile | null>(null);
  const [imageStyle,      setImageStyle]      = useState('default');
  const [internalGen,     setInternalGen]     = useState(false);
  const [isListening,     setIsListening]     = useState(false);
  const isGeneratingImage = extGen ?? internalGen;

  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  /* auto-resize textarea */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const hasImageKw    = IMAGE_KEYWORDS.some(k => input.toLowerCase().includes(k));
  const hasStyleSel   = imageStyle !== 'default';
  const isImageRequest = hasImageKw || hasStyleSel;

  /* voice */
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Tarayıcınız ses tanımayı desteklemiyor');
      return;
    }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const Rec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang = 'tr-TR'; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e: any) => { setInput(p => p + (p ? ' ' : '') + e.results[0][0].transcript); setIsListening(false); };
    rec.onerror  = () => setIsListening(false);
    rec.onend    = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start(); setIsListening(true);
  };

  /* image generation */
  const generateImage = async () => {
    if (!input.trim()) return;
    const text = input.trim(); setInput('');
    if (onImageGenerate) { onImageGenerate(text, imageStyle); return; }
    setInternalGen(true);
    try {
      const r = await fetch('/api/openai/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, style: imageStyle }),
      });
      const d = await r.json();
      if (d.url) onSend(text, mode, d.url); else throw new Error();
    } catch { toast.error('Görsel üretilemedi'); onSend(text, mode); }
    finally  { setInternalGen(false); }
  };

  /* build message with file context */
  const buildMsg = (text: string) => {
    if (!attachedFile) return text;
    const meta = [
      attachedFile.pages  && `${attachedFile.pages} sayfa`,
      attachedFile.slides && `${attachedFile.slides} slayt`,
      attachedFile.sheets && `${attachedFile.sheets.length} çalışma sayfası`,
      `${attachedFile.size} KB`,
    ].filter(Boolean).join(' · ');
    return `[DOSYA: ${attachedFile.name} | ${attachedFile.type}${meta ? ' | ' + meta : ''}]
İçerik:
${attachedFile.text.substring(0, 60_000)}
---
Kullanıcı sorusu: ${text}`;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !attachedFile) || isStreaming || isGeneratingImage) return;
    if (!input.trim() && attachedFile) { toast.info('Dosya hakkında bir soru yazın'); return; }

    const { ok, reason } = checkSuspicious(input.trim());
    if (!ok) { recordBlocked(); speakAlert('Şüpheli aktivite tespit edildi'); toast.error(`🛡️ ${reason}`, { duration: 6000 }); return; }
    recordRequest();

    if (isImageRequest && !attachedFile) { generateImage(); return; }
    onSend(buildMsg(input.trim()), mode);
    setInput(''); setShowModes(false); setAttachedFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const activeMode = MODES.find(m => m.id === mode) || MODES[0];
  const closeAll = () => { setShowModes(false); setShowImgStyles(false); };

  return (
    <div className="w-full max-w-[720px] mx-auto px-4 pb-5 pt-2 relative">
      {/* File Upload Panel */}
      {showFilePanel && (
        <FileUploadPanel
          onClose={() => setShowFilePanel(false)}
          onFileParsed={file => {
            setAttachedFile(file);
            setShowFilePanel(false);
            toast.success(`${file.name} okundu`);
            setTimeout(() => textareaRef.current?.focus(), 100);
          }}
        />
      )}

      {attachedFile && !showFilePanel && (
        <FileCard
          file={attachedFile}
          onRemove={() => setAttachedFile(null)}
          onQuickAction={p => { setInput(p); setTimeout(() => textareaRef.current?.focus(), 50); }}
        />
      )}

      {/* Mode picker popup */}
      {showModes && (
        <Popup>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest px-3.5 pt-3 pb-2">
            Ajan modu
          </p>
          <div className="pb-1.5">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setShowModes(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-left transition-colors',
                  mode === m.id
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <span className={mode === m.id ? 'text-primary' : 'text-muted-foreground/60'}>{m.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-[13px]">{m.label}</div>
                  <div className="text-[11px] text-muted-foreground/60">{m.desc}</div>
                </div>
                {mode === m.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </Popup>
      )}

      {/* Image style popup */}
      {showImgStyles && (
        <Popup>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest px-3.5 pt-3 pb-2.5">
            Görsel stili
          </p>
          <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
            {IMAGE_STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => { setImageStyle(s.id); setShowImgStyles(false); }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  imageStyle === s.id
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                style={imageStyle === s.id
                  ? { background: 'hsl(195 100% 45%)', border: '1px solid transparent' }
                  : { background: 'transparent', border: '1px solid hsl(0 0% 20%)' }
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </Popup>
      )}

      {/* ── Main input box ── */}
      <div
        className="relative rounded-2xl transition-all duration-150 input-glow"
        style={{
          background: 'hsl(0 0% 9%)',
          border: `1px solid ${isListening ? 'hsl(0 72% 55% / 0.5)' : 'hsl(0 0% 16%)'}`,
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening       ? '🎤 Dinleniyor…' :
            mode === 'researcher' ? 'Araştırmak istediğin konuyu yaz…' :
            mode === 'coder'      ? 'Yazmamı istediğin kodu anlat…' :
            mode === 'designer'   ? 'Tasarım veya görsel isteğini yaz…' :
            mode === 'multi'      ? 'Karmaşık görevini anlat — 3 ajan birlikte çalışır…' :
            'Omega\'ya bir şey sor…'
          }
          disabled={isListening}
          rows={1}
          className="w-full bg-transparent text-[14.5px] leading-relaxed resize-none outline-none px-4 pt-3.5 pb-2 max-h-[180px]"
          style={{ color: 'hsl(0 0% 88%)', caretColor: 'hsl(195 100% 45%)' }}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1 gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Mode selector */}
            <button
              onClick={() => { setShowModes(!showModes); setShowImgStyles(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: showModes ? 'hsl(195 100% 45% / 0.12)' : 'transparent',
                border: `1px solid ${showModes ? 'hsl(195 100% 45% / 0.3)' : 'hsl(0 0% 18%)'}`,
                color: showModes ? 'hsl(195 100% 45%)' : 'hsl(0 0% 45%)',
              }}
            >
              <span>{activeMode.icon}</span>
              <span>{activeMode.label}</span>
              <ChevronDown className={cn('w-3 h-3 transition-transform', showModes && 'rotate-180')} />
            </button>

            {/* Image style */}
            <button
              onClick={() => { setShowImgStyles(!showImgStyles); setShowModes(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: isImageRequest ? 'hsl(35 95% 58% / 0.1)' : 'transparent',
                border: `1px solid ${isImageRequest ? 'hsl(35 95% 58% / 0.3)' : 'hsl(0 0% 18%)'}`,
                color: isImageRequest ? 'hsl(35 95% 58%)' : 'hsl(0 0% 45%)',
              }}
              title="Görsel stili"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {imageStyle === 'default' ? 'Görsel' : IMAGE_STYLES.find(s => s.id === imageStyle)?.label}
              </span>
            </button>

            {/* Voice */}
            <button
              onClick={toggleVoice}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                border: `1px solid ${isListening ? 'hsl(0 72% 55% / 0.4)' : 'hsl(0 0% 18%)'}`,
                color: isListening ? 'hsl(0 72% 55%)' : 'hsl(0 0% 45%)',
                background: isListening ? 'hsl(0 72% 55% / 0.08)' : 'transparent',
              }}
              title={isListening ? 'Durdur' : 'Sesle yaz'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {/* File */}
            <button
              onClick={() => { setShowFilePanel(!showFilePanel); closeAll(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: attachedFile ? 'hsl(145 60% 45% / 0.1)' : showFilePanel ? 'hsl(195 100% 45% / 0.1)' : 'transparent',
                border: `1px solid ${attachedFile ? 'hsl(145 60% 45% / 0.3)' : showFilePanel ? 'hsl(195 100% 45% / 0.3)' : 'hsl(0 0% 18%)'}`,
                color: attachedFile ? 'hsl(145 60% 55%)' : showFilePanel ? 'hsl(195 100% 45%)' : 'hsl(0 0% 45%)',
              }}
              title="Dosya yükle"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{attachedFile ? 'Eklendi' : 'Dosya'}</span>
            </button>

            {/* Video */}
            {onVideoGenerate && (
              <button
                onClick={() => { onVideoGenerate(input.trim()); if (input.trim()) setInput(''); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ border: '1px solid hsl(0 0% 18%)', color: 'hsl(0 0% 45%)', background: 'transparent' }}
                title="Video üret"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'hsl(0 0% 70%)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'hsl(0 0% 45%)'; }}
              >
                <Film className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Video</span>
              </button>
            )}
          </div>

          {/* Send / Stop */}
          {isStreaming || isGeneratingImage ? (
            <button
              onClick={onStop}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
              style={{ background: 'hsl(0 0% 14%)', border: '1px solid hsl(0 0% 20%)' }}
              title="Durdur"
            >
              <Square className="w-3.5 h-3.5" style={{ color: 'hsl(0 0% 60%)', fill: 'hsl(0 0% 60%)' }} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && !attachedFile}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
              style={
                input.trim()
                  ? { background: 'hsl(195 100% 45%)', border: '1px solid transparent' }
                  : { background: 'hsl(0 0% 13%)', border: '1px solid hsl(0 0% 18%)', cursor: 'not-allowed' }
              }
            >
              {isImageRequest
                ? <Sparkles className="w-3.5 h-3.5" style={{ color: input.trim() ? 'hsl(0 0% 5%)' : 'hsl(0 0% 30%)' }} />
                : <Send    className="w-3.5 h-3.5 ml-0.5" style={{ color: input.trim() ? 'hsl(0 0% 5%)' : 'hsl(0 0% 30%)' }} />
              }
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] mt-2" style={{ color: 'hsl(0 0% 28%)' }}>
        Omega yanlış bilgi verebilir. Önemli konularda doğrulayın.
      </p>
    </div>
  );
}
