import React from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Bot, User } from 'lucide-react';
import { AgentBadge } from './AgentBadge';
import { format } from 'date-fns';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  agentMode?: string;
}

export function MessageBubble({ role, content, createdAt, agentMode }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={cn(
      "flex w-full gap-4 py-6 px-4 md:px-8 hover:bg-secondary/20 transition-colors group",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg",
        isUser 
          ? "bg-gradient-to-br from-primary/80 to-accent/80 border-primary/50 text-white" 
          : "bg-card border-accent/30 text-accent shadow-[0_0_15px_rgba(0,240,255,0.15)]"
      )}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-2 max-w-[85%] md:max-w-[75%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className="flex items-center gap-3 px-1">
          <span className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wider">
            {isUser ? 'Sen' : 'Omega'}
          </span>
          {agentMode && !isUser && (
            <AgentBadge mode={agentMode} />
          )}
          {createdAt && (
            <span className="text-xs text-muted-foreground/50 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {format(new Date(createdAt), 'HH:mm')}
            </span>
          )}
        </div>

        <div className={cn(
          "relative px-6 py-4 rounded-2xl shadow-xl",
          isUser 
            ? "bg-primary/10 border border-primary/20 text-foreground rounded-tr-sm" 
            : "glass-panel rounded-tl-sm border-l-2 border-l-accent/50"
        )}>
          {isUser ? (
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {content}
            </div>
          ) : (
            <MarkdownRenderer content={content} />
          )}
        </div>
      </div>
    </div>
  );
}
