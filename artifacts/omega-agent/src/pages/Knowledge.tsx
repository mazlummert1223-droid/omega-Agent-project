import React, { useState } from 'react';
import { Plus, FileText, Globe, FileSpreadsheet, File } from 'lucide-react';

const SOURCES = [
  { icon: FileText,        name: 'Market Research Report.pdf',  meta: 'PDF • Added 2 days ago',  color: '#ef4444' },
  { icon: FileSpreadsheet, name: 'Competitive Analysis.xlsx',   meta: 'XLS • Added 5 days ago',  color: '#22c55e' },
  { icon: FileText,        name: 'Product Roadmap.docx',        meta: 'DOCX • Added 1 week ago', color: '#3b82f6' },
  { icon: Globe,           name: 'Industry Trends 2024',        meta: 'Web Link • Added 1 week', color: '#888'    },
  { icon: File,            name: 'Company Guidelines.pdf',      meta: 'PDF • Added 2 weeks ago', color: '#ef4444' },
];

const TABS = ['All', 'Documents', 'Web Links', 'Files'];

export default function KnowledgePage() {
  const [tab, setTab] = useState('All');

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8" style={{ background: '#0A0A0A' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-display font-semibold" style={{ color: '#E0E0E0' }}>Knowledge</h1>
            <p className="text-[13px] mt-0.5" style={{ color: '#555' }}>Organize and manage your knowledge sources.</p>
          </div>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
            style={{ background: '#161616', border: '1px solid #282828', color: '#888' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,137,58,0.35)';
              (e.currentTarget as HTMLElement).style.color = '#D4893A';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#282828';
              (e.currentTarget as HTMLElement).style.color = '#888';
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Source
          </button>
        </div>

        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={tab === t
                ? { background: '#1E1E1E', color: '#D4893A', border: '1px solid #2A2A2A' }
                : { background: 'transparent', color: '#555', border: '1px solid transparent' }
              }
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          {SOURCES.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-3.5 p-3.5 rounded-xl transition-all cursor-pointer"
                style={{ background: '#111', border: '1px solid #1A1A1A' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#161616'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#111'; }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}
                >
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium truncate" style={{ color: '#CCC' }}>{s.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#444' }}>{s.meta}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
