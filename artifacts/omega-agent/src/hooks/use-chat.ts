import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListOpenaiMessagesQueryKey, getListOpenaiConversationsQueryKey } from "@workspace/api-client-react";

export type AgentMode = 'auto' | 'researcher' | 'coder' | 'designer' | 'multi';

export interface MultiTaskEvent {
  agent: string;
  label?: string;
  status?: string;
  content?: string;
}

// Local-only message for images (not stored in DB separately)
export interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export function useChatStream(conversationId: number | null) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamedText, setCurrentStreamedText] = useState("");
  const [multiTaskEvents, setMultiTaskEvents] = useState<MultiTaskEvent[]>([]);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    agentMode: AgentMode = 'auto',
    imageUrl?: string
  ) => {
    if (!conversationId) return;

    // If image was generated, add both user prompt and image response locally
    if (imageUrl) {
      const userMsg: LocalMessage = {
        id: `local-u-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      const assistantMsg: LocalMessage = {
        id: `local-a-${Date.now()}`,
        role: 'assistant',
        content: `İşte "${content}" için üretilen görsel:`,
        imageUrl,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, userMsg, assistantMsg]);
      // Also save to DB as text
      try {
        await fetch(`/api/openai/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `${content}\n\n[Görsel üretildi: ${imageUrl}]`, agentMode }),
        });
      } catch {}
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
      return;
    }

    setIsStreaming(true);
    setCurrentStreamedText("");
    setMultiTaskEvents([]);

    abortControllerRef.current = new AbortController();

    try {
      const isMulti = agentMode === 'multi';
      const url = isMulti ? `/api/agent/multi-task` : `/api/openai/conversations/${conversationId}/messages`;
      const body = isMulti ? { task: content, conversationId } : { content, agentMode };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.done) break;
            if (data.error) {
              setCurrentStreamedText(prev => prev + "\n\n⚠️ " + data.error);
              break;
            }
            if (isMulti && data.agent) {
              setMultiTaskEvents(prev => {
                const idx = prev.findIndex(e => e.agent === data.agent);
                if (idx >= 0) {
                  const arr = [...prev];
                  arr[idx] = { ...arr[idx], ...data };
                  if (data.content && data.status === 'streaming') {
                    arr[idx].content = (arr[idx].content || '') + (data.content || '');
                  }
                  return arr;
                }
                return [...prev, data];
              });
            } else if (data.content) {
              setCurrentStreamedText(prev => prev + data.content);
            }
          } catch {}
        }
      }

      queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(conversationId) });
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Stream error:', error);
      }
    } finally {
      setIsStreaming(false);
      setCurrentStreamedText("");
      setMultiTaskEvents([]);
    }
  }, [conversationId, queryClient]);

  return { sendMessage, isStreaming, currentStreamedText, multiTaskEvents, localMessages, stopStream };
}
