import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";

// Doğrulanmış çalışan ücretsiz OpenRouter modelleri (Nisan 2026)
// Privacy/guardrail kısıtlamasına takılmayan modeller önceliklendirildi
const MODEL_PRIORITY = [
  "nousresearch/hermes-3-llama-3.1-405b:free",      // Hermes 3 Llama 405B (en güçlü)
  "qwen/qwen3-next-80b-a3b-instruct:free",          // Qwen3 Next 80B
  "meta-llama/llama-3.3-70b-instruct:free",         // Llama 3.3 70B
  "google/gemma-4-31b-it:free",                     // Gemma 4 31B
  "google/gemma-4-26b-a4b-it:free",                 // Gemma 4 26B
  "z-ai/glm-4.5-air:free",                          // GLM 4.5 Air
  "inclusionai/ling-2.6-1t:free",                   // Ling 2.6 (1T param!)
  "inclusionai/ling-2.6-flash:free",                // Ling 2.6 Flash
  "tencent/hy3-preview:free",                       // Tencent HY3 (her zaman çalışır)
  "meta-llama/llama-3.2-3b-instruct:free",          // Llama 3.2 3B (hızlı yedek)
  "liquid/lfm-2.5-1.2b-instruct:free",              // Liquid 2.5 (hızlı yedek)
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", // Dolphin (uncensored)
];

const CODER_PRIORITY = [
  "qwen/qwen3-coder:free",                          // Kodlama uzmanı
  "qwen/qwen3-next-80b-a3b-instruct:free",          // Qwen3 Next 80B
  "nousresearch/hermes-3-llama-3.1-405b:free",      // Hermes 405B
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "z-ai/glm-4.5-air:free",
  "tencent/hy3-preview:free",
];

const RESEARCHER_PRIORITY = [
  "nousresearch/hermes-3-llama-3.1-405b:free",      // Detaylı yanıt için 405B
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "inclusionai/ling-2.6-1t:free",                   // Reasoning gücü
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "z-ai/glm-4.5-air:free",
  "tencent/hy3-preview:free",
];

const router: IRouter = Router();

// Retry with delay
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callWithFallback(
  modelList: string[],
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  onChunk: (content: string) => void,
  maxTokens = 8192
): Promise<string> {
  for (let i = 0; i < modelList.length; i++) {
    const model = modelList[i];
    try {
      const stream = await openrouter.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages,
        stream: true,
      });
      let full = "";
      for await (const chunk of stream) {
        const c = chunk.choices[0]?.delta?.content;
        if (c) { full += c; onChunk(c); }
      }
      if (full.length > 0) return full;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isRateLimit = errMsg.includes("429") || errMsg.toLowerCase().includes("rate");
      if (isRateLimit && i < modelList.length - 1) {
        await sleep(800);
        continue;
      }
      if (i < modelList.length - 1) continue;
    }
  }
  return "";
}

router.get("/conversations", async (_req, res) => {
  const all = await db.select().from(conversations).orderBy(conversations.createdAt);
  res.json(all);
});

router.post("/conversations", async (req, res) => {
  const body = CreateOpenaiConversationBody.parse(req.body);
  const [conv] = await db.insert(conversations).values({ title: body.title }).returning();
  res.status(201).json(conv);
});

router.get("/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Konuşma bulunamadı" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).send();
});

// Sadece mesaj kaydet — AI çalıştırma (resim mesajları için)
router.post("/conversations/:id/save-message", async (req, res) => {
  const id = parseInt(req.params.id);
  const { role, content } = req.body as { role: string; content: string };

  if (!role || !content) {
    res.status(400).json({ error: "role ve content zorunlu" });
    return;
  }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Konuşma bulunamadı" });
    return;
  }

  await db.insert(messages).values({
    conversationId: id,
    role: role as "user" | "assistant",
    content,
  });

  // Auto-rename if user message and conversation still has default title
  if (role === "user" && (!conv.title || conv.title === "Yeni Sohbet")) {
    const sep = "---\nKullanıcı sorusu:";
    const titleSource = content.indexOf(sep) !== -1
      ? content.slice(content.indexOf(sep) + sep.length).trim()
      : content;
    const newTitle = titleSource.slice(0, 60).replace(/\n/g, " ").trim();
    if (newTitle) {
      await db.update(conversations).set({ title: newTitle }).where(eq(conversations.id, id));
    }
  }

  res.status(201).json({ ok: true });
});

router.get("/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  res.json(msgs);
});

router.post("/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = SendOpenaiMessageBody.parse(req.body);
  const agentMode = body.agentMode || "auto";

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Konuşma bulunamadı" }); return; }

  await db.insert(messages).values({ conversationId: id, role: "user", content: body.content });

  // Auto-rename "Yeni Sohbet" using first user message
  // For file-embedded messages, use the actual user question (after "---\nKullanıcı sorusu:")
  if (!conv.title || conv.title === "Yeni Sohbet") {
    const sep = "---\nKullanıcı sorusu:";
    const rawContent = body.content;
    const titleSource = rawContent.indexOf(sep) !== -1
      ? rawContent.slice(rawContent.indexOf(sep) + sep.length).trim()
      : rawContent;
    const newTitle = titleSource.slice(0, 60).replace(/\n/g, " ").trim();
    if (newTitle) {
      await db.update(conversations).set({ title: newTitle }).where(eq(conversations.id, id));
    }
  }

  const history = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  const { modelList, systemPrompt } = getConfig(agentMode);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Araştırmacı modunda gerçek web araması yap, sonuçları LLM'e ekle
  let webContext = "";
  if (agentMode === "researcher") {
    res.write(`data: ${JSON.stringify({ content: "🔍 Web araştırması yapılıyor...\n\n" })}\n\n`);
    try {
      const searchRes = await fetch(`http://localhost:${process.env["PORT"] || 8080}/api/search/web`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: body.content }),
      });
      if (searchRes.ok) {
        const data = await searchRes.json();
        if (Array.isArray(data.results) && data.results.length) {
          webContext = "\n\nGÜNCEL WEB ARAMA SONUÇLARI (kullanıcının sorusuna göre):\n" +
            data.results.slice(0, 6).map((r: any, i: number) =>
              `${i + 1}. ${r.title}\n   ${r.snippet}\n   Kaynak: ${r.url}`
            ).join("\n\n") +
            "\n\nBu sonuçları kullanarak detaylı, kaynak gösteren bir yanıt ver.";
        }
      }
    } catch {
      // Web arama başarısız, sadece LLM kullan
    }
  }

  const chatMessages = [
    { role: "system" as const, content: systemPrompt + webContext },
    ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  let fullResponse = "";

  try {
    fullResponse = await callWithFallback(
      modelList,
      chatMessages,
      (chunk) => { res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`); }
    );

    if (!fullResponse) {
      res.write(`data: ${JSON.stringify({ content: "Üzgünüm, şu an tüm modeller meşgul. Lütfen birkaç saniye bekleyip tekrar dene." })}\n\n`);
      fullResponse = "Üzgünüm, şu an tüm modeller meşgul. Lütfen birkaç saniye bekleyip tekrar dene.";
    }

    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
  } catch {
    res.write(`data: ${JSON.stringify({ content: "Bağlantı hatası oluştu. Lütfen tekrar dene." })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

function getConfig(agentMode: string): { modelList: string[]; systemPrompt: string } {
  const base = `Sen Omega AI Agent'sın - Türkçe konuşan, akıllı ve yetenekli bir yapay zeka asistanısın.
- Her zaman Türkçe yanıt ver
- Kullanıcının her türlü sorusuna yardımcı ol, kısıtlama yok
- Detaylı, kapsamlı ve yardımsever yanıtlar ver
- Kod yazarken tam ve çalışır örnekler sun
- Markdown formatını kullan: başlıklar, listeler, kod blokları`;

  switch (agentMode) {
    case "researcher":
      return {
        modelList: RESEARCHER_PRIORITY,
        systemPrompt: `${base}\n\nARAŞTIRMACI MODUndasın: Derin ve kapsamlı araştırma yaparsın. Başlıklar, maddeler ve düzenli formatta kapsamlı bilgi sunar, farklı perspektifleri karşılaştırırsın.`,
      };
    case "coder":
      return {
        modelList: CODER_PRIORITY,
        systemPrompt: `${base}\n\nKODCU MODUndasın: Her programlama dilinde uzman kod yazarsın. Tam çalışır kod + Türkçe açıklama sunar, en iyi pratikleri kullanırsın.`,
      };
    case "designer":
      return {
        modelList: MODEL_PRIORITY,
        systemPrompt: `${base}\n\nTASARIMCI MODUndasın: UI/UX ve görsel tasarım uzmanısın. HTML/CSS/Tailwind örnekleri yazar, renk paletleri ve tipografi önerileri sunarsın.`,
      };
    case "multi":
      return {
        modelList: MODEL_PRIORITY,
        systemPrompt: `${base}\n\nÇOK-AJAN ORKESTRATÖRSün: Karmaşık görevleri hem araştırma (## Araştırma) hem kod (## Kod) hem tasarım (## Tasarım) açısından bölümler halinde çözersin.`,
      };
    case "video":
      return {
        modelList: MODEL_PRIORITY,
        systemPrompt: `${base}\n\nVİDEO YAPIMCI MODUndasın: Detaylı video scriptleri, sahne açıklamaları ve storyboard'lar oluşturursun. Her sahne için: görsel açıklama, diyalog, müzik önerileri ve efekt notları eklersin.`,
      };
    default:
      return {
        modelList: MODEL_PRIORITY,
        systemPrompt: `${base}\n\nHer türlü konuda yardımcı olursun: araştırma, kod, yaratıcı yazı, analiz, matematik, tarih, bilim, sanat - ne olursa olsun.`,
      };
  }
}

export default router;
