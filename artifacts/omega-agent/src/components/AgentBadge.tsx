import React from 'react';
import { Bot, Search, Code2, Paintbrush, Layers } from 'lucide-react';
import { AgentMode } from '@/hooks/use-chat';
import { cn } from '@/lib/utils';

interface AgentBadgeProps {
  mode: string;
  className?: string;
}

export function AgentBadge({ mode, className }: AgentBadgeProps) {
  const config = {
    auto: { icon: Bot, label: 'Otomatik', color: 'text-gray-400 border-gray-400/30 bg-gray-400/10' },
    researcher: { icon: Search, label: 'Araştırmacı', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
    coder: { icon: Code2, label: 'Kodcu', color: 'text-green-400 border-green-400/30 bg-green-400/10' },
    designer: { icon: Paintbrush, label: 'Tasarımcı', color: 'text-pink-400 border-pink-400/30 bg-pink-400/10' },
    multi: { icon: Layers, label: 'Çok-Ajan', color: 'text-accent border-accent/30 bg-accent/10 shadow-[0_0_10px_rgba(0,240,255,0.2)]' },
  };

  const activeConfig = config[mode as keyof typeof config] || config.auto;
  const Icon = activeConfig.icon;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm",
      activeConfig.color,
      className
    )}>
      <Icon className="w-3.5 h-3.5" />
      {activeConfig.label}
    </div>
  );
}
