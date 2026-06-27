import React, { useState } from 'react';
import { OmegaLogo } from '@/components/Sidebar';
import { saveUser, isValidEmail } from '@/lib/auth';
import { ArrowRight, Mail, User } from 'lucide-react';

interface AuthScreenProps {
  onAuth: () => void;
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [step, setStep]   = useState<'email' | 'name'>('email');
  const [email, setEmail] = useState('');
  const [name,  setName]  = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) { setError('Geçerli bir e-posta girin'); return; }
    setError('');
    setStep('name');
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = name.trim() || email.split('@')[0];
    setLoading(true);
    saveUser({ email: email.trim().toLowerCase(), name: displayName, createdAt: new Date().toISOString() });
    setTimeout(onAuth, 300);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#080808' }}
    >
      <div className="w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <OmegaLogo size={56} />
          <h1
            className="mt-4 text-[22px] font-display font-bold tracking-widest"
            style={{ color: '#E8E8E8', letterSpacing: '0.14em' }}
          >
            OMEGA
          </h1>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.28em]" style={{ color: '#555' }}>
            AI AGENT
          </p>
          <p className="mt-4 text-[13px]" style={{ color: '#444' }}>
            Devam etmek için oturum açın
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{ background: '#0E0E0E', border: '1px solid #1E1E1E' }}
        >
          {step === 'email' ? (
            <form onSubmit={handleEmailNext} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium mb-2" style={{ color: '#555' }}>
                  E-posta adresi
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#444' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="ornek@eposta.com"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                    style={{
                      background: '#141414',
                      border: error ? '1px solid rgba(239,68,68,0.5)' : '1px solid #242424',
                      color: '#E0E0E0',
                      caretColor: '#F0972E',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(240,151,46,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(240,151,46,0.08)'; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.5)' : '#242424'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                {error && (
                  <p className="mt-1.5 text-[11px]" style={{ color: '#ef4444' }}>{error}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all"
                style={{ background: '#F0972E', color: '#0A0A0A' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#C07A2E')}
                onMouseLeave={e => (e.currentTarget.style.background = '#F0972E')}
              >
                Devam et
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleFinish} className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-[12px] mb-4 flex items-center gap-1 transition-colors"
                  style={{ color: '#555' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >
                  ← {email}
                </button>
                <label className="block text-[12px] font-medium mb-2" style={{ color: '#555' }}>
                  Adınız (isteğe bağlı)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#444' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Adınızı girin"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                    style={{
                      background: '#141414',
                      border: '1px solid #242424',
                      color: '#E0E0E0',
                      caretColor: '#F0972E',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(240,151,46,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(240,151,46,0.08)'; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = '#242424'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all"
                style={{ background: loading ? '#8B5E28' : '#F0972E', color: '#0A0A0A', opacity: loading ? 0.7 : 1 }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#C07A2E'; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#F0972E'; }}
              >
                {loading ? 'Giriş yapılıyor…' : 'Başla'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-[11px]" style={{ color: '#2E2E2E' }}>
          Verileriniz yalnızca bu cihazda saklanır. Sunucuya gönderilmez.
        </p>
      </div>
    </div>
  );
}
