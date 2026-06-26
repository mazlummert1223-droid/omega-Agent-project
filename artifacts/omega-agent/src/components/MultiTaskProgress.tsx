import React, { useState } from 'react';
import { MultiTaskEvent } from '@/hooks/use-chat';
import { CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronRight, Brain, Search, Code2, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MultiTaskProgressProps {
  events: MultiTaskEvent[];
  synthesisText: string;
}

const AGENT_CONFIG = {
  researcher: {
    icon: <Search className="w-3.5 h-3.5" />,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    dot: 'bg-sky-400',
    label: 'Araştırmacı',
  },
  coder: {
    icon: <Code2 className="w-3.5 h-3.5" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    label: 'Mühendis',
  },
  designer: {
    icon: <Target className="w-3.5 h-3.5" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    label: 'Stratejist',
  },
  synthesis: {
    icon: <Brain className="w-3.5 h-3.5" />,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    dot: 'bg-primary',
    label: 'Sentez',
  },
};

function OmegaLogo({ spinning }: { spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("w-4 h-4", spinning && "animate-spin")} style={spinning ? { animationDuration: '2s' } : {}}>
      <circle cx="12" cy="12" r="10" stroke="url(#omegaGrad)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 2"/>
      <path d="M8 17c0-2.761 1.791-5 4-5s4 2.239 4 5" stroke="url(#omegaGrad)" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M6.5 17h11M9 17v1.5M15 17v1.5" stroke="url(#omegaGrad)" strokeWidth="1.5" strokeLinecap="round"/>
      <defs>
        <linearGradient id="omegaGrad" x1="2" y1="2" x2="22" y2="22">
          <stop stopColor="#00D4FF"/>
          <stop offset="1" stopColor="#F5A623"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function MultiTaskProgress({ events, synthesisText }: MultiTaskProgressProps) {
  const [deliberationOpen, setDeliberationOpen] = useState(false);

  if (events.length === 0 && !synthesisText) return null;

  // Separate agent events from synthesis
  const agentEvents = events.filter(e => e.agent !== 'synthesis');
  const synthesisEvent = events.find(e => e.agent === 'synthesis');

  const allAgentsDone = agentEvents.length > 0 && agentEvents.every(e => e.status === 'done' || e.status === 'error');
  const isSynthesizing = synthesisEvent?.status === 'running' || synthesisEvent?.status === 'streaming';
  const isSynthesisDone = synthesisEvent?.status === 'done' && !!synthesisText;
  const runningAgent = agentEvents.find(e => e.status === 'running' || e.status === 'streaming');

  return (
    <div className="flex gap-3 px-4 md:px-8 py-3 animate-fade-up">
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 flex items-center justify-center mt-0.5">
        {isSynthesisDone
          ? <OmegaLogo />
          : <Loader2 className="w-4 h-4 text-primary animate-spin" />
        }
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold gemini-gradient font-display">Omega</span>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border/50">
            Çok-Ajan Sistemi
          </span>
          {!allAgentsDone && runningAgent && (
            <span className="text-xs text-muted-foreground animate-pulse-soft flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
              {runningAgent.label || runningAgent.agent} analiz ediyor
            </span>
          )}
          {isSynthesizing && (
            <span className="text-xs text-primary animate-pulse-soft flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Görüşler birleştiriliyor...
            </span>
          )}
        </div>

        {/* Agent Deliberation — collapsible */}
        {agentEvents.length > 0 && (
          <div className="rounded-xl border border-border/50 overflow-hidden bg-secondary/20">
            <button
              onClick={() => setDeliberationOpen(o => !o)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-secondary/40 transition-colors text-left"
            >
              <div className="flex items-center gap-1.5 flex-1">
                <Brain className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Ajan Tartışması
                </span>
                <div className="flex items-center gap-1 ml-2">
                  {agentEvents.map(e => {
                    const cfg = AGENT_CONFIG[e.agent as keyof typeof AGENT_CONFIG] || AGENT_CONFIG.researcher;
                    const isDone = e.status === 'done';
                    const isRunning = e.status === 'running' || e.status === 'streaming';
                    return (
                      <div key={e.agent} className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        isDone ? cfg.dot : isRunning ? cfg.dot + " animate-pulse" : "bg-border"
                      )} title={cfg.label} />
                    );
                  })}
                </div>
              </div>
              {allAgentsDone
                ? <span className="text-[10px] text-muted-foreground/60">Tamamlandı</span>
                : <span className="text-[10px] text-muted-foreground/60 animate-pulse-soft">Devam ediyor...</span>
              }
              {deliberationOpen
                ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              }
            </button>

            {deliberationOpen && (
              <div className="border-t border-border/50 divide-y divide-border/30">
                {agentEvents.map(event => {
                  const cfg = AGENT_CONFIG[event.agent as keyof typeof AGENT_CONFIG] || AGENT_CONFIG.researcher;
                  const isDone = event.status === 'done';
                  const isRunning = event.status === 'running' || event.status === 'streaming';
                  const isError = event.status === 'error';

                  return (
                    <div key={event.agent} className="px-3.5 py-3">
                      {/* Agent label row */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium", cfg.bg, cfg.color)}>
                          {cfg.icon}
                          {event.label || cfg.label}
                        </div>
                        <div className="ml-auto">
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          {isRunning && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
                          {isError && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                        </div>
                      </div>
                      {event.content && (
                        <div className="text-xs text-foreground/70 leading-relaxed max-h-40 overflow-y-auto">
                          <MarkdownRenderer content={event.content} />
                        </div>
                      )}
                      {!event.content && isRunning && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Synthesis Step indicator (while running) */}
        {isSynthesizing && !synthesisText && (
          <div className="flex items-center gap-2 text-xs text-primary/80 px-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Tüm görüşler sentezleniyor, tek yanıt hazırlanıyor...</span>
          </div>
        )}

        {/* Final Synthesis Answer — the ONE unified response */}
        {(synthesisText || (isSynthesizing && synthesisText)) && (
          <div className="space-y-1">
            {!isSynthesisDone && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 px-0.5">
                <Sparkles className="w-3 h-3" />
                <span>Sentezlenmiş Yanıt</span>
              </div>
            )}
            <div className="prose text-sm">
              <MarkdownRenderer content={synthesisText} />
              {isSynthesizing && (
                <span className="inline-flex items-center gap-0.5 ml-1">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
