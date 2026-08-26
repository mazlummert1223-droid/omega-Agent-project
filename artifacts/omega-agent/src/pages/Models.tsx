import React, { useState } from 'react';
import { Layers, Zap, Bot, Check } from 'lucide-react';

const MODELS = [
  {
    id: 'multi',
    name: 'OMEGA AGENT',
    desc: 'Araştırma, mühendislik ve strateji ajanlarını paralel çalıştırır; canlı internet ve otomatik sentez kullanır.',
    tags: ['En güçlü', 'Canlı web'],
    icon: Layers,
    tagColor: '#F0972E',
    recommended: true,
  },
  {
    id: 'quantum',
    name: 'OMEGA QUANTUM',
    desc: 'Güncel güçlü modeller arasında otomatik yönlendirme ile derin analiz ve akıl yürütme.',
    tags: ['Akıl yürütme', 'Canlı web'],
    icon: Zap,
    tagColor: '#888',
    recommended: false,
  },
  {
    id: 'auto',
    name: 'OMEGA ORIGIN',
    desc: 'Her isteği güncel güçlü ücretsiz model yönlendiricisine ve canlı internet kaynaklarına bağlar.',
    tags: ['Otomatik', 'Canlı web'],
    icon: Bot,
    tagColor: '#888',
    recommended: false,
  },
];

export default function ModelsPage() {
  const [selected, setSelected] = useState('multi');

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8" style={{ background: '#0A0A0A' }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-lg font-display font-semibold mb-1" style={{ color: '#E0E0E0' }}>Models</h1>
        <p className="text-[13px] mb-6" style={{ color: '#555' }}>Her mod güncel güçlü modellere otomatik bağlanır ve canlı web kaynaklarını kontrol eder.</p>

        <div className="space-y-3">
          {MODELS.map(m => {
            const Icon = m.icon;
            const isSelected = selected === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
                style={{
                  background: isSelected ? '#161616' : '#111',
                  border: `1px solid ${isSelected ? '#F0972E' : '#1E1E1E'}`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isSelected ? 'rgba(240,151,46,0.15)' : '#1A1A1A',
                    border: `1px solid ${isSelected ? 'rgba(240,151,46,0.3)' : '#252525'}`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: isSelected ? '#F0972E' : '#555' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[13px] font-bold tracking-wide" style={{ color: isSelected ? '#E0E0E0' : '#888', letterSpacing: '0.06em' }}>{m.name}</span>
                    {m.recommended && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                        style={{ background: 'rgba(240,151,46,0.15)', color: '#F0972E', border: '1px solid rgba(240,151,46,0.25)' }}>
                        Recommended
                      </span>
                    )}
                    {m.tags.map(tag => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: '#1A1A1A', color: '#666', border: '1px solid #252525' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[12px]" style={{ color: '#555' }}>{m.desc}</p>
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: isSelected ? '#F0972E' : '#333', background: isSelected ? '#F0972E' : 'transparent' }}
                >
                  {isSelected && <Check className="w-3 h-3" style={{ color: '#0A0A0A' }} />}
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-[11px] text-center" style={{ color: '#2E2E2E' }}>
          Model kataloğu erişilebildiğinde en yeni uygun modeller otomatik listeye eklenir.
        </p>
      </div>
    </div>
  );
}
