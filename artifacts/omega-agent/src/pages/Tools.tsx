import React from 'react';
import { Globe, Code2, Film, Image, FileText, Database } from 'lucide-react';

const TOOLS = [
  { icon: Globe,    name: 'Web Search',       desc: 'Search the web in real time.',           active: true  },
  { icon: Code2,    name: 'Code Interpreter', desc: 'Run and debug code snippets.',           active: true  },
  { icon: Image,    name: 'Image Generation', desc: 'Generate visuals with AI.',              active: true  },
  { icon: Film,     name: 'Video AI (LTX)',   desc: 'Create real AI videos with LTX Studio.', active: true  },
  { icon: FileText, name: 'Document Reader',  desc: 'Parse PDF, Word, Excel files.',          active: true  },
  { icon: Database, name: 'Memory',           desc: 'Long-term conversation memory.',         active: false },
];

export default function ToolsPage() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8" style={{ background: '#0A0A0A' }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-lg font-display font-semibold mb-1" style={{ color: '#E0E0E0' }}>Tools</h1>
        <p className="text-[13px] mb-6" style={{ color: '#555' }}>Manage the tools available to your agents.</p>

        <div className="space-y-2">
          {TOOLS.map((t, i) => {
            const Icon = t.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl transition-all"
                style={{ background: '#111', border: '1px solid #1E1E1E' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#141414')}
                onMouseLeave={e => (e.currentTarget.style.background = '#111')}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: t.active ? 'rgba(212,137,58,0.1)' : '#1A1A1A', border: `1px solid ${t.active ? 'rgba(212,137,58,0.2)' : '#252525'}` }}>
                  <Icon className="w-4 h-4" style={{ color: t.active ? '#D4893A' : '#444' }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: t.active ? '#D0D0D0' : '#555' }}>{t.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#444' }}>{t.desc}</div>
                </div>
                {/* Toggle */}
                <div
                  className="relative w-9 h-5 rounded-full transition-all flex-shrink-0 cursor-pointer"
                  style={{ background: t.active ? '#D4893A' : '#222', border: `1px solid ${t.active ? '#D4893A' : '#2A2A2A'}` }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                    style={{ background: '#fff', left: t.active ? 'calc(100% - 18px)' : '2px' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
