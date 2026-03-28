import React, { useState, useRef } from 'react';
import { Film, Play, Pause, ChevronLeft, ChevronRight, Download, Loader2, Sparkles, Music, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoScene {
  id: number;
  title: string;
  visualPrompt: string;
  narration: string;
  duration: number;
  music?: string;
  transition?: string;
  imageUrl?: string;
}

interface VideoData {
  title: string;
  description: string;
  totalDuration: number;
  style: string;
  scenes: VideoScene[];
  soundtrack?: string;
  voiceover?: string;
}

interface VideoGeneratorProps {
  prompt: string;
  onClose: () => void;
}

const STYLES = [
  { id: 'cinematic', label: '🎬 Sinematik' },
  { id: 'anime', label: '🎌 Anime' },
  { id: 'documentary', label: '📽️ Belgesel' },
  { id: 'commercial', label: '📺 Reklam' },
  { id: 'music-video', label: '🎵 Müzik Videosu' },
];

const DURATIONS = [
  { value: '15', label: '15 sn' },
  { value: '30', label: '30 sn' },
  { value: '60', label: '1 dk' },
  { value: '120', label: '2 dk' },
];

export function VideoGenerator({ prompt: initialPrompt, onClose }: VideoGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [style, setStyle] = useState('cinematic');
  const [duration, setDuration] = useState('30');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [scenes, setScenes] = useState<VideoScene[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const playIntervalRef = useRef<any>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setVideoData(null);
    setScenes([]);
    setCurrentFrame(0);
    setProgress(0);
    setStatus('Script oluşturuluyor...');

    try {
      const response = await fetch('/api/video/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), style, duration }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.step === 'script' && data.status === 'done') {
              setVideoData(data.data);
              setStatus(`Script hazır! ${data.data.scenes?.length} sahne bulundu. Görseller üretiliyor...`);
            } else if (data.step === 'frame') {
              if (data.status === 'generating') {
                setStatus(`Sahne ${data.index + 1}/${data.total} görseli üretiliyor...`);
                setProgress(Math.round((data.index / data.total) * 100));
              } else if (data.status === 'done' && data.scene) {
                const newScene = { ...data.scene, imageUrl: data.imageUrl };
                setScenes(prev => {
                  const exists = prev.findIndex(s => s.id === newScene.id);
                  if (exists >= 0) {
                    const arr = [...prev];
                    arr[exists] = newScene;
                    return arr;
                  }
                  return [...prev, newScene];
                });
              }
            } else if (data.step === 'complete') {
              setProgress(100);
              setStatus('Video hazır!');
              setIsGenerating(false);
            } else if (data.error) {
              setStatus('Hata: ' + data.error);
              setIsGenerating(false);
            }
          } catch {}
        }
      }
    } catch {
      setStatus('Bağlantı hatası. Tekrar dene.');
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!scenes.length) return;
    if (isPlaying) {
      clearInterval(playIntervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playIntervalRef.current = setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= scenes.length - 1) {
            clearInterval(playIntervalRef.current);
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 2000);
    }
  };

  const downloadScript = () => {
    if (!videoData) return;
    let text = `# ${videoData.title}\n\n${videoData.description}\n\n`;
    text += `Süre: ${videoData.totalDuration} saniye | Stil: ${videoData.style}\n\n`;
    text += `---\n\n`;
    scenes.forEach(s => {
      text += `## Sahne ${s.id}: ${s.title}\n`;
      text += `Süre: ${s.duration}s\n`;
      text += `Anlatım: ${s.narration}\n`;
      text += `Müzik: ${s.music || '-'}\n`;
      text += `Görsel: ${s.visualPrompt}\n\n`;
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoData.title || 'video-script'}.txt`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center">
              <Film className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Video Üretici</h2>
              <p className="text-xs text-muted-foreground">AI ile video script ve storyboard oluştur</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-white transition-colors text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!videoData ? (
            /* Setup */
            <div className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Video konusu</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Örn: Türkiye'nin tarihi yerlerini gösteren bir belgesel, karanlık bir bilim kurgu hikayesi..."
                  className="w-full bg-secondary border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary/50 resize-none min-h-[80px]"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Video stili</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <button key={s.id} onClick={() => setStyle(s.id)}
                      className={cn("px-3 py-2 rounded-full text-sm border transition-all",
                        style === s.id ? "bg-primary/20 border-primary text-white" : "border-border text-muted-foreground hover:border-primary/50")}
                    >{s.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Süre</label>
                <div className="flex gap-2">
                  {DURATIONS.map(d => (
                    <button key={d.value} onClick={() => setDuration(d.value)}
                      className={cn("px-4 py-2 rounded-full text-sm border transition-all",
                        duration === d.value ? "bg-primary/20 border-primary text-white" : "border-border text-muted-foreground hover:border-primary/50")}
                    >{d.label}</button>
                  ))}
                </div>
              </div>

              {isGenerating && (
                <div className="bg-secondary rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">{status}</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-primary to-pink-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <button
                onClick={generate}
                disabled={!prompt.trim() || isGenerating}
                className={cn(
                  "w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all",
                  !prompt.trim() || isGenerating
                    ? "bg-secondary text-muted-foreground cursor-not-allowed"
                    : "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg"
                )}
              >
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Üretiliyor...</> : <><Sparkles className="w-4 h-4" />Video Üret</>}
              </button>
            </div>
          ) : (
            /* Video viewer */
            <div className="flex flex-col lg:flex-row h-full">
              {/* Video player */}
              <div className="lg:w-7/12 p-4 space-y-3">
                <div className="aspect-video bg-black rounded-2xl overflow-hidden relative border border-border">
                  {scenes[currentFrame]?.imageUrl ? (
                    <img src={scenes[currentFrame].imageUrl} alt={scenes[currentFrame].title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    </div>
                  )}
                  {/* Overlay info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white text-sm font-medium">{scenes[currentFrame]?.title}</p>
                    <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{scenes[currentFrame]?.narration}</p>
                  </div>
                  {/* Frame counter */}
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs text-white font-mono">
                    {currentFrame + 1} / {scenes.length}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))} disabled={currentFrame === 0} className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-white disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={togglePlay} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors">
                    {isPlaying ? <><Pause className="w-4 h-4" />Durdur</> : <><Play className="w-4 h-4" />Oynat</>}
                  </button>
                  <button onClick={() => setCurrentFrame(Math.min(scenes.length - 1, currentFrame + 1))} disabled={currentFrame >= scenes.length - 1} className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-white disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button onClick={downloadScript} className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-white transition-colors" title="Script indir">
                    <Download className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress bar */}
                {isGenerating && (
                  <div className="bg-secondary rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">{status}</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1">
                      <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Scene list */}
              <div className="lg:w-5/12 border-t lg:border-t-0 lg:border-l border-border overflow-y-auto max-h-[60vh] lg:max-h-full">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-sm">{videoData.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{videoData.totalDuration}s</span>
                    <span className="flex items-center gap-1"><Music className="w-3 h-3" />{videoData.soundtrack || '-'}</span>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {scenes.map((scene, i) => (
                    <button key={i} onClick={() => setCurrentFrame(i)}
                      className={cn("w-full flex gap-3 p-3 text-left hover:bg-secondary/60 transition-colors",
                        currentFrame === i && "bg-primary/10")}
                    >
                      <div className="w-16 h-10 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                        {scene.imageUrl
                          ? <img src={scene.imageUrl} alt={scene.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-3 h-3 text-muted-foreground animate-spin" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium truncate", currentFrame === i ? "text-primary" : "text-foreground/80")}>
                          {i + 1}. {scene.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{scene.narration}</p>
                        <span className="text-[10px] text-muted-foreground/60">{scene.duration}s</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
