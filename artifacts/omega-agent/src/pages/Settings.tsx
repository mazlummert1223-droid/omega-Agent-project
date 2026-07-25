import React, { useState } from 'react';
import {
  Paintbrush, Bell, Shield, Zap, CreditCard, Code2, Info,
  Sun, Moon, Monitor, ChevronRight
} from 'lucide-react';
import { signOut } from '@/lib/auth';
import { getUser } from '@/lib/auth';

const SECTIONS = [
  { id: 'general',     label: 'General',       Icon: Monitor  },
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
  const [theme, setTheme]     = useState<'dark' | 'light' | 'system'>('dark');
  const [lang, setLang]       = useState('English');
  const [tz, setTz]           = useState('(UTC+03:00) Istanbul');
  const [autoSave, setAutoSave]     = useState(true);
  const [confirmDel, setConfirmDel] = useState(false);
  const user = getUser();

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

        {section === 'appearance' && (
          <div className="max-w-lg animate-fade-up">
            <h3 className="text-[17px] font-display font-semibold mb-6" style={{ color: '#E8E8E8' }}>Appearance</h3>
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <p className="text-[13px] mb-2" style={{ color: '#888' }}>Font size, density, and display preferences will appear here in a future update.</p>
            </div>
          </div>
        )}

        {section === 'notifications' && (
          <div className="max-w-lg animate-fade-up">
            <h3 className="text-[17px] font-display font-semibold mb-6" style={{ color: '#E8E8E8' }}>Notifications</h3>
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <p className="text-[13px]" style={{ color: '#888' }}>Notification preferences coming soon.</p>
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
                onClick={() => { localStorage.clear(); window.location.reload(); }}
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
              <p className="text-[13px]" style={{ color: '#888' }}>LTX Video AI is connected and active. More integrations coming soon.</p>
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
              <p className="text-[13px]" style={{ color: '#888' }}>Billing management will be available in the full release.</p>
            </div>
          </div>
        )}

        {section === 'api' && (
          <div className="max-w-lg animate-fade-up">
            <h3 className="text-[17px] font-display font-semibold mb-6" style={{ color: '#E8E8E8' }}>API</h3>
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <p className="text-[13px]" style={{ color: '#888' }}>API access and key management will be available in the full release.</p>
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
