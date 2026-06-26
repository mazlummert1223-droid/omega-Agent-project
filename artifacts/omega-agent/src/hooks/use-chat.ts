import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListOpenaiMessagesQueryKey, getListOpenaiConversationsQueryKey, getGetOpenaiConversationQueryKey } from "@workspace/api-client-react";

export type AgentMode = 'auto' | 'researcher' | 'coder' | 'designer' | 'multi';

export interface MultiTaskEvent {
  agent: string;
  label?: string;
  status?: string;
  content?: string;
}

// Image marker prefix — used to persist image URLs in DB message content
export const IMG_MARKER = "__IMG__:";

export function useChatStream(conversationId: number | null) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamedText, setCurrentStreamedText] = useState("");
  const [multiTaskEvents, setMultiTaskEvents] = useState<MultiTaskEvent[]>([]);
  const [synthesisText, setSynthesisText] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const invalidateConversation = useCallback(() => {
    if (!conversationId) return;
    queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(conversationId) });
    queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(conversationId) });
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
  }, [conversationId, queryClient]);

  const sendMessage = useCallback(async (
    content: string,
    agentMode: AgentMode = 'auto',
    imageUrl?: string
  ) => {
    if (!conversationId) return;

    // ── Image message path ────────────────────────────────────────────────
    if (imageUrl) {
      try {
        await fetch(`/api/openai/conversations/${conversationId}/save-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', content }),
        });
        await fetch(`/api/openai/conversations/${conversationId}/save-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'assistant',
            content: `${IMG_MARKER}${imageUrl}`,
          }),
        });
      } catch {}
      invalidateConversation();
      return;
    }

    // ── Text / AI streaming path ──────────────────────────────────────────
    setIsStreaming(true);
    setCurrentStreamedText("");
    setMultiTaskEvents([]);
    setSynthesisText("");

    abortControllerRef.current = new AbortController();

    try {
      const isMulti = agentMode === 'multi';
      const url = isMulti
        ? `/api/agent/multi-task`
        : `/api/openai/conversations/${conversationId}/messages`;
      const body = isMulti
        ? { task: content, conversationId }
        : { content, agentMode };

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
              if (data.agent === "synthesis") {
                // Sentez cevabı ayrı state'e yaz
                if (data.content && data.status === 'streaming') {
                  setSynthesisText(prev => prev + data.content);
                }
                // Sentez olayını da multi-events'e ekle (durum göstergesi için)
                setMultiTaskEvents(prev => {
                  const idx = prev.findIndex(e => e.agent === "synthesis");
                  const updated = { ...data };
                  if (idx >= 0) {
                    const arr = [...prev];
                    arr[idx] = { ...arr[idx], status: data.status, label: data.label };
                    return arr;
                  }
                  return [...prev, { agent: "synthesis", label: data.label, status: data.status }];
                });
              } else {
                // Normal ajan cevabı
                setMultiTaskEvents(prev => {
                  const idx = prev.findIndex(e => e.agent === data.agent);
                  if (idx >= 0) {
                    const arr = [...prev];
                    arr[idx] = { ...arr[idx], status: data.status, label: data.label };
                    if (data.content && data.status === 'streaming') {
                      arr[idx].content = (arr[idx].content || '') + (data.content || '');
                    }
                    return arr;
                  }
                  return [...prev, { ...data, content: data.content || '' }];
                });
              }
            } else if (data.content) {
              setCurrentStreamedText(prev => prev + data.content);
            }
          } catch {}
        }
      }

      invalidateConversation();
    } catch {
    } finally {
      setIsStreaming(false);
      setCurrentStreamedText("");
      setMultiTaskEvents([]);
      setSynthesisText("");
    }
  }, [conversationId, invalidateConversation]);

  return { sendMessage, isStreaming, currentStreamedText, multiTaskEvents, synthesisText, stopStream };
}
