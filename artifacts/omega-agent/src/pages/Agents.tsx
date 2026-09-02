import React, { useState } from 'react';
import { Plus, Search, PenLine, BarChart2, Briefcase, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Agent = { id: string; name: string; desc: string; kind: 'built-in' | 'custom'; };
const BUILT_IN: Agent[] = [
  { id: 'research', name: 'Research Agent', desc: 'Specialized in deep research and analysis.', kind: 'built-in' },
  { id: 'content', name: 'Content Agent', desc: 'Creates high-quality content and copy.', kind: 'built-in' },
  { id: 'data', name: 'Data Analyst', desc: 'Expert in data analysis and visualization.', kind: 'built-in' },
  { id: 'project', name: 'Project Manager', desc: 'Helps with planning, tracking and coordination.', kind: 'built-in' },
];
const ICONS = [Search, PenLine, BarChart2, Briefcase];
const CUSTOM_KEY = 'omega_custom_agents';

export default function AgentsPage() {
  const [custom, setCustom] = useState<Agent[]>(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch { return []; }
  });
  const [selected, setSelected] = useState<Agent | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const all = [...BUILT_IN, ...custom];

  const saveAgent = () => {
    if (!name.trim()) { toast.error('Ajan adı gerekli'); return; }
    const agent = { id: `${Date.now()}`, name: name.trim(), desc: desc.trim() || 'Omega ile özel çalışma asistanı.', kind: 'custom' as const };
    const next = [agent, ...custom];
    setCustom(next);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
    setSelected(agent);
    setName('');
    setDesc('');
    setAdding(false);
    toast.success('Yeni ajan oluşturuldu');
  };

  const removeAgent = (agent: Agent) => {
    const next = custom.filter(item => item.id !== agent.id);
    setCustom(next);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
    if (selected?.id === agent.id) setSelected(null);
    toast.success('Ajan silindi');
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8" style={{ background: '#0A0A0A' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-display font-semibold" style={{ color: '#E0E0E0' }}>Agents</h1>
            <p className="text-[13px] mt-0.5" style={{ color: '#555' }}>Hazır ajanları kullanın veya kendi çalışma profilinizi oluşturun.</p>
          </div>
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
            style={{ background: '#161616', border: '1px solid #282828', color: '#888' }}>
            <Plus className="w-3.5 h-3.5" /> New Agent
          </button>
        </div>

        <div className="space-y-2">
          {all.map((agent, i) => {
            const Icon = ICONS[i % ICONS.length];
            const active = selected?.id === agent.id;
            return (
              <div key={agent.id} onClick={() => setSelected(agent)} className="flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer"
                style={{ background: active ? '#171717' : '#111', border: `1px solid ${active ? 'rgba(240,151,46,.35)' : '#1E1E1E'}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(240,151,46,0.1)', border: '1px solid rgba(240,151,46,0.2)' }}>
                  <Icon className="w-4 h-4" style={{ color: '#F0972E' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium" style={{ color: '#D0D0D0' }}>{agent.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#555' }}>{agent.desc}</div>
                </div>
                {agent.kind === 'custom' && (
                  <button onClick={e => { e.stopPropagation(); removeAgent(agent); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400" title="Ajanı sil">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="mt-4 rounded-xl p-4 text-sm" style={{ background: '#111', border: '1px solid #222' }}>
            <span style={{ color: '#F0972E' }}>{selected.name}</span>
            <span className="text-muted-foreground"> seçildi. Bu profili sohbet içinde kullanmak için OMEGA AGENT modunu açın.</span>
          </div>
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={e => e.target === e.currentTarget && setAdding(false)}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: '#151515', border: '1px solid #2A2A2A' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold" style={{ color: '#E0E0E0' }}>Yeni ajan</h2>
              <button onClick={() => setAdding(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ajan adı" autoFocus className="w-full rounded-xl px-3 py-2.5 bg-black/20 border border-border text-sm outline-none" />
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Bu ajan neye odaklanmalı?" rows={3} className="w-full rounded-xl px-3 py-2.5 bg-black/20 border border-border text-sm outline-none resize-none" />
              <button onClick={saveAgent} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#F0972E', color: '#0A0A0A' }}>Ajanı oluştur</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}