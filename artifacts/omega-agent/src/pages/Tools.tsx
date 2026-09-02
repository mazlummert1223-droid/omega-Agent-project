import React, { useEffect, useState } from 'react';
import { Globe, Code2, Film, Image, FileText, Database, Check } from 'lucide-react';
import { toast } from 'sonner';

const TOOLS = [
  { id: 'web', icon: Globe,    name: 'Web Search',       desc: 'Search the web in real time.',           active: true  },
  { id: 'code', icon: Code2,   name: 'Code Interpreter', desc: 'Run and debug code snippets.',           active: true  },
  { id: 'image', icon: Image,  name: 'Image Generation', desc: 'Generate visuals with AI.',              active: true  },
  { id: 'video', icon: Film,   name: 'Video AI (LTX)',   desc: 'Create real AI videos with LTX Studio.', active: true  },
  { id: 'files', icon: FileText,name: 'Document Reader',  desc: 'Parse PDF, Word, Excel files.',          active: true  },
  { id: 'memory',icon: Database,name: 'Memory',           desc: 'Long-term conversation memory.',         active: false },
];

const TOOLS_KEY = 'omega_enabled_tools';

export default function ToolsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(TOOLS_KEY) || 'null');
      return saved || Object.fromEntries(TOOLS.map(t => [t.id, t.active]));
    } catch {
      return Object.fromEntries(TOOLS.map(t => [t.id, t.active]));
    }
  });

  useEffect(() => {
    localStorage.setItem(TOOLS_KEY, JSON.stringify(enabled));
  }, [enabled]);

  const toggle = (id: string) => {
    const next = !enabled[id];
    setEnabled(prev => ({ ...prev, [id]: next }));
    toast.success(`${TOOLS.find(t => t.id === id)?.name}: ${next ? 'açıldı' : 'kapatıldı'}`);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8" style={{ background: '#0A0A0A' }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-lg font-display font-semibold mb-1" style={{ color: '#E0E0E0' }}>Tools</h1>
        <p className="text-[13px] mb-6" style={{ color: '#555' }}>Manage the tools available to your agents.</p>

        <div className="space-y-2">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const active = Boolean(enabled[t.id]);
            return (
              <div
                key={t.id}
                className="flex items-center gap-4 p-4 rounded-xl transition-all"
                style={{ background: '#111', border: '1px solid #1E1E1E' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#141414')}
                onMouseLeave={e => (e.currentTarget.style.background = '#111')}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: active ? 'rgba(240,151,46,0.1)' : '#1A1A1A', border: `1px solid ${active ? 'rgba(240,151,46,0.2)' : '#252525'}` }}>
                  <Icon className="w-4 h-4" style={{ color: active ? '#F0972E' : '#444' }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: active ? '#D0D0D0' : '#555' }}>{t.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#444' }}>{t.desc}</div>
                </div>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={`${t.name} ${active ? 'kapat' : 'aç'}`}
                  onClick={() => toggle(t.id)}
                  className="relative w-9 h-5 rounded-full transition-all flex-shrink-0 cursor-pointer"
                  style={{ background: active ? '#F0972E' : '#222', border: `1px solid ${active ? '#F0972E' : '#2A2A2A'}` }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                    style={{ background: '#fff', left: active ? 'calc(100% - 18px)' : '2px' }}
                  />
                  {active && <Check className="absolute left-1 top-1 w-3 h-3 opacity-0" aria-hidden="true" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
