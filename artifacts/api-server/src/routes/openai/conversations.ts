import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";

// Önce çalışanlar, sonra fallback'ler
const MODELS = {
  // Çalışan birincil modeller
  primary: "arcee-ai/trinity-large-preview:free",
  secondary: "z-ai/glm-4.5-air:free",
  // Fallback modeller (rate limit geçince çalışır)
  fallback1: "meta-llama/llama-3.3-70b-instruct:free",
  fallback2: "mistralai/mistral-small-3.1-24b-instruct:free",
  fallback3: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  // Kodlama için
  coder: "qwen/qwen3-coder:free",
  coderFallback: "arcee-ai/trinity-large-preview:free",
};

const MODEL_PRIORITY = [
  MODELS.primary,
  MODELS.secondary,
  MODELS.fallback1,
  MODELS.fallback2,
  MODELS.fallback3,
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
        await sleep(1000);
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

  const history = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  const { modelList, systemPrompt } = getConfig(agentMode);

  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

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
        modelList: [MODELS.primary, MODELS.secondary, MODELS.fallback1, MODELS.fallback2],
        systemPrompt: `${base}\n\nARAŞTIRMACI MODUndasın: Derin ve kapsamlı araştırma yaparsın. Başlıklar, maddeler ve düzenli formatta kapsamlı bilgi sunar, farklı perspektifleri karşılaştırırsın.`,
      };
    case "coder":
      return {
        modelList: [MODELS.coder, MODELS.primary, MODELS.secondary, MODELS.fallback1],
        systemPrompt: `${base}\n\nKODCU MODUndasın: Her programlama dilinde uzman kod yazarsın. Tam çalışır kod + Türkçe açıklama sunar, en iyi pratikleri kullanırsın.`,
      };
    case "designer":
      return {
        modelList: [MODELS.primary, MODELS.secondary, MODELS.fallback2],
        systemPrompt: `${base}\n\nTASARIMCI MODUndasın: UI/UX ve görsel tasarım uzmanısın. HTML/CSS/Tailwind örnekleri yazar, renk paletleri ve tipografi önerileri sunarsın.`,
      };
    case "multi":
      return {
        modelList: [MODELS.primary, MODELS.secondary, MODELS.fallback1],
        systemPrompt: `${base}\n\nÇOK-AJAN ORKESTRATÖRSün: Karmaşık görevleri hem araştırma (## Araştırma) hem kod (## Kod) hem tasarım (## Tasarım) açısından bölümler halinde çözersin.`,
      };
    case "video":
      return {
        modelList: [MODELS.primary, MODELS.secondary, MODELS.fallback1],
        systemPrompt: `${base}\n\nVİDEO YAPIMCI MODUndasın: Detaylı video scriptleri, sahne açıklamaları ve storyboard'lar oluşturursun. Her sahne için: görsel açıklama, diyalog, müzik önerileri ve efekt notları eklersin.`,
      };
    default:
      return {
        modelList: [MODELS.primary, MODELS.secondary, MODELS.fallback1, MODELS.fallback2, MODELS.coder],
        systemPrompt: `${base}\n\nHer türlü konuda yardımcı olursun: araştırma, kod, yaratıcı yazı, analiz, matematik, tarih, bilim, sanat - ne olursa olsun.`,
      };
  }
}

export default router;
