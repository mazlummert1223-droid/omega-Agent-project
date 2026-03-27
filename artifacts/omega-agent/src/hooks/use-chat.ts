import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListOpenaiMessagesQueryKey, getListOpenaiConversationsQueryKey } from "@workspace/api-client-react";

export type AgentMode = 'auto' | 'researcher' | 'coder' | 'designer' | 'multi';

export interface MultiTaskEvent {
  agent: string;
  status?: string;
  content?: string;
}

export function useChatStream(conversationId: number | null) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamedText, setCurrentStreamedText] = useState("");
  const [multiTaskEvents, setMultiTaskEvents] = useState<MultiTaskEvent[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(async (
    content: string, 
    agentMode: AgentMode = 'auto',
    onSuccess?: () => void
  ) => {
    if (!conversationId) return;

    setIsStreaming(true);
    setCurrentStreamedText("");
    setMultiTaskEvents([]);
    
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              
              if (data.done) {
                break;
              }

              if (isMulti) {
                // Multi-task SSE format
                if (data.agent) {
                  setMultiTaskEvents(prev => {
                    // Update existing agent event or add new one
                    const existingIdx = prev.findIndex(e => e.agent === data.agent);
                    if (existingIdx >= 0) {
                      const newArr = [...prev];
                      newArr[existingIdx] = { ...newArr[existingIdx], ...data };
                      return newArr;
                    }
                    return [...prev, data];
                  });
                }
              } else {
                // Standard text stream
                if (data.content) {
                  setCurrentStreamedText(prev => prev + data.content);
                }
              }
            } catch (e) {
              console.error("Error parsing SSE JSON:", e, dataStr);
            }
          }
        }
      }

      // Refresh messages after stream completes
      queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(conversationId) });
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
      if (onSuccess) onSuccess();

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        console.error('Stream error:', error);
      }
    } finally {
      setIsStreaming(false);
      setCurrentStreamedText("");
      setMultiTaskEvents([]);
    }
  }, [conversationId, queryClient]);

  return {
    sendMessage,
    isStreaming,
    currentStreamedText,
    multiTaskEvents,
    stopStream
  };
}
