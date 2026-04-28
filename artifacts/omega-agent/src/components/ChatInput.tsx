import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Sparkles, Square, Mic, MicOff, Bot, Search, Code2, Paintbrush, Layers, ChevronUp, Film } from 'lucide-react';
import { AgentMode } from '@/hooks/use-chat';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChatInputProps {
  onSend: (message: string, mode: AgentMode, imageUrl?: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  onVideoGenerate?: (prompt: string) => void;
}

const MODES: { id: AgentMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'auto', label: 'Otomatik', icon: <Bot className="w-4 h-4" />, desc: 'Her şeyi yapabilir' },
  { id: 'researcher', label: 'Araştırmacı', icon: <Search className="w-4 h-4" />, desc: 'Derin analiz ve araştırma' },
  { id: 'coder', label: 'Kodcu', icon: <Code2 className="w-4 h-4" />, desc: 'Her dilde kod yazar' },
  { id: 'designer', label: 'Tasarımcı', icon: <Paintbrush className="w-4 h-4" />, desc: 'UI/UX ve görsel tasarım' },
  { id: 'multi', label: 'Çok-Ajan', icon: <Layers className="w-4 h-4" />, desc: '3 ajan aynı anda çalışır' },
];

const IMAGE_STYLES = [
  { id: 'default', label: '🖼️ Otomatik' },
  { id: 'realistic', label: '📸 Gerçekçi' },
  { id: 'anime', label: '🎌 Anime' },
  { id: 'pony', label: '🦄 Pony' },
  { id: '3d', label: '🎮 3D' },
  { id: 'art', label: '🎨 Sanatsal' },
  { id: 'cyberpunk', label: '🌃 Cyberpunk' },
  { id: 'fantasy', label: '🧙 Fantastik' },
];

const IMAGE_KEYWORDS = ['resim', 'görsel', 'çiz', 'üret', 'fotoğraf', 'anime', 'pony', 'image', 'draw', 'generate', 'picture', 'photo'];

export function ChatInput({ onSend, isStreaming, onStop, onVideoGenerate }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AgentMode>('auto');
  const [showModes, setShowModes] = useState(false);
  const [showImageStyles, setShowImageStyles] = useState(false);
  const [imageStyle, setImageStyle] = useState('default');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  // Detect image request — kelime varsa VEYA stil seçilmişse her zaman resim üret
  const hasImageKeyword = IMAGE_KEYWORDS.some(k => input.toLowerCase().includes(k));
  const hasStyleSelected = imageStyle !== 'default';
  const isImageRequest = hasImageKeyword || hasStyleSelected;

  // Voice input
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Tarayıcınız ses tanımayı desteklemiyor');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const Rec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new Rec();
    recognition.lang = 'tr-TR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + text);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const generateAndSend = async () => {
    if (!input.trim()) return;
    setIsGeneratingImage(true);
    toast.info('Görsel üretiliyor... 🎨');

    try {
      const response = await fetch('/api/openai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input.trim(), style: imageStyle }),
      });
      const data = await response.json();
      if (data.url) {
        onSend(input.trim(), mode, data.url);
        toast.success('Görsel üretildi!');
      } else {
        throw new Error('no url');
      }
    } catch {
      toast.error('Görsel üretilemedi, düz mesaj olarak gönderiliyor...');
      onSend(input.trim(), mode);
    } finally {
      setIsGeneratingImage(false);
      setInput('');
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming || isGeneratingImage) return;
    // Stil seçilmişse VEYA resim kelimesi varsa → her zaman resim üret (mode bağımsız)
    if (isImageRequest) {
      generateAndSend();
      return;
    }
    onSend(input.trim(), mode);
    setInput('');
    setShowModes(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const activeMode = MODES.find(m => m.id === mode) || MODES[0];

  return (
    <div className="w-full max-w-3xl mx-auto px-3 pb-5 pt-2 relative">
      {/* Mode Selector Panel */}
      {showModes && (
        <div className="absolute bottom-full mb-2 left-3 right-3 bg-card border border-border rounded-2xl p-2 shadow-2xl z-50 animate-fade-up">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider px-3 py-1.5">Ajan Modu Seç</p>
          <div className="space-y-0.5">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setShowModes(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left",
                  mode === m.id ? "bg-primary/15 text-white" : "text-foreground/70 hover:bg-secondary hover:text-white"
                )}
              >
                <span className={mode === m.id ? "text-primary" : "text-muted-foreground"}>{m.icon}</span>
                <div>
                  <div className="font-medium">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                </div>
                {mode === m.id && <span className="ml-auto text-primary text-xs">●</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Style Panel */}
      {showImageStyles && (
        <div className="absolute bottom-full mb-2 left-3 right-3 bg-card border border-border rounded-2xl p-3 shadow-2xl z-50 animate-fade-up">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Görsel Stili</p>
          <div className="flex flex-wrap gap-2">
            {IMAGE_STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => { setImageStyle(s.id); setShowImageStyles(false); }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border transition-colors",
                  imageStyle === s.id ? "bg-primary/20 border-primary text-white" : "border-border text-foreground/70 hover:border-primary/50 hover:text-white"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Container */}
      <div className={cn(
        "relative bg-secondary/60 border border-border rounded-3xl transition-all duration-200 input-glow overflow-hidden",
        isListening && "border-red-500/50"
      )}>
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening ? "🎤 Dinleniyor..." :
            mode === 'researcher' ? "Araştırmak istediğin konuyu yaz..." :
            mode === 'coder' ? "Yazmamı istediğin kodu anlat..." :
            mode === 'designer' ? "Tasarım veya görsel isteğini yaz..." :
            mode === 'multi' ? "Karmaşık görevini anlat..." :
            "Omega'ya bir şey sor..."
          }
          disabled={isListening}
          className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 resize-none outline-none px-5 pt-4 pb-2 max-h-[180px] text-[15px] leading-relaxed"
          rows={1}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-1">
            {/* Mode selector */}
            <button
              onClick={() => { setShowModes(!showModes); setShowImageStyles(false); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                showModes ? "bg-primary/20 border-primary text-white" : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-white"
              )}
            >
              <span>{activeMode.icon}</span>
              <span>{activeMode.label}</span>
              <ChevronUp className={cn("w-3 h-3 transition-transform", showModes && "rotate-180")} />
            </button>

            {/* Image style */}
            <button
              onClick={() => { setShowImageStyles(!showImageStyles); setShowModes(false); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                isImageRequest ? "border-pink-500/50 text-pink-400 bg-pink-500/10" : "border-border/60 text-muted-foreground hover:border-pink-500/40 hover:text-pink-300"
              )}
              title="Görsel stili seç"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{IMAGE_STYLES.find(s => s.id === imageStyle)?.label || '🖼️'}</span>
            </button>

            {/* Voice input */}
            <button
              onClick={toggleVoice}
              className={cn(
                "p-1.5 rounded-full border transition-all",
                isListening ? "border-red-500 text-red-400 bg-red-500/10 animate-pulse-soft" : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-white"
              )}
              title={isListening ? "Durdur" : "Sesle yaz"}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {/* Video generate */}
            {onVideoGenerate && (
              <button
                onClick={() => {
                  if (input.trim()) {
                    onVideoGenerate(input.trim());
                    setInput('');
                  } else {
                    onVideoGenerate('');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-pink-500/40 text-pink-400 hover:bg-pink-500/10 transition-all"
                title="Video üret"
              >
                <Film className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Video</span>
              </button>
            )}
          </div>

          {/* Send / Stop button */}
          <div>
            {isStreaming || isGeneratingImage ? (
              <button
                onClick={onStop}
                className="w-9 h-9 rounded-full bg-foreground/10 hover:bg-foreground/20 border border-border flex items-center justify-center transition-all"
                title="Durdur"
              >
                <Square className="w-4 h-4 text-foreground fill-foreground" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                  input.trim()
                    ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30"
                    : "bg-secondary text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                {isImageRequest
                  ? <Sparkles className="w-4 h-4" />
                  : <Send className="w-4 h-4 ml-0.5" />
                }
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground/40 mt-2">
        Omega yanlış bilgi verebilir. Önemli konularda doğrulayın.
      </p>
    </div>
  );
}
