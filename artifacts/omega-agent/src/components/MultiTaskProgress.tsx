import React, { useState } from 'react';
import { MultiTaskEvent } from '@/hooks/use-chat';
import { CheckCircle2, Loader2, AlertCircle, ChevronRight, ChevronDown, Brain, Search, Code2, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { OmegaLogo } from './Sidebar';

interface MultiTaskProgressProps {
  events: MultiTaskEvent[];
  synthesisText: string;
}

const AGENT_CFG = {
  researcher: { icon: <Search className="w-3.5 h-3.5" />,  label: 'Araştırmacı', color: '#0EA5E9', bg: 'rgba(14,165,233,0.08)' },
  coder:      { icon: <Code2  className="w-3.5 h-3.5" />,  label: 'Mühendis',    color: '#22C55E', bg: 'rgba(34,197,94,0.08)'  },
  designer:   { icon: <Target className="w-3.5 h-3.5" />,  label: 'Stratejist',  color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  synthesis:  { icon: <Brain  className="w-3.5 h-3.5" />,  label: 'Sentez',      color: '#F0972E', bg: 'rgba(0,163,204,0.08)'  },
};

export function MultiTaskProgress({ events, synthesisText }: MultiTaskProgressProps) {
  const [open, setOpen] = useState(false);

  if (events.length === 0 && !synthesisText) return null;

  const agentEvents   = events.filter(e => e.agent !== 'synthesis');
  const synthesisEvt  = events.find(e => e.agent === 'synthesis');

  const allAgentsDone = agentEvents.length > 0 && agentEvents.every(e => e.status === 'done' || e.status === 'error');
  const isSynthRunning = synthesisEvt?.status === 'running' || synthesisEvt?.status === 'streaming';
  const isDone         = synthesisEvt?.status === 'done' && !!synthesisText;
  const running        = agentEvents.find(e => e.status === 'running' || e.status === 'streaming');

  return (
    <div className="flex gap-3 px-4 md:px-10 py-4 animate-fade-up">
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5 relative">
        <OmegaLogo size={30} />
        {!isDone && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: '#0A0A0A' }}>
            <Loader2 className="w-2.5 h-2.5 animate-spin" style={{ color: '#F0972E' }} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-3 pt-0.5">
        {/* Header row */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[13px] font-semibold font-display" style={{ color: '#F0972E' }}>
            Omega
          </span>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'hsl(0 0% 12%)', border: '1px solid hsl(0 0% 18%)', color: 'hsl(0 0% 45%)' }}
          >
            Çok-Ajan
          </span>
          {!allAgentsDone && running && (
            <span className="text-[12px] animate-pulse-soft" style={{ color: 'hsl(0 0% 42%)' }}>
              {running.label || running.agent} analiz ediyor…
            </span>
          )}
          {isSynthRunning && (
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: '#F0972E' }}>
              <Sparkles className="w-3 h-3" />
              Görüşler birleştiriliyor…
            </span>
          )}
        </div>

        {/* ── Deliberation panel (collapsible) ── */}
        {agentEvents.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid hsl(0 0% 14%)', background: 'hsl(0 0% 7%)' }}
          >
            {/* toggle header */}
            <button
              onClick={() => setOpen(o => !o)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-secondary/30"
            >
              <Brain className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'hsl(0 0% 38%)' }} />
              <span className="text-[12px] font-medium flex-1" style={{ color: 'hsl(0 0% 42%)' }}>
                Ajan tartışması
              </span>
              {/* status dots */}
              <div className="flex items-center gap-1 mr-2">
                {agentEvents.map(e => {
                  const cfg = AGENT_CFG[e.agent as keyof typeof AGENT_CFG] || AGENT_CFG.researcher;
                  return (
                    <div
                      key={e.agent}
                      className="w-1.5 h-1.5 rounded-full transition-all"
                      style={{
                        background: (e.status === 'done' || e.status === 'streaming') ? cfg.color : 'hsl(0 0% 22%)',
                        opacity: e.status === 'running' ? 1 : undefined,
                      }}
                      title={cfg.label}
                    />
                  );
                })}
              </div>
              <span className="text-[10px]" style={{ color: 'hsl(0 0% 30%)' }}>
                {allAgentsDone ? 'Tamamlandı' : 'Devam ediyor'}
              </span>
              {open
                ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'hsl(0 0% 35%)' }} />
                : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'hsl(0 0% 35%)' }} />
              }
            </button>

            {/* expanded content */}
            {open && (
              <div style={{ borderTop: '1px solid hsl(0 0% 12%)' }}>
                {agentEvents.map((event, idx) => {
                  const cfg = AGENT_CFG[event.agent as keyof typeof AGENT_CFG] || AGENT_CFG.researcher;
                  const isDoneE   = event.status === 'done';
                  const isRunning = event.status === 'running' || event.status === 'streaming';
                  const isError   = event.status === 'error';

                  return (
                    <div
                      key={event.agent}
                      className="px-4 py-3"
                      style={idx < agentEvents.length - 1 ? { borderBottom: '1px solid hsl(0 0% 12%)' } : {}}
                    >
                      {/* agent label */}
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}22` }}
                        >
                          {cfg.icon}
                          {event.label || cfg.label}
                        </span>
                        <div className="ml-auto">
                          {isDoneE   && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'hsl(150 65% 48%)' }} />}
                          {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: cfg.color }} />}
                          {isError   && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                        </div>
                      </div>

                      {/* content */}
                      {event.content ? (
                        <div className="text-[12.5px] leading-relaxed max-h-40 overflow-y-auto prose" style={{ color: 'hsl(0 0% 55%)' }}>
                          <MarkdownRenderer content={event.content} />
                        </div>
                      ) : isRunning ? (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: cfg.color, opacity: 0.6 }} />
                          <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: cfg.color, opacity: 0.6 }} />
                          <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: cfg.color, opacity: 0.6 }} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Synthesis loading */}
        {isSynthRunning && !synthesisText && (
          <div className="flex items-center gap-2 text-[12px]" style={{ color: 'rgba(240,151,46,0.7)' }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Tüm görüşler sentezleniyor, tek yanıt hazırlanıyor…
          </div>
        )}

        {/* ── Final unified answer ── */}
        {synthesisText && (
          <div>
            {!isDone && (
              <div className="flex items-center gap-1.5 text-[11px] mb-2" style={{ color: 'hsl(0 0% 35%)' }}>
                <Sparkles className="w-3 h-3" />
                Sentezlenmiş yanıt
              </div>
            )}
            <div className="prose">
              <MarkdownRenderer content={synthesisText} />
              {isSynthRunning && (
                <span className="inline-flex items-center gap-0.5 ml-1">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(240,151,46,0.55)' }} />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(240,151,46,0.55)' }} />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(240,151,46,0.55)' }} />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
