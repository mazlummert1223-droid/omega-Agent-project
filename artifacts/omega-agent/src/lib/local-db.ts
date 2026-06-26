/* ─────────────────────────────────────────────────────────────
   LOCAL-DB  — localStorage tabanlı sohbet / mesaj deposu
   Tüm veriler kullanıcının cihazında saklanır, sunucuya gönderilmez.
   ───────────────────────────────────────────────────────────── */

export interface LocalConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const CONV_KEY = 'omega_conversations';
const MSG_PREFIX = 'omega_msgs_';

/* ─── helpers ─── */
function readConvs(): LocalConversation[] {
  try { return JSON.parse(localStorage.getItem(CONV_KEY) || '[]'); } catch { return []; }
}
function writeConvs(list: LocalConversation[]) {
  localStorage.setItem(CONV_KEY, JSON.stringify(list));
}
function readMsgs(convId: string): LocalMessage[] {
  try { return JSON.parse(localStorage.getItem(MSG_PREFIX + convId) || '[]'); } catch { return []; }
}
function writeMsgs(convId: string, msgs: LocalMessage[]) {
  localStorage.setItem(MSG_PREFIX + convId, JSON.stringify(msgs));
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ─── Conversations ─── */
export const LocalDB = {
  listConversations(): LocalConversation[] {
    return readConvs().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  getConversation(id: string): (LocalConversation & { messages: LocalMessage[] }) | null {
    const conv = readConvs().find(c => c.id === id);
    if (!conv) return null;
    return { ...conv, messages: readMsgs(id) };
  },

  createConversation(title = 'Yeni Sohbet'): LocalConversation {
    const conv: LocalConversation = {
      id: uid(),
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeConvs([conv, ...readConvs()]);
    return conv;
  },

  updateTitle(id: string, title: string) {
    const list = readConvs().map(c =>
      c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c
    );
    writeConvs(list);
  },

  deleteConversation(id: string) {
    writeConvs(readConvs().filter(c => c.id !== id));
    localStorage.removeItem(MSG_PREFIX + id);
  },

  /* ─── Messages ─── */
  getMessages(convId: string): LocalMessage[] {
    return readMsgs(convId);
  },

  addMessage(convId: string, role: 'user' | 'assistant', content: string): LocalMessage {
    const msg: LocalMessage = {
      id: uid(),
      conversationId: convId,
      role,
      content,
      createdAt: new Date().toISOString(),
    };
    const msgs = readMsgs(convId);
    msgs.push(msg);
    writeMsgs(convId, msgs);

    /* touch conversation updatedAt */
    const list = readConvs().map(c =>
      c.id === convId ? { ...c, updatedAt: new Date().toISOString() } : c
    );
    writeConvs(list);
    return msg;
  },

  /* Auto-rename the conversation from the first user message */
  autoRename(convId: string, content: string) {
    const convs = readConvs();
    const conv = convs.find(c => c.id === convId);
    if (!conv || (conv.title && conv.title !== 'Yeni Sohbet')) return;

    const sep = '---\nKullanıcı sorusu:';
    const source = content.includes(sep)
      ? content.slice(content.indexOf(sep) + sep.length).trim()
      : content;
    const newTitle = source.slice(0, 60).replace(/\n/g, ' ').trim();
    if (newTitle) {
      writeConvs(convs.map(c => c.id === convId ? { ...c, title: newTitle } : c));
    }
  },
};
