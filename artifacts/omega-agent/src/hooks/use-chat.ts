import { useState, useRef, useCallback, useEffect } from "react";
import { LocalDB, type LocalConversation, type LocalMessage } from "@/lib/local-db";

export type AgentMode = 'auto' | 'researcher' | 'coder' | 'multi' | 'quantum';

export interface MultiTaskEvent {
  agent: string;
  label?: string;
  status?: string;
  content?: string;
}

export const IMG_MARKER = "__IMG__:";

/* ─── Event bus for local conversation updates ─── */
export function dispatchConvUpdate() {
  window.dispatchEvent(new CustomEvent('omega-conv-updated'));
}

/* ─── Local conversations hook (replaces React Query) ─── */
export function useLocalConversations() {
  const [convs, setConvs] = useState<LocalConversation[]>([]);
  const load = useCallback(() => setConvs(LocalDB.listConversations()), []);

  useEffect(() => {
    load();
    window.addEventListener('omega-conv-updated', load);
    return () => window.removeEventListener('omega-conv-updated', load);
  }, [load]);

  const create = useCallback((title = 'Yeni Sohbet') => {
    const conv = LocalDB.createConversation(title);
    dispatchConvUpdate();
    return conv;
  }, []);

  const remove = useCallback((id: string) => {
    LocalDB.deleteConversation(id);
    dispatchConvUpdate();
  }, []);

  return { conversations: convs, create, remove };
}

/* ─── Local conversation detail hook ─── */
export function useLocalConversation(id: string | null) {
  const [data, setData] = useState<(LocalConversation & { messages: LocalMessage[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!id) { setLoading(false); return; }
    const conv = LocalDB.getConversation(id);
    setData(conv);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    window.addEventListener('omega-conv-updated', load);
    return () => window.removeEventListener('omega-conv-updated', load);
  }, [load]);

  return { data, loading, refresh: load };
}

/* ─── Chat streaming hook (local storage + stateless AI stream) ─── */
export function useChatStream(conversationId: string | null) {
  const [isStreaming, setIsStreaming]           = useState(false);
  const [currentStreamedText, setCurrentText]  = useState("");
  const [multiTaskEvents, setMultiTaskEvents]  = useState<MultiTaskEvent[]>([]);
  const [synthesisText, setSynthesisText]      = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    agentMode: AgentMode = 'auto',
    imageUrl?: string
  ) => {
    if (!conversationId) return;

    /* ── Image message (no AI needed) ── */
    if (imageUrl) {
      LocalDB.addMessage(conversationId, 'user', content);
      LocalDB.addMessage(conversationId, 'assistant', `${IMG_MARKER}${imageUrl}`);
      LocalDB.autoRename(conversationId, content);
      dispatchConvUpdate();
      return;
    }

    /* ── Text / AI streaming ── */
    LocalDB.addMessage(conversationId, 'user', content);
    LocalDB.autoRename(conversationId, content);
    dispatchConvUpdate();

    setIsStreaming(true);
    setCurrentText("");
    setMultiTaskEvents([]);
    setSynthesisText("");
    abortRef.current = new AbortController();

    const history = LocalDB.getMessages(conversationId).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    try {
      const isMulti = agentMode === 'multi';

      const url = isMulti ? '/api/agent/multi-task' : '/api/openai/stream-stateless';
      const body = isMulti
        ? { task: content, conversationId: '__local__' }
        : { messages: history, agentMode };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let buf = "";
      let fullText = "";
      let synthFull = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.done) break;
            if (data.error) {
              setCurrentText(p => p + "\n\n⚠️ " + data.error);
              break;
            }

            if (isMulti && data.agent) {
              if (data.agent === 'synthesis') {
                if (data.content && data.status === 'streaming') {
                  synthFull += data.content;
                  setSynthesisText(p => p + data.content);
                }
                setMultiTaskEvents(prev => {
                  const idx = prev.findIndex(e => e.agent === 'synthesis');
                  if (idx >= 0) {
                    const arr = [...prev];
                    arr[idx] = { ...arr[idx], status: data.status, label: data.label };
                    return arr;
                  }
                  return [...prev, { agent: 'synthesis', label: data.label, status: data.status }];
                });
              } else {
                setMultiTaskEvents(prev => {
                  const idx = prev.findIndex(e => e.agent === data.agent);
                  if (idx >= 0) {
                    const arr = [...prev];
                    arr[idx] = { ...arr[idx], status: data.status, label: data.label };
                    if (data.content && data.status === 'streaming') {
                      arr[idx].content = (arr[idx].content || '') + data.content;
                    }
                    return arr;
                  }
                  return [...prev, { ...data, content: data.content || '' }];
                });
              }
            } else if (data.content) {
              fullText += data.content;
              setCurrentText(p => p + data.content);
            }
          } catch {}
        }
      }

      /* Save AI response to local storage */
      const finalText = isMulti ? synthFull : fullText;
      if (finalText) {
        LocalDB.addMessage(conversationId, 'assistant', finalText);
        dispatchConvUpdate();
      }
    } catch {}
    finally {
      setIsStreaming(false);
      setCurrentText("");
      setMultiTaskEvents([]);
      setSynthesisText("");
    }
  }, [conversationId]);

  return { sendMessage, isStreaming, currentStreamedText, multiTaskEvents, synthesisText, stopStream };
}
