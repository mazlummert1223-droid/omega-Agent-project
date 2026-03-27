import React from 'react';
import { MultiTaskEvent } from '@/hooks/use-chat';
import { CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MultiTaskProgressProps {
  events: MultiTaskEvent[];
}

export function MultiTaskProgress({ events }: MultiTaskProgressProps) {
  if (events.length === 0) return null;

  return (
    <div className="flex w-full gap-4 py-6 px-4 md:px-8">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border bg-card border-accent/30 text-accent shadow-[0_0_15px_rgba(0,240,255,0.15)]">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>

      <div className="flex flex-col gap-3 w-full max-w-md">
        <span className="text-sm font-display font-semibold text-accent uppercase tracking-wider text-glow px-1">
          Çok-Ajan Sistemi Devrede
        </span>
        
        <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3 border-l-2 border-l-primary/50">
          <AnimatePresence>
            {events.map((event, idx) => {
              const isDone = event.status === 'completed';
              const isRunning = event.status === 'running';

              return (
                <motion.div 
                  key={`${event.agent}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : isRunning ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <CircleDashed className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-sm font-medium capitalize",
                      isDone ? "text-gray-300" : "text-white"
                    )}>
                      {event.agent} Ajanı
                    </span>
                    {event.content && (
                      <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {event.content}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
