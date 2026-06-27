import React from 'react';
import { Plus, Search, PenLine, BarChart2, Briefcase } from 'lucide-react';

const AGENTS = [
  { icon: Search,    name: 'Research Agent',   desc: 'Specialized in deep research and analysis.' },
  { icon: PenLine,   name: 'Content Agent',    desc: 'Creates high-quality content and copy.' },
  { icon: BarChart2, name: 'Data Analyst',     desc: 'Expert in data analysis and visualization.' },
  { icon: Briefcase, name: 'Project Manager',  desc: 'Helps with planning, tracking and coordination.' },
];

export default function AgentsPage() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8" style={{ background: '#0A0A0A' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-display font-semibold" style={{ color: '#E0E0E0' }}>Agents</h1>
            <p className="text-[13px] mt-0.5" style={{ color: '#555' }}>Create and manage your AI agents.</p>
          </div>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
            style={{ background: '#161616', border: '1px solid #282828', color: '#888' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(240,151,46,0.35)';
              (e.currentTarget as HTMLElement).style.color = '#F0972E';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#282828';
              (e.currentTarget as HTMLElement).style.color = '#888';
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            New Agent
          </button>
        </div>

        <div className="space-y-2">
          {AGENTS.map((a, i) => {
            const Icon = a.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer"
                style={{ background: '#111', border: '1px solid #1E1E1E' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#161616'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#111'; }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(240,151,46,0.1)', border: '1px solid rgba(240,151,46,0.2)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: '#F0972E' }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: '#D0D0D0' }}>{a.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#555' }}>{a.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
