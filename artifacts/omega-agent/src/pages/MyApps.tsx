import React, { useState, useEffect, useCallback } from 'react';
import { AppsDB, type LocalApp } from '@/lib/apps-db';
import { Download, Trash2, Code2, Maximize2, Minimize2, RefreshCw, Plus, Pencil, Check, X } from 'lucide-react';
import { Link } from 'wouter';
import { useSidebar } from '@/App';
import { Menu } from 'lucide-react';

export default function MyApps() {
  const [apps, setApps]         = useState<LocalApp[]>([]);
  const [selected, setSelected] = useState<LocalApp | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName]   = useState('');
  const { toggle } = useSidebar();

  const load = useCallback(() => {
    const list = AppsDB.list();
    setApps(list);
    if (selected) {
      const fresh = list.find(a => a.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [selected]);

  useEffect(() => {
    load();
    window.addEventListener('omega-apps-updated', load);
    return () => window.removeEventListener('omega-apps-updated', load);
  }, [load]);

  const handleDelete = (id: string) => {
    AppsDB.delete(id);
    if (selected?.id === id) setSelected(null);
  };

  const handleDownload = (app: LocalApp) => {
    const blob = new Blob([app.html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${app.name.replace(/[^a-z0-9]/gi, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startEdit = (app: LocalApp) => { setEditingId(app.id); setEditName(app.name); };
  const saveEdit  = () => {
    if (editingId && editName.trim()) AppsDB.update(editingId, { name: editName.trim() });
    setEditingId(null);
  };

  const amber = '#F0972E';
  const border = '1px solid #1E1E1E';

  return (
    <div className="flex-1 flex h-full overflow-hidden" style={{ background: '#090909' }}>

      {/* ── Left panel: app list ── */}
      <div className="w-60 flex flex-col flex-shrink-0" style={{ background: '#0C0C0C', borderRight: border }}>

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: border }}>
          <button onClick={toggle} className="md:hidden p-1 rounded" style={{ color: '#555' }}>
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[13px] font-semibold" style={{ color: '#D0D0D0' }}>Uygulamalarım</h2>
            <p className="text-[10px]" style={{ color: '#383838' }}>{apps.length} uygulama</p>
          </div>
          <Link href="/">
            <button
              title="Yeni uygulama üret"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
              style={{ background: `rgba(240,151,46,0.12)`, border: `1px solid rgba(240,151,46,0.22)`, color: amber }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,151,46,0.22)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(240,151,46,0.12)')}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        {/* App list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4 gap-3">
              <Code2 className="w-8 h-8" style={{ color: '#222' }} />
              <p className="text-[11px] leading-relaxed" style={{ color: '#2E2E2E' }}>
                Henüz uygulama yok.<br />
                <span style={{ color: '#404040' }}>Omega Agent'a bir şey yaptırın!</span>
              </p>
              <Link href="/">
                <button
                  className="text-[11px] px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: 'rgba(240,151,46,0.1)', color: amber, border: '1px solid rgba(240,151,46,0.2)' }}
                >
                  Uygulama Üret
                </button>
              </Link>
            </div>
          ) : apps.map(app => {
            const isActive = selected?.id === app.id;
            const isEditing = editingId === app.id;
            return (
              <div
                key={app.id}
                onClick={() => !isEditing && setSelected(app)}
                className="group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                style={{
                  background: isActive ? '#191919' : 'transparent',
                  borderLeft: `2px solid ${isActive ? amber : 'transparent'}`,
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#141414'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: isActive ? `rgba(240,151,46,0.15)` : '#181818', border: `1px solid ${isActive ? 'rgba(240,151,46,0.25)' : '#242424'}` }}
                >
                  <Code2 className="w-3 h-3" style={{ color: isActive ? amber : '#3A3A3A' }} />
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      className="flex-1 min-w-0 bg-transparent border-b text-[11px] outline-none"
                      style={{ borderColor: amber, color: '#E0E0E0' }}
                    />
                    <button onClick={saveEdit}><Check className="w-3 h-3 text-green-400" /></button>
                    <button onClick={() => setEditingId(null)}><X className="w-3 h-3 text-red-400" /></button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-medium truncate" style={{ color: isActive ? '#DADADA' : '#555' }}>
                      {app.name}
                    </div>
                    <div className="text-[9.5px]" style={{ color: '#2E2E2E' }}>
                      {new Date(app.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      title="Yeniden adlandır"
                      onClick={e => { e.stopPropagation(); startEdit(app); }}
                      className="p-1 rounded"
                      style={{ color: '#3A3A3A' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3A3A3A')}
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button
                      title="Sil"
                      onClick={e => { e.stopPropagation(); handleDelete(app.id); }}
                      className="p-1 rounded"
                      style={{ color: '#3A3A3A' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3A3A3A')}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right panel: preview ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Preview toolbar */}
            <div
              className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
              style={{ background: '#0C0C0C', borderBottom: border }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(240,151,46,0.1)', border: '1px solid rgba(240,151,46,0.2)' }}
                >
                  <Code2 className="w-3.5 h-3.5" style={{ color: amber }} />
                </div>
                <span className="text-[13px] font-medium truncate max-w-[300px]" style={{ color: '#C8C8C8' }}>
                  {selected.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(240,151,46,0.08)', color: '#7A5A28', border: '1px solid rgba(240,151,46,0.12)' }}>
                  Canlı
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { const el = document.querySelector('iframe[title="preview"]') as HTMLIFrameElement; if (el) el.src = el.src; }}
                  title="Yenile"
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: '#444', background: '#141414', border: '1px solid #222' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#444')}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDownload(selected)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all"
                  style={{ color: '#555', background: '#141414', border: '1px solid #222' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#CCC')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >
                  <Download className="w-3 h-3" /> İndir
                </button>
                <button
                  onClick={() => setExpanded(p => !p)}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: '#444', background: '#141414', border: '1px solid #222' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#444')}
                >
                  {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* iframe */}
            <div className="flex-1 overflow-hidden" style={{ background: '#fff' }}>
              <iframe
                key={selected.id}
                srcDoc={selected.html}
                sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock"
                title="preview"
                className="w-full h-full border-none"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(240,151,46,0.07)', border: '1px solid rgba(240,151,46,0.12)' }}
            >
              <Code2 className="w-7 h-7" style={{ color: 'rgba(240,151,46,0.4)' }} />
            </div>
            <div>
              <p className="text-[15px] font-semibold mb-1" style={{ color: '#3A3A3A' }}>
                {apps.length > 0 ? 'Bir uygulama seçin' : 'Henüz uygulama üretilmedi'}
              </p>
              <p className="text-[12px]" style={{ color: '#282828' }}>
                {apps.length > 0
                  ? 'Soldan bir uygulamaya tıklayarak canlı önizleme görün'
                  : 'Omega Agent\'a "hesap makinesi yap", "grafik çiz", "oyun yap" gibi komutlar verin'
                }
              </p>
            </div>
            {apps.length === 0 && (
              <Link href="/">
                <button
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: 'linear-gradient(135deg,#FFCA6A,#F0972E,#C46B14)',
                    color: '#0A0A0A',
                    boxShadow: '0 2px 16px rgba(240,151,46,0.35)',
                  }}
                >
                  <Plus className="w-4 h-4" /> Omega Agent ile Uygulama Üret
                </button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
