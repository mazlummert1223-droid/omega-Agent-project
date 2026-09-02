import React, { useMemo, useRef, useState } from 'react';
import { Plus, FileText, Globe, FileSpreadsheet, File, Trash2, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';

type Source = {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  url?: string;
  text?: string;
};

const STORAGE_KEY = 'omega_knowledge_sources';
const SEED: Source[] = [
  { id: 'seed-report', name: 'Market Research Report.pdf', type: 'PDF', createdAt: '2 gün önce' },
  { id: 'seed-excel', name: 'Competitive Analysis.xlsx', type: 'Excel', createdAt: '5 gün önce' },
  { id: 'seed-roadmap', name: 'Product Roadmap.docx', type: 'Word', createdAt: '1 hafta önce' },
  { id: 'seed-link', name: 'Industry Trends 2024', type: 'Web Link', createdAt: '1 hafta önce', url: 'https://en.wikipedia.org/wiki/Artificial_intelligence' },
  { id: 'seed-guidelines', name: 'Company Guidelines.pdf', type: 'PDF', createdAt: '2 hafta önce' },
];
const TABS = ['All', 'Documents', 'Web Links', 'Files'];

function loadSources(): Source[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return Array.isArray(value) ? value : SEED;
  } catch {
    return SEED;
  }
}

function iconFor(type: string) {
  if (type === 'Web Link') return { Icon: Globe, color: '#888' };
  if (type === 'Excel' || type === 'CSV') return { Icon: FileSpreadsheet, color: '#22c55e' };
  if (type === 'PDF') return { Icon: FileText, color: '#ef4444' };
  if (type === 'Word') return { Icon: FileText, color: '#3b82f6' };
  return { Icon: File, color: '#a855f7' };
}

function sourceTab(source: Source) {
  if (source.url) return 'Web Links';
  if (source.type === 'PDF' || source.type === 'Word' || source.type === 'PowerPoint') return 'Documents';
  return 'Files';
}

export default function KnowledgePage() {
  const [tab, setTab] = useState('All');
  const [sources, setSources] = useState<Source[]>(loadSources);
  const [selected, setSelected] = useState<Source | null>(null);
  const [adding, setAdding] = useState(false);
  const [sourceMode, setSourceMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const persist = (next: Source[]) => {
    setSources(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const filtered = useMemo(
    () => sources.filter(source => tab === 'All' || sourceTab(source) === tab),
    [sources, tab],
  );

  const addUrl = () => {
    try {
      const parsed = new URL(url.trim());
      const next: Source = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: name.trim() || parsed.hostname,
        type: 'Web Link',
        url: parsed.toString(),
        createdAt: 'az önce',
      };
      persist([next, ...sources]);
      setSelected(next);
      setAdding(false);
      setUrl('');
      setName('');
      toast.success('Web kaynağı eklendi');
    } catch {
      toast.error('Geçerli bir URL girin');
    }
  };

  const addFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const type = ext === 'pdf' ? 'PDF' : ext === 'docx' ? 'Word' : ext === 'xlsx' || ext === 'xls' ? 'Excel' : ext === 'csv' ? 'CSV' : 'File';
      const next: Source = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type,
        createdAt: 'az önce',
        text: typeof reader.result === 'string' ? reader.result.slice(0, 120000) : '',
      };
      persist([next, ...sources]);
      setSelected(next);
      setAdding(false);
      toast.success(`${file.name} bilgi bankasına eklendi`);
    };
    reader.readAsText(file);
  };

  const remove = (source: Source) => {
    persist(sources.filter(item => item.id !== source.id));
    if (selected?.id === source.id) setSelected(null);
    toast.success('Kaynak kaldırıldı');
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8" style={{ background: '#0A0A0A' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-display font-semibold" style={{ color: '#E0E0E0' }}>Knowledge</h1>
            <p className="text-[13px] mt-0.5" style={{ color: '#555' }}>Omega’nın kullanacağı yerel kaynakları ekleyin ve yönetin.</p>
          </div>
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
            style={{ background: '#161616', border: '1px solid #282828', color: '#888' }}>
            <Plus className="w-3.5 h-3.5" /> Add Source
          </button>
        </div>

        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: '#111', border: '1px solid #1E1E1E' }}>
          {TABS.map(item => (
            <button key={item} onClick={() => setTab(item)} className="flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={tab === item ? { background: '#1E1E1E', color: '#F0972E', border: '1px solid #2A2A2A' } : { color: '#555', border: '1px solid transparent' }}>
              {item}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_290px] gap-4">
          <div className="space-y-1.5">
            {filtered.length === 0 && <div className="rounded-xl p-8 text-center text-sm" style={{ background: '#111', color: '#555' }}>Bu kategoride kaynak yok.</div>}
            {filtered.map(source => {
              const { Icon, color } = iconFor(source.type);
              return (
                <button key={source.id} onClick={() => setSelected(source)} className="w-full flex items-center gap-3.5 p-3.5 rounded-xl text-left transition-all"
                  style={{ background: selected?.id === source.id ? '#171717' : '#111', border: `1px solid ${selected?.id === source.id ? 'rgba(240,151,46,0.3)' : '#1A1A1A'}` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium truncate" style={{ color: '#CCC' }}>{source.name}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#444' }}>{source.type} · {source.createdAt}</div>
                  </div>
                  {source.url && <ExternalLink className="w-3.5 h-3.5" style={{ color: '#555' }} />}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="rounded-2xl p-4 h-fit sticky top-2" style={{ background: '#111', border: '1px solid #222' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: '#DDD' }}>{selected.name}</p>
                  <p className="text-[11px] mt-1" style={{ color: '#555' }}>{selected.type}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-white/5" aria-label="Kapat"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
              </div>
              {selected.url ? (
                <a href={selected.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 text-xs" style={{ color: '#F0972E' }}>
                  <ExternalLink className="w-3.5 h-3.5" /> Kaynağı aç
                </a>
              ) : (
                <p className="mt-4 text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap" style={{ color: '#777' }}>
                  {selected.text || 'Bu dosya için önizlenebilir metin bulunmuyor.'}
                </p>
              )}
              <button onClick={() => remove(selected)} className="mt-4 flex items-center gap-2 text-xs text-red-400 hover:text-red-300">
                <Trash2 className="w-3.5 h-3.5" /> Kaynağı kaldır
              </button>
            </div>
          )}
        </div>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={e => e.target === e.currentTarget && setAdding(false)}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: '#151515', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: '#E0E0E0' }}>Kaynak ekle</h2>
              <button onClick={() => setAdding(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setSourceMode('url')} className="flex-1 py-2 rounded-lg text-xs" style={{ background: sourceMode === 'url' ? 'rgba(240,151,46,.15)' : '#1D1D1D', color: sourceMode === 'url' ? '#F0972E' : '#777' }}>Web linki</button>
              <button onClick={() => setSourceMode('file')} className="flex-1 py-2 rounded-lg text-xs" style={{ background: sourceMode === 'file' ? 'rgba(240,151,46,.15)' : '#1D1D1D', color: sourceMode === 'file' ? '#F0972E' : '#777' }}>Dosya</button>
            </div>
            {sourceMode === 'url' ? (
              <div className="space-y-3">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Kaynak adı (isteğe bağlı)" className="w-full rounded-xl px-3 py-2.5 bg-black/20 border border-border text-sm outline-none" />
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full rounded-xl px-3 py-2.5 bg-black/20 border border-border text-sm outline-none" autoFocus />
                <button onClick={addUrl} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#F0972E', color: '#0A0A0A' }}>Kaynağı ekle</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="w-full py-8 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/50">
                Dosya seçmek için tıklayın
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json" onChange={e => e.target.files?.[0] && addFile(e.target.files[0])} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}