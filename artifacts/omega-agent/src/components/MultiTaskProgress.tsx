import React from 'react';
import { MultiTaskEvent } from '@/hooks/use-chat';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MultiTaskProgressProps {
  events: MultiTaskEvent[];
}

const AGENT_COLORS = {
  researcher: { dot: 'bg-blue-400', border: 'border-blue-400/30', text: 'text-blue-400' },
  coder: { dot: 'bg-green-400', border: 'border-green-400/30', text: 'text-green-400' },
  designer: { dot: 'bg-pink-400', border: 'border-pink-400/30', text: 'text-pink-400' },
};

function GeminiStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M12 2C12 2 13 9 18 12C13 15 12 22 12 22C12 22 11 15 6 12C11 9 12 2 12 2Z" fill="url(#mGrad)"/>
      <defs>
        <linearGradient id="mGrad" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4"/>
          <stop offset="0.5" stopColor="#9B72CB"/>
          <stop offset="1" stopColor="#D96570"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function MultiTaskProgress({ events }: MultiTaskProgressProps) {
  if (events.length === 0) return null;

  const allDone = events.every(e => e.status === 'done' || e.status === 'error');
  const runningAgent = events.find(e => e.status === 'running' || e.status === 'streaming');

  return (
    <div className="flex gap-3 px-4 md:px-8 py-3 animate-fade-up">
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-primary/20 flex items-center justify-center mt-0.5">
        {allDone ? <GeminiStar /> : <Loader2 className="w-4 h-4 text-primary animate-spin" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold gemini-gradient">Omega</span>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Çok-Ajan Modu</span>
          {!allDone && runningAgent && (
            <span className="text-xs text-muted-foreground animate-pulse-soft">
              {runningAgent.label} çalışıyor...
            </span>
          )}
        </div>

        <div className="space-y-3">
          {events.map((event, idx) => {
            const colors = AGENT_COLORS[event.agent as keyof typeof AGENT_COLORS] || AGENT_COLORS.researcher;
            const isDone = event.status === 'done';
            const isRunning = event.status === 'running' || event.status === 'streaming';
            const isError = event.status === 'error';

            return (
              <div key={`${event.agent}-${idx}`} className={cn(
                "rounded-2xl border overflow-hidden",
                isDone ? "border-border/50" : isRunning ? "border-primary/30" : isError ? "border-destructive/30" : "border-border/30"
              )}>
                {/* Agent header */}
                <div className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 bg-secondary/50",
                  isRunning && "bg-primary/5"
                )}>
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", colors.dot, isRunning && "animate-pulse")} />
                  <span className={cn("text-sm font-semibold", isRunning ? "text-white" : "text-foreground/80")}>
                    {event.label || event.agent}
                  </span>
                  <div className="ml-auto">
                    {isDone && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    {isRunning && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                    {isError && <AlertCircle className="w-4 h-4 text-destructive" />}
                  </div>
                </div>

                {/* Agent content */}
                {event.content && (
                  <div className="px-4 py-3 text-sm">
                    <MarkdownRenderer content={event.content} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
