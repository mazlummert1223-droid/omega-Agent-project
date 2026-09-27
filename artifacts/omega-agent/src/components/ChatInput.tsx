import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Image as ImageIcon, Square, Mic, MicOff,
  Code2, Layers, ChevronDown, Film, Paperclip, Globe,
  Hash, Zap, Bot, Volume2, VolumeX,
} from 'lucide-react';
import { AgentMode } from '@/hooks/use-chat';
import { useOmegaVoice, type OmegaVoiceController } from '@/hooks/use-omega-voice';
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
  voice?: OmegaVoiceController;
}

/* ─── Model options (shown in bar) ─── */
interface OmegaModel { id: AgentMode; label: string; icon: React.ReactNode; badge?: string }
const OMEGA_MODELS: OmegaModel[] = [
  { id: 'multi',    label: 'OMEGA AGENT',   icon: <Layers className="w-3.5 h-3.5" />, badge: 'Recommended' },
  { id: 'quantum',  label: 'OMEGA QUANTUM', icon: <Zap    className="w-3.5 h-3.5" /> },
  { id: 'auto',     label: 'OMEGA ORIGIN',  icon: <Bot    className="w-3.5 h-3.5" /> },
];

const IMAGE_STYLES = [
  { id: 'default',   label: 'Auto'      },
  { id: 'realistic', label: 'Realistic' },
  { id: 'anime',     label: 'Anime'     },
  { id: 'pony',      label: 'Pony'      },
  { id: '3d',        label: '3D'        },
  { id: 'art',       label: 'Artistic'  },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'fantasy',   label: 'Fantasy'   },
];

const IMAGE_KEYWORDS = ['resim', 'görsel', 'çiz', 'üret', 'fotoğraf', 'anime', 'pony', 'image', 'draw', 'generate', 'picture', 'photo'];

function Popup({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <div
      className={`absolute bottom-full mb-2 rounded-xl shadow-2xl z-50 animate-fade-up overflow-hidden ${right ? 'right-0' : 'left-0'}`}
      style={{ background: '#111', border: '1px solid #222', minWidth: 220 }}
    >
      {children}
    </div>
  );
}

export function ChatInput({
  onSend, isStreaming, onStop, onVideoGenerate, onImageGenerate, isGeneratingImage: extGen, voice: externalVoice,
}: ChatInputProps) {
  const [input,           setInput]           = useState('');
  const [selectedModel,   setSelectedModel]   = useState<AgentMode>('multi');
  const [showModels,      setShowModels]      = useState(false);
  const [showImgStyles,   setShowImgStyles]   = useState(false);
  const [showFilePanel,   setShowFilePanel]   = useState(false);
  const [showMore,        setShowMore]        = useState(false);
  const [attachedFile,    setAttachedFile]    = useState<ParsedFile | null>(null);
  const [imageStyle,      setImageStyle]      = useState('default');
  const [internalGen,     setInternalGen]     = useState(false);
  const isGeneratingImage = extGen ?? internalGen;

  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const localVoice = useOmegaVoice();
  const voice = externalVoice ?? localVoice;
  const isListening = voice.status === 'recording';

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  useEffect(() => {
    const openFiles = () => setShowFilePanel(true);
    window.addEventListener('omega-open-files', openFiles);
    return () => window.removeEventListener('omega-open-files', openFiles);
  }, []);

  const hasImageKw     = IMAGE_KEYWORDS.some(k => input.toLowerCase().includes(k));
  const hasStyleSel    = imageStyle !== 'default';
  const isImageRequest = hasImageKw || hasStyleSel;

  const activeModel = OMEGA_MODELS.find(m => m.id === selectedModel) || OMEGA_MODELS[0];

  /* ── AI voice input ── */
  const toggleVoice = async () => {
    if (!voice.supported) {
      toast.error('Bu tarayıcıda mikrofon kullanılamıyor');
      return;
    }
    try {
      if (isListening) {
        const transcript = await voice.stopRecordingAndTranscribe();
        if (transcript) onSend(transcript, selectedModel);
        else toast.info('Ses anlaşılamadı, lütfen tekrar deneyin');
      } else {
        await voice.startRecording();
      }
    } catch {
      toast.error('Mikrofon izni alınamadı');
    }
  };

  /* ── Image generation ── */
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
      if (d.url) onSend(text, selectedModel, d.url); else throw new Error();
    } catch { toast.error('Görsel üretilemedi'); onSend(text, selectedModel); }
    finally  { setInternalGen(false); }
  };

  /* ── Build message with file context ── */
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
    onSend(buildMsg(input.trim()), selectedModel);
    setInput(''); setShowModels(false); setAttachedFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  /* ── Globe = researcher one-shot ── */
  const handleGlobe = () => {
    if (!input.trim()) return;
    const { ok } = checkSuspicious(input.trim());
    if (!ok) return;
    recordRequest();
    onSend(buildMsg(input.trim()), 'researcher');
    setInput(''); setAttachedFile(null);
  };

  const closeAll = () => { setShowModels(false); setShowImgStyles(false); setShowMore(false); };

  return (
    <div className="w-full max-w-[780px] mx-auto px-4 pb-5 pt-2 relative">
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

      {/* Image style popup */}
      {showImgStyles && (
        <Popup>
          <p className="text-[10px] font-semibold uppercase tracking-widest px-4 pt-3 pb-2" style={{ color: '#555' }}>Görsel Stili</p>
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {IMAGE_STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => { setImageStyle(s.id); setShowImgStyles(false); }}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={imageStyle === s.id
                  ? { background: '#F0972E', color: '#0A0A0A', border: '1px solid transparent' }
                  : { background: 'transparent', border: '1px solid #282828', color: '#666' }
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </Popup>
      )}

      {/* Model picker popup */}
      {showModels && (
        <Popup>
          <p className="text-[10px] font-semibold uppercase tracking-widest px-4 pt-3 pb-2" style={{ color: '#555' }}>AI Model</p>
          <div className="pb-2">
            {OMEGA_MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => { setSelectedModel(m.id); setShowModels(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                style={{
                  background: selectedModel === m.id ? '#1C1C1C' : 'transparent',
                  borderLeft: selectedModel === m.id ? '2px solid #F0972E' : '2px solid transparent',
                  color: selectedModel === m.id ? '#E0E0E0' : '#777',
                }}
                onMouseEnter={e => { if (selectedModel !== m.id) (e.currentTarget as HTMLElement).style.background = '#161616'; }}
                onMouseLeave={e => { if (selectedModel !== m.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ color: selectedModel === m.id ? '#F0972E' : '#555' }}>{m.icon}</span>
                <div className="flex-1">
                  <div className="text-[12px] font-semibold tracking-wide" style={{ letterSpacing: '0.05em' }}>{m.label}</div>
                </div>
                {m.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                    style={{ background: 'rgba(240,151,46,0.15)', color: '#F0972E', border: '1px solid rgba(240,151,46,0.25)', letterSpacing: '0.06em' }}>
                    {m.badge}
                  </span>
                )}
                {selectedModel === m.id && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F0972E' }} />
                )}
              </button>
            ))}
          </div>
        </Popup>
      )}

      {showMore && (
        <Popup right>
          <p className="text-[10px] font-semibold uppercase tracking-widest px-4 pt-3 pb-2" style={{ color: '#555' }}>Hızlı model</p>
          {[
            { id: 'multi' as AgentMode, label: 'Çok ajanlı görev' },
            { id: 'quantum' as AgentMode, label: 'Derin analiz' },
            { id: 'researcher' as AgentMode, label: 'Web araştırması' },
          ].map(item => (
            <button key={item.id} onClick={() => { setSelectedModel(item.id); setShowMore(false); }}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/5" style={{ color: selectedModel === item.id ? '#F0972E' : '#888' }}>
              {item.label}
            </button>
          ))}
        </Popup>
      )}

      {/* Main input box */}
      <div
        className="relative rounded-2xl transition-all duration-150 input-glow"
        style={{
          background: '#111',
          border: `1px solid ${isListening ? 'rgba(239,68,68,0.4)' : '#222'}`,
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening ? '🎤 Listening…' :
            selectedModel === 'researcher' ? 'What would you like to research?' :
            selectedModel === 'coder'      ? 'Describe the code you need…' :
            selectedModel === 'quantum'    ? 'Ask anything — Omega Quantum will reason deeply…' :
            selectedModel === 'multi'      ? 'Complex task? Omega Agent handles it with 3 specialists…' :
            'Message Omega…'
          }
          disabled={isListening}
          rows={1}
          className="w-full bg-transparent text-[14px] leading-relaxed resize-none outline-none px-4 pt-4 pb-2 max-h-[180px]"
          style={{ color: '#D0D0D0', caretColor: '#F0972E' }}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-2">
          <div className="flex items-center gap-1">

            {/* Model selector */}
            <button
              onClick={() => { setShowModels(!showModels); setShowImgStyles(false); setShowFilePanel(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all"
              style={{
                background: showModels ? 'rgba(240,151,46,0.12)' : 'transparent',
                border: `1px solid ${showModels ? 'rgba(240,151,46,0.3)' : '#282828'}`,
                color: showModels ? '#F0972E' : '#666',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ color: showModels ? '#F0972E' : '#555' }}>{activeModel.icon}</span>
              <span className="hidden sm:inline">{activeModel.label}</span>
              <ChevronDown className={cn('w-3 h-3 transition-transform', showModels && 'rotate-180')} />
            </button>

            {/* Attach */}
            <button
              onClick={() => { setShowFilePanel(!showFilePanel); closeAll(); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: attachedFile ? 'rgba(34,197,94,0.1)' : showFilePanel ? 'rgba(240,151,46,0.1)' : 'transparent',
                border: `1px solid ${attachedFile ? 'rgba(34,197,94,0.3)' : showFilePanel ? 'rgba(240,151,46,0.3)' : '#282828'}`,
                color: attachedFile ? '#22c55e' : showFilePanel ? '#F0972E' : '#555',
              }}
              title="Dosya yükle"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>

            {/* Globe — researcher one-shot */}
            <button
              onClick={handleGlobe}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ border: '1px solid #282828', color: '#555', background: 'transparent' }}
              title="Web araştırması yap"
              onMouseEnter={e => { (e.currentTarget.style.color = '#F0972E'); (e.currentTarget.style.borderColor = 'rgba(240,151,46,0.3)'); (e.currentTarget.style.background = 'rgba(240,151,46,0.08)'); }}
              onMouseLeave={e => { (e.currentTarget.style.color = '#555'); (e.currentTarget.style.borderColor = '#282828'); (e.currentTarget.style.background = 'transparent'); }}
            >
              <Globe className="w-3.5 h-3.5" />
            </button>

            {/* Image style */}
            <button
              onClick={() => { setShowImgStyles(!showImgStyles); setShowModels(false); setShowFilePanel(false); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: isImageRequest ? 'rgba(240,151,46,0.1)' : showImgStyles ? 'rgba(240,151,46,0.1)' : 'transparent',
                border: `1px solid ${isImageRequest || showImgStyles ? 'rgba(240,151,46,0.3)' : '#282828'}`,
                color: isImageRequest || showImgStyles ? '#F0972E' : '#555',
              }}
              title="Görsel stili"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>

            {/* More / expand */}
            <button
              onClick={() => { setShowMore(!showMore); setShowModels(false); setShowImgStyles(false); setShowFilePanel(false); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ border: `1px solid ${showMore ? 'rgba(240,151,46,.3)' : '#282828'}`, color: showMore ? '#F0972E' : '#555', background: showMore ? 'rgba(240,151,46,.08)' : 'transparent' }}
              title="Daha fazla"
              onMouseEnter={e => { (e.currentTarget.style.color = '#999'); (e.currentTarget.style.background = '#1A1A1A'); }}
              onMouseLeave={e => { (e.currentTarget.style.color = '#555'); (e.currentTarget.style.background = 'transparent'); }}
            >
              <Hash className="w-3.5 h-3.5" />
            </button>

            {/* Video */}
            {onVideoGenerate && (
              <button
                disabled={!input.trim()}
                onClick={() => { if (!input.trim()) { toast.info('Önce video açıklamasını yazın'); return; } onVideoGenerate(input.trim()); setInput(''); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ border: '1px solid #282828', color: input.trim() ? '#555' : '#333', background: 'transparent', opacity: input.trim() ? 1 : .65 }}
                title="Video üret (LTX)"
                onMouseEnter={e => { (e.currentTarget.style.color = '#999'); (e.currentTarget.style.background = '#1A1A1A'); }}
                onMouseLeave={e => { (e.currentTarget.style.color = '#555'); (e.currentTarget.style.background = 'transparent'); }}
              >
                <Film className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* AI voice output toggle */}
            <button
              onClick={() => voice.setVoiceEnabled(!voice.enabled)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                border: `1px solid ${voice.enabled ? 'rgba(240,151,46,0.35)' : '#282828'}`,
                color: voice.enabled ? '#F0972E' : '#555',
                background: voice.enabled ? 'rgba(240,151,46,0.1)' : 'transparent',
              }}
              title={voice.enabled ? 'Omega sesini kapat' : 'Omega sesini aç'}
              aria-label={voice.enabled ? 'Omega sesini kapat' : 'Omega sesini aç'}
            >
              {voice.enabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* AI microphone */}
            <button
              onClick={toggleVoice}
              disabled={voice.status === 'transcribing'}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                border: `1px solid ${isListening ? 'rgba(240,151,46,0.45)' : '#282828'}`,
                color: isListening ? '#F0972E' : voice.status === 'transcribing' ? '#777' : '#555',
                background: isListening ? 'rgba(240,151,46,0.1)' : 'transparent',
              }}
              title={isListening ? 'Kaydı bitir' : voice.status === 'transcribing' ? 'Ses çözümleniyor' : 'Omega ile konuş'}
              aria-label={isListening ? 'Ses kaydını bitir' : 'Omega ile konuş'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {/* Send / Stop */}
            {isStreaming || isGeneratingImage ? (
              <button
                onClick={onStop}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
                title="Durdur"
              >
                <Square className="w-3.5 h-3.5" style={{ color: '#888', fill: '#888' }} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim() && !attachedFile}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                style={input.trim()
                  ? { background: '#F0972E', border: '1px solid transparent' }
                  : { background: '#181818', border: '1px solid #282828', cursor: 'not-allowed' }
                }
              >
                <Send className="w-3.5 h-3.5 ml-0.5" style={{ color: input.trim() ? '#0A0A0A' : '#3A3A3A' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] mt-2" style={{ color: '#2E2E2E' }}>
        Omega may be inaccurate. Verify important information.
      </p>
    </div>
  );
}
