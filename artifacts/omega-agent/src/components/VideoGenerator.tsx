import React, { useState, useRef, useEffect } from 'react';
import { Film, Play, Pause, ChevronLeft, ChevronRight, Download, Loader2, Sparkles, Music, Clock, Zap, Star, Coins } from 'lucide-react';
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
  { value: '15', label: '15 sn', credits: 25 },
  { value: '30', label: '30 sn', credits: 50 },
  { value: '60', label: '1 dk', credits: 100 },
  { value: '120', label: '2 dk', credits: 200 },
];

const LTX_DURATIONS = [
  { value: '5', label: '5 sn', credits: 15 },
  { value: '10', label: '10 sn', credits: 25 },
  { value: '30', label: '30 sn', credits: 50 },
  { value: '60', label: '1 dk', credits: 100 },
];

const DEFAULT_CREDITS = 300;
const CREDITS_KEY = 'omega_video_credits';

function getCredits(): number {
  try {
    const raw = localStorage.getItem(CREDITS_KEY);
    if (raw === null) {
      localStorage.setItem(CREDITS_KEY, String(DEFAULT_CREDITS));
      return DEFAULT_CREDITS;
    }
    return Number(raw);
  } catch {
    return DEFAULT_CREDITS;
  }
}

function setCredits(val: number) {
  try {
    localStorage.setItem(CREDITS_KEY, String(Math.max(0, val)));
  } catch {}
}

function deductCredits(amount: number): boolean {
  const current = getCredits();
  if (current < amount) return false;
  setCredits(current - amount);
  return true;
}

function refundCredits(amount: number) {
  setCredits(getCredits() + amount);
}

type Mode = 'storyboard' | 'ltx';

export function VideoGenerator({ prompt: initialPrompt, onClose }: VideoGeneratorProps) {
  const [mode, setMode] = useState<Mode>('ltx');
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [style, setStyle] = useState('cinematic');
  const [duration, setDuration] = useState('10');
  const [ltxQuality, setLtxQuality] = useState<'fast' | 'pro'>('fast');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [scenes, setScenes] = useState<VideoScene[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [credits, setCreditsState] = useState<number>(DEFAULT_CREDITS);
  const [creditError, setCreditError] = useState('');
  const playIntervalRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setCreditsState(getCredits());
  }, []);

  const refreshCredits = () => setCreditsState(getCredits());

  const currentDurations = mode === 'ltx' ? LTX_DURATIONS : DURATIONS;
  const selectedDuration = currentDurations.find(d => d.value === duration) ?? currentDurations[0];

  const generateLtx = async () => {
    if (!prompt.trim()) return;
    setCreditError('');

    const cost = selectedDuration.credits;
    if (!deductCredits(cost)) {
      setCreditError(`Yeterli kredi yok. Gereken: ${cost}, Mevcut: ${credits}`);
      return;
    }
    refreshCredits();

    setIsGenerating(true);
    setVideoUrl(null);
    setProgress(0);
    setStatus('LTX Video başlatılıyor...');

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const params = new URLSearchParams({
        prompt: prompt.trim(),
        duration: selectedDuration.value,
        quality: ltxQuality,
      });

      const res = await fetch(`/api/ltx/generate?${params}`, { signal: ctrl.signal });

      if (!res.ok || !res.body) {
        throw new Error(`Sunucu hatası: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.step === 'complete') {
              setProgress(100);
              setVideoUrl(data.videoUrl);
              setStatus('Video hazır!');
              setIsGenerating(false);
            } else if (data.step === 'error') {
              throw new Error(data.error ?? 'Bilinmeyen hata');
            } else {
              if (data.message) setStatus(data.message);
              if (typeof data.progress === 'number') setProgress(data.progress);
            }
          } catch (parseErr: any) {
            if (parseErr?.message && !parseErr.message.includes('JSON')) {
              throw parseErr;
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        refundCredits(cost);
        refreshCredits();
        setStatus('İptal edildi. Krediniz iade edildi.');
      } else {
        refundCredits(cost);
        refreshCredits();
        setStatus('Hata: ' + (err?.message ?? 'Bağlantı sorunu'));
      }
      setIsGenerating(false);
    }
  };

  const generateStoryboard = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setVideoData(null);
    setScenes([]);
    setVideoUrl(null);
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
            } else if (data.step === 'rendering') {
              setStatus(data.message || 'Video birleştiriliyor...');
              setProgress(95);
            } else if (data.step === 'complete') {
              setProgress(100);
              if (data.videoUrl) {
                setVideoUrl(data.videoUrl);
                setStatus('Video hazır!');
              } else {
                setStatus('Sahneler hazır');
              }
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

  const generate = () => {
    if (mode === 'ltx') generateLtx();
    else generateStoryboard();
  };

  const cancelGeneration = () => {
    abortRef.current?.abort();
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
    text += `Süre: ${videoData.totalDuration} saniye | Stil: ${videoData.style}\n\n---\n\n`;
    scenes.forEach(s => {
      text += `## Sahne ${s.id}: ${s.title}\nSüre: ${s.duration}s\nAnlatım: ${s.narration}\nMüzik: ${s.music || '-'}\nGörsel: ${s.visualPrompt}\n\n`;
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoData.title || 'video-script'}.txt`;
    a.click();
  };

  const resetToSetup = () => {
    setVideoData(null);
    setScenes([]);
    setVideoUrl(null);
    setStatus('');
    setProgress(0);
    setIsGenerating(false);
  };

  const isLtxDone = mode === 'ltx' && videoUrl && !isGenerating;
  const showSetup = mode === 'storyboard' ? !videoData : !isLtxDone;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && !isGenerating && onClose()}
    >
      <div className="bg-card border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(240,151,46,0.14)', border: '1px solid rgba(240,151,46,0.28)' }}>
              <Film className="w-5 h-5" style={{ color: '#F0972E' }} />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Video Üretici</h2>
              <p className="text-xs text-muted-foreground">AI ile gerçek video veya storyboard oluştur</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Credits */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-medium text-yellow-300">{credits} kredi</span>
            </div>
            {!isGenerating && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-white transition-colors text-xl"
              >×</button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showSetup ? (
            <div className="p-6 space-y-5">
              {/* Mode Tabs */}
              <div className="flex gap-2 p-1 bg-secondary rounded-2xl">
                <button
                  onClick={() => { setMode('ltx'); setDuration('10'); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={mode === 'ltx'
                    ? { background: '#F0972E', color: '#0A0A0A', boxShadow: '0 2px 12px rgba(240,151,46,0.35)' }
                    : { color: '#666' }}
                >
                  <Zap className="w-4 h-4" />
                  Gerçek Video (LTX AI)
                </button>
                <button
                  onClick={() => { setMode('storyboard'); setDuration('30'); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={mode === 'storyboard'
                    ? { background: '#F0972E', color: '#0A0A0A', boxShadow: '0 2px 12px rgba(240,151,46,0.35)' }
                    : { color: '#666' }}
                >
                  <Film className="w-4 h-4" />
                  Storyboard
                </button>
              </div>

              {mode === 'ltx' && (
                <div className="rounded-2xl px-4 py-3 text-xs" style={{ background: 'rgba(240,151,46,0.08)', border: '1px solid rgba(240,151,46,0.18)', color: '#C8882A' }}>
                  LTX-Video 2.3 ile gerçek yapay zeka videosu — 1080p, 10 sn'ye kadar
                </div>
              )}

              {/* Prompt */}
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">
                  {mode === 'ltx' ? 'Video sahnesi tarifi' : 'Video konusu'}
                </label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={
                    mode === 'ltx'
                      ? 'Örn: A majestic eagle soaring over mountain peaks at golden hour, cinematic shot...'
                      : 'Örn: Türkiye\'nin tarihi yerlerini gösteren bir belgesel...'
                  }
                  className="w-full bg-secondary border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary/50 resize-none min-h-[80px]"
                  rows={3}
                />
              </div>

              {/* Style (storyboard only) */}
              {mode === 'storyboard' && (
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
              )}

              {/* Quality (ltx only) */}
              {mode === 'ltx' && (
                <div>
                  <label className="text-sm font-medium mb-2 block text-muted-foreground">Kalite</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLtxQuality('fast')}
                      className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border transition-all",
                        ltxQuality === 'fast' ? "bg-primary/20 border-primary text-white" : "border-border text-muted-foreground hover:border-primary/50")}
                    >
                      <Zap className="w-3.5 h-3.5" /> Hızlı
                    </button>
                    <button
                      onClick={() => setLtxQuality('pro')}
                      className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border transition-all",
                        ltxQuality === 'pro' ? "bg-primary/20 border-primary text-white" : "border-border text-muted-foreground hover:border-primary/50")}
                    >
                      <Star className="w-3.5 h-3.5" /> Pro Kalite
                    </button>
                  </div>
                </div>
              )}

              {/* Duration */}
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Süre</label>
                <div className="flex gap-2 flex-wrap">
                  {currentDurations.map(d => (
                    <button key={d.value} onClick={() => setDuration(d.value)}
                      className={cn("px-4 py-2 rounded-full text-sm border transition-all flex items-center gap-1.5",
                        duration === d.value ? "bg-primary/20 border-primary text-white" : "border-border text-muted-foreground hover:border-primary/50")}
                    >
                      {d.label}
                      {mode === 'ltx' && <span className="text-[10px] opacity-60">{d.credits}kr</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Credit error */}
              {creditError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                  {creditError}
                </div>
              )}

              {/* Progress */}
              {isGenerating && (
                <div className="bg-secondary rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground flex-1">{status}</span>
                    {mode === 'ltx' && (
                      <button
                        onClick={cancelGeneration}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                      >İptal</button>
                    )}
                  </div>
                  <div className="w-full bg-border rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ background: 'linear-gradient(90deg,#FFCA6A,#F0972E)', width: `${progress}%` }}
                    />
                  </div>
                  {mode === 'ltx' && (
                    <p className="text-[11px] text-muted-foreground/60 mt-2">
                      LTX AI videoyu işliyor — bu işlem birkaç dakika sürebilir
                    </p>
                  )}
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={generate}
                disabled={!prompt.trim() || isGenerating}
                className={cn(
                  "w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all",
                  !prompt.trim() || isGenerating
                    ? "bg-secondary text-muted-foreground cursor-not-allowed"
                    : "text-[#0A0A0A] shadow-lg"
                )}
                style={!prompt.trim() || isGenerating ? {} : {
                  background: 'linear-gradient(135deg, #FFCA6A 0%, #F0972E 50%, #C46B14 100%)',
                  boxShadow: '0 4px 20px rgba(240,151,46,0.40)'
                }}
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Üretiliyor...</>
                  : mode === 'ltx'
                    ? <><Zap className="w-4 h-4" />Video Üret ({selectedDuration.credits} kredi)</>
                    : <><Sparkles className="w-4 h-4" />Storyboard Oluştur</>
                }
              </button>
            </div>
          ) : mode === 'ltx' ? (
            /* LTX video result */
            <div className="p-6 space-y-4">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-border">
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {videoUrl && (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-[#0A0A0A] text-sm font-semibold transition-colors"
                    style={{ background: 'linear-gradient(135deg,#FFCA6A,#F0972E,#C46B14)', boxShadow:'0 2px 14px rgba(240,151,46,0.35)' }}
                  >
                    <Download className="w-4 h-4" />
                    İndir / Aç
                  </a>
                )}
                <button
                  onClick={resetToSetup}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-border text-muted-foreground hover:text-white hover:border-primary/50 text-sm font-medium transition-colors"
                >
                  Yeni Video
                </button>
              </div>
            </div>
          ) : (
            /* Storyboard viewer */
            <div className="flex flex-col lg:flex-row h-full">
              <div className="lg:w-7/12 p-4 space-y-3">
                <div className="aspect-video bg-black rounded-2xl overflow-hidden relative border border-border">
                  {videoUrl ? (
                    <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain bg-black" />
                  ) : scenes[currentFrame]?.imageUrl ? (
                    <img src={scenes[currentFrame].imageUrl} alt={scenes[currentFrame].title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    </div>
                  )}
                  {!videoUrl && (
                    <>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        <p className="text-white text-sm font-medium">{scenes[currentFrame]?.title}</p>
                        <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{scenes[currentFrame]?.narration}</p>
                      </div>
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs text-white font-mono">
                        {currentFrame + 1} / {scenes.length}
                      </div>
                    </>
                  )}
                </div>

                {videoUrl && (
                  <a
                    href={videoUrl}
                    download="omega-video.mp4"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-[#0A0A0A] text-sm font-semibold transition-colors"
                    style={{ background: 'linear-gradient(135deg,#FFCA6A,#F0972E,#C46B14)', boxShadow:'0 2px 14px rgba(240,151,46,0.35)' }}
                  >
                    <Download className="w-4 h-4" />
                    MP4 Olarak İndir
                  </a>
                )}

                {!videoUrl && (
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
                )}

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

              <div className="lg:w-5/12 border-t lg:border-t-0 lg:border-l border-border overflow-y-auto max-h-[60vh] lg:max-h-full">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-sm">{videoData?.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{videoData?.totalDuration}s</span>
                    <span className="flex items-center gap-1"><Music className="w-3 h-3" />{videoData?.soundtrack || '-'}</span>
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
