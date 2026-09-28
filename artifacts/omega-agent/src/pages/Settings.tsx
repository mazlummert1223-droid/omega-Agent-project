import React, { useEffect, useState } from 'react';
import {
  Paintbrush, Bell, Shield, Zap, CreditCard, Code2, Info,
  Sun, Moon, Monitor, ChevronRight, Volume2, Play, Square
} from 'lucide-react';
import { signOut } from '@/lib/auth';
import { getUser } from '@/lib/auth';
import { toast } from 'sonner';
import { OMEGA_VOICE_OPTIONS, type OmegaVoiceName } from '@/hooks/use-omega-voice';

const SECTIONS = [
  { id: 'general',     label: 'General',       Icon: Monitor  },
  { id: 'voice',       label: 'Omega Voice',   Icon: Volume2 },
  { id: 'appearance',  label: 'Appearance',    Icon: Paintbrush },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'privacy',     label: 'Data & Privacy', Icon: Shield  },
  { id: 'integrations',label: 'Integrations',  Icon: Zap     },
  { id: 'billing',     label: 'Billing',        Icon: CreditCard },
  { id: 'api',         label: 'API',            Icon: Code2   },
  { id: 'about',       label: 'About',          Icon: Info    },
];

function Toggle2({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="relative flex-shrink-0 w-9 h-5 rounded-full transition-all"
      style={{ background: on ? '#F0972E' : '#222', border: `1px solid ${on ? '#F0972E' : '#2E2E2E'}` }}>
      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: on ? 'calc(100% - 18px)' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
    </button>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState('general');
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => (localStorage.getItem('omega_theme') as any) || 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('omega_language') || 'English');
  const [tz, setTz] = useState(() => localStorage.getItem('omega_timezone') || '(UTC+03:00) Istanbul');
  const [autoSave, setAutoSave] = useState(() => localStorage.getItem('omega_autosave') !== 'false');
  const [confirmDel, setConfirmDel] = useState(() => localStorage.getItem('omega_confirm_delete') === 'true');
  const [notifications, setNotifications] = useState(() => localStorage.getItem('omega_notifications') !== 'false');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('omega_font_size') || 'medium');
  const [density, setDensity] = useState(() => localStorage.getItem('omega_density') || 'comfortable');
  const [voiceName, setVoiceName] = useState<OmegaVoiceName>(() => {
    const saved = localStorage.getItem('omega-voice-name');
    return OMEGA_VOICE_OPTIONS.some(option => option.id === saved) ? saved as OmegaVoiceName : 'onyx';
  });
  const [previewingVoice, setPreviewingVoice] = useState<OmegaVoiceName | null>(null);
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const user = getUser();

  useEffect(() => {
    localStorage.setItem('omega_theme', theme);
    localStorage.setItem('omega_language', lang);
    localStorage.setItem('omega_timezone', tz);
    localStorage.setItem('omega_autosave', String(autoSave));
    localStorage.setItem('omega_confirm_delete', String(confirmDel));
    localStorage.setItem('omega_notifications', String(notifications));
    localStorage.setItem('omega_font_size', fontSize);
    localStorage.setItem('omega_density', density);
    localStorage.setItem('omega-voice-name', voiceName);
    document.documentElement.dataset.omegaTheme = theme;
    document.documentElement.dataset.omegaFontSize = fontSize;
    document.documentElement.dataset.omegaDensity = density;
  }, [theme, lang, tz, autoSave, confirmDel, notifications, fontSize, density, voiceName]);

  const previewVoice = async (nextVoice: OmegaVoiceName) => {
    previewAudioRef.current?.pause();
    setPreviewingVoice(nextVoice);
    try {
      const response = await fetch('/api/openai/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: nextVoice,
          text: 'Merhaba. Ben Omega. Bu ses seçimini önizliyorsun.',
        }),
      });
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        previewAudioRef.current = null;
        setPreviewingVoice(null);
      };
      await audio.play();
    } catch {
      setPreviewingVoice(null);
      toast.error('Ses önizlemesi üretilemedi');
    }
  };

  useEffect(() => () => {
    previewAudioRef.current?.pause();
  }, []);

  const clearData = () => {
    if (confirmDel && !window.confirm('Tüm yerel sohbet, uygulama ve ayar verileri silinsin mi?')) return;
    localStorage.clear();
    toast.success('Yerel veriler temizlendi');
    window.location.reload();
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await fetch('/api/healthz');
      if (!response.ok) throw new Error();
      toast.success('API bağlantısı çalışıyor');
    } catch {
      toast.error('API bağlantısı kurulamadı');
    } finally {
      setTestingConnection(false);
    }
  };

  const copyApiPath = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/api`);
      toast.success('API adresi kopyalandı');
    } catch {
      toast.error('Kopyalama desteklenmiyor');
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex" style={{ background: '#0B0B0B' }}>
      {/* Left panel */}
      <div className="w-52 flex-shrink-0 flex flex-col py-6 px-3"
        style={{ borderRight: '1px solid #191919', background: '#0D0D0D' }}>
        <h2 className="px-3 mb-4 text-[12px] font-bold tracking-widest uppercase"
          style={{ color: '#3A3A3A', letterSpacing: '0.14em' }}>Settings</h2>
        <nav className="space-y-px">
          {SECTIONS.map(s => {
            const Icon = s.Icon;
            const active = section === s.id;
            return (
              <button key={s.id} onClick={() => setSection(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] text-left transition-all"
                style={{
                  background: active ? '#1C1C1C' : 'transparent',
                  color: active ? '#E0E0E0' : '#606060',
                  borderLeft: active ? '2px solid #F0972E' : '2px solid transparent',
                  fontWeight: active ? '500' : '400',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#161616'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Icon className="w-[15px] h-[15px]" style={{ color: active ? '#F0972E' : '#484848' }} />
                {s.label}
              </button>
            );
          })}
        </nav>
        <div className="flex-1" />
        <button onClick={() => { signOut(); window.location.reload(); }}
          className="mx-3 mt-4 px-3 py-2 rounded-lg text-[12px] text-center transition-all"
          style={{ background: '#161616', border: '1px solid #222', color: '#606060' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1E1E1E'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#161616'; (e.currentTarget as HTMLElement).style.color = '#606060'; }}
        >
          Sign Out
        </button>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto py-8 px-8">

        {section === 'general' && (
          <div className="max-w-lg space-y-6 animate-fade-up">
            <h3 className="text-[17px] font-display font-semibold" style={{ color: '#E8E8E8' }}>General</h3>

            {/* Theme */}
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <p className="text-[12px] font-semibold mb-3" style={{ color: '#888', letterSpacing: '0.06em' }}>THEME</p>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as const).map(t => {
                  const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
                  const active = theme === t;
                  return (
                    <button key={t} onClick={() => setTheme(t)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-medium transition-all capitalize"
                      style={{
                        background: active ? 'rgba(240,151,46,0.14)' : '#181818',
                        border: `1px solid ${active ? 'rgba(240,151,46,0.35)' : '#252525'}`,
                        color: active ? '#F0972E' : '#666',
                      }}>
                      <Icon className="w-3.5 h-3.5" />
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language */}
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <p className="text-[12px] font-semibold mb-3" style={{ color: '#888', letterSpacing: '0.06em' }}>LANGUAGE</p>
              <select value={lang} onChange={e => setLang(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none transition-all appearance-none"
                style={{ background: '#181818', border: '1px solid #252525', color: '#CCC' }}>
                {['English', 'Turkish', 'Spanish', 'French', 'German', 'Portuguese'].map(l => (
                  <option key={l} value={l} style={{ background: '#1A1A1A' }}>{l}</option>
                ))}
              </select>
            </div>

            {/* Timezone */}
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <p className="text-[12px] font-semibold mb-3" style={{ color: '#888', letterSpacing: '0.06em' }}>TIMEZONE</p>
              <select value={tz} onChange={e => setTz(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none transition-all appearance-none"
                style={{ background: '#181818', border: '1px solid #252525', color: '#CCC' }}>
                {[
                  '(UTC+03:00) Istanbul',
                  '(UTC+00:00) UTC',
                  '(UTC-05:00) New York',
                  '(UTC+01:00) London',
                  '(UTC+08:00) Singapore',
                ].map(z => (
                  <option key={z} value={z} style={{ background: '#1A1A1A' }}>{z}</option>
                ))}
              </select>
            </div>

            {/* Chat Preferences */}
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <p className="text-[12px] font-semibold mb-4" style={{ color: '#888', letterSpacing: '0.06em' }}>CHAT PREFERENCES</p>
              <div className="space-y-3.5">
                {[
                  { label: 'Auto-save conversations', val: autoSave, set: setAutoSave },
                  { label: 'Confirm before deleting', val: confirmDel, set: setConfirmDel },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[13px]" style={{ color: '#B0B0B0' }}>{item.label}</span>
                    <Toggle2 on={item.val} onChange={item.set} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === 'voice' && (
          <div className="max-w-lg animate-fade-up">
            <h3 className="text-[17px] font-display font-semibold mb-2" style={{ color: '#E8E8E8' }}>Omega Voice</h3>
            <p className="text-[13px] mb-6" style={{ color: '#666' }}>
              Sohbet yanıtlarının okunacağı sesi seç. Dinlemek için önizleme düğmesine bas.
            </p>
            <div className="rounded-2xl p-4 space-y-2" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              {OMEGA_VOICE_OPTIONS.map(option => {
                const active = voiceName === option.id;
                const playing = previewingVoice === option.id;
                return (
                  <div key={option.id} className="flex items-center gap-3 rounded-xl p-3 transition-all"
                    style={{ background: active ? 'rgba(240,151,46,0.10)' : '#181818', border: `1px solid ${active ? 'rgba(240,151,46,0.35)' : '#252525'}` }}>
                    <button onClick={() => setVoiceName(option.id)} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold" style={{ color: active ? '#F0972E' : '#CCC' }}>{option.label}</span>
                        {active && <span className="text-[9px] uppercase tracking-wider" style={{ color: '#F0972E' }}>Seçili</span>}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: '#666' }}>{option.description}</div>
                    </button>
                    <button onClick={() => {
                      if (playing) {
                        previewAudioRef.current?.pause();
                        previewAudioRef.current = null;
                        setPreviewingVoice(null);
                      } else {
                        void previewVoice(option.id);
                      }
                    }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: playing ? 'rgba(240,151,46,0.16)' : '#202020', border: '1px solid #2D2D2D', color: playing ? '#F0972E' : '#777' }}
                      title={playing ? 'Önizlemeyi durdur' : 'Sesi önizle'}>
                      {playing ? <Square className="w-3 h-3" fill="currentColor" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] mt-3" style={{ color: '#444' }}>
              Ses seçimi cihazında saklanır ve sohbet seslendirmelerinde otomatik kullanılır.
            </p>
          </div>
        )}

        {section === 'appearance' && (
          <div className="max-w-lg animate-fade-up">
            <h3 className="text-[17px] font-display font-semibold mb-6" style={{ color: '#E8E8E8' }}>Appearance</h3>
            <div className="rounded-2xl p-5 space-y-5" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <div>
                <p className="text-[12px] font-semibold mb-3" style={{ color: '#888', letterSpacing: '0.06em' }}>FONT SIZE</p>
                <div className="grid grid-cols-3 gap-2">
                  {['small', 'medium', 'large'].map(value => (
                    <button key={value} onClick={() => setFontSize(value)} className="py-2 rounded-lg text-xs capitalize"
                      style={{ background: fontSize === value ? 'rgba(240,151,46,.14)' : '#181818', color: fontSize === value ? '#F0972E' : '#777', border: `1px solid ${fontSize === value ? 'rgba(240,151,46,.3)' : '#252525'}` }}>
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[12px] font-semibold mb-3" style={{ color: '#888', letterSpacing: '0.06em' }}>DENSITY</p>
                <div className="grid grid-cols-2 gap-2">
                  {['comfortable', 'compact'].map(value => (
                    <button key={value} onClick={() => setDensity(value)} className="py-2 rounded-lg text-xs capitalize"
                      style={{ background: density === value ? 'rgba(240,151,46,.14)' : '#181818', color: density === value ? '#F0972E' : '#777', border: `1px solid ${density === value ? 'rgba(240,151,46,.3)' : '#252525'}` }}>
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'notifications' && (
          <div className="max-w-lg animate-fade-up">
            <h3 className="text-[17px] font-display font-semibold mb-6" style={{ color: '#E8E8E8' }}>Notifications</h3>
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <p className="text-[13px]" style={{ color: '#888' }}>Omega’nın üretim ve bağlantı durumları için tarayıcı bildirimleri.</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[13px]" style={{ color: '#B0B0B0' }}>Bildirimleri etkinleştir</span>
                <Toggle2 on={notifications} onChange={setNotifications} />
              </div>
            </div>
          </div>
        )}

        {section === 'privacy' && (
          <div className="max-w-lg animate-fade-up">
            <h3 className="text-[17px] font-display font-semibold mb-6" style={{ color: '#E8E8E8' }}>Data & Privacy</h3>
            <div className="rounded-2xl p-5 space-y-4" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <p className="text-[13px]" style={{ color: '#888' }}>
                All conversations are stored locally on your device. No data is sent to external servers beyond AI inference calls.
              </p>
              <button
                onClick={clearData}
                className="px-4 py-2 rounded-xl text-[12.5px] font-medium transition-all"
                style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', color: '#888' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A1414'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#1E1E1E'; (e.currentTarget as HTMLElement).style.color = '#888'; (e.currentTarget as HTMLElement).style.borderColor = '#2A2A2A'; }}
              >
                Clear all data
              </button>
            </div>
          </div>
        )}

        {section === 'integrations' && (
          <div className="max-w-lg animate-fade-up">
            <h3 className="text-[17px] font-display font-semibold mb-6" style={{ color: '#E8E8E8' }}>Integrations</h3>
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <p className="text-[13px]" style={{ color: '#888' }}>LTX Video AI sunucu tarafında yapılandırılır. Bu panel bağlantıyı test eder.</p>
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl" style={{ background: '#181818', border: '1px solid #252525' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(240,151,46,0.14)', border: '1px solid rgba(240,151,46,0.28)' }}>
                  <Zap className="w-4 h-4" style={{ color: '#F0972E' }} />
                </div>
                <div>
                  <div className="text-[12.5px] font-medium" style={{ color: '#CCC' }}>LTX Video</div>
                  <div className="text-[11px]" style={{ color: '#555' }}>Connected · Text-to-video AI</div>
                </div>
                <div className="ml-auto w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
              </div>
              <button onClick={testConnection} disabled={testingConnection} className="mt-3 w-full py-2.5 rounded-xl text-xs font-medium border border-border hover:border-primary/50 text-muted-foreground hover:text-white">
                {testingConnection ? 'Test ediliyor…' : 'Bağlantıyı test et'}
              </button>
            </div>
          </div>
        )}

        {section === 'billing' && (
          <div className="max-w-lg animate-fade-up">
            <h3 className="text-[17px] font-display font-semibold mb-6" style={{ color: '#E8E8E8' }}>Billing</h3>
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid #1C1C1C' }}>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold" style={{ color: '#E0E0E0' }}>Pro Plan</div>
                  <div className="text-[12px] mt-0.5" style={{ color: '#F0972E' }}>Active</div>
                </div>
              </div>
              <p className="text-[13px]" style={{ color: '#888' }}>LTX video kullanımı sağlayıcı hesabındaki bakiyeden düşer. Hesap ve kredi yönetimi LTX kontrol panelinden yapılır.</p>
              <a href="https://console.ltx.io" target="_blank" rel="noreferrer" className="inline-flex items-center mt-4 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', color: '#F0972E' }}>
                LTX panelini aç
              </a>
            </div>
          </div>
        )}

        {section === 'api' && (
          <div className="max-w-lg animate-fade-up">
            <h3 className="text-[17px] font-display font-semibold mb-6" style={{ color: '#E8E8E8' }}>API</h3>
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <p className="text-[13px]" style={{ color: '#888' }}>Yerel uygulama için kullanılabilir API kökü:</p>
              <div className="mt-3 flex items-center gap-2 rounded-xl p-3" style={{ background: '#181818', border: '1px solid #252525' }}>
                <code className="flex-1 text-xs text-muted-foreground truncate">{window.location.origin}/api</code>
                <button onClick={copyApiPath} className="px-2.5 py-1.5 rounded-lg text-xs text-primary hover:bg-primary/10">Kopyala</button>
              </div>
            </div>
          </div>
        )}

        {section === 'about' && (
          <div className="max-w-lg animate-fade-up">
            <h3 className="text-[17px] font-display font-semibold mb-6" style={{ color: '#E8E8E8' }}>About</h3>
            <div className="rounded-2xl p-5 space-y-3" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              {[
                { label: 'Version', value: '2.0.0' },
                { label: 'Build',   value: 'Production' },
                { label: 'AI Models', value: 'Omega Agent · Quantum · Origin' },
                { label: 'Video AI', value: 'LTX Studio 2.3' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid #181818' }}>
                  <span className="text-[12.5px]" style={{ color: '#666' }}>{item.label}</span>
                  <span className="text-[12.5px]" style={{ color: '#B0B0B0' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
