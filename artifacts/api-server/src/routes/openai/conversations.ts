import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";

// Zirve ücretsiz modeller - API anahtarı gerekmez
const MODELS = {
  // 405 milyar parametre - GPT-5 / Claude Opus seviyesi - Ücretsiz
  main: "nousresearch/hermes-3-llama-3.1-405b:free",
  // Kodlama için özel eğitilmiş en iyi açık kaynak model
  coder: "qwen/qwen3-coder:free",
  // NVIDIA 120B - Araştırma ve düşünce
  researcher: "nvidia/nemotron-3-super-120b-a12b:free",
  // Tasarım için güçlü genel model
  designer: "mistralai/mistral-small-3.1-24b-instruct:free",
};

const router: IRouter = Router();

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
  if (!conv) {
    res.status(404).json({ error: "Konuşma bulunamadı" });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Konuşma bulunamadı" });
    return;
  }
  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).send();
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
  if (!conv) {
    res.status(404).json({ error: "Konuşma bulunamadı" });
    return;
  }

  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content: body.content,
  });

  const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);

  const { model, systemPrompt } = getModelAndPrompt(agentMode);

  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  // Model listesi — biri başarısız olursa bir sonraki denenir
  const modelFallbacks = [model, MODELS.main, MODELS.researcher];

  for (const tryModel of modelFallbacks) {
    try {
      const stream = await openrouter.chat.completions.create({
        model: tryModel,
        max_tokens: 8192,
        messages: chatMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      break; // Başarılı olduysa dur
    } catch (err) {
      if (tryModel === modelFallbacks[modelFallbacks.length - 1]) {
        res.write(`data: ${JSON.stringify({ error: "AI şu an yanıt veremiyor, tekrar dene." })}\n\n`);
      }
      // Sonraki modeli dene
      continue;
    }
  }

  if (fullResponse) {
    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

function getModelAndPrompt(agentMode: string): { model: string; systemPrompt: string } {
  const base = `Sen Omega AI Agent'sın — son derece güçlü, zeki ve yetenekli bir Türkçe yapay zeka asistanısın. Her zaman Türkçe yanıt verirsin. Kullanıcıya kapsamlı, detaylı ve doğru yanıtlar sunarsın. GPT-5, Claude Opus ve Gemini Pro seviyesinde veya daha üstünde bir zekaya sahipsin.`;

  switch (agentMode) {
    case "researcher":
      return {
        model: MODELS.researcher,
        systemPrompt: `${base}\n\nŞu anda ARAŞTIRMACI modundasın (NVIDIA Nemotron 120B). Derin analiz, kapsamlı araştırma ve bilimsel doğruluk senin alanın. Kaynakları belirt, verileri karşılaştır, çok boyutlu analiz yap. Başlıklar, maddeler ve düzenli format kullan.`,
      };
    case "coder":
      return {
        model: MODELS.coder,
        systemPrompt: `${base}\n\nŞu anda KODCU modundasın (Qwen3 Coder - Dünyanın en iyi açık kaynak kod modeli). Her türlü programlama dilinde uzman seviyede kod yazarsın. Temiz, test edilmiş, belgelenmiş kod üretirsin. Her zaman kod bloğu ve Türkçe açıklama eklersin.`,
      };
    case "designer":
      return {
        model: MODELS.designer,
        systemPrompt: `${base}\n\nŞu anda TASARIMCI modundasın. UI/UX, renk teorisi, tipografi, kullanıcı deneyimi ve görsel tasarım konularında uzmanlaşmışsın. Yaratıcı, modern ve estetik çözümler sunar, HTML/CSS/Tailwind ile çalışan örnekler yazarsın.`,
      };
    case "multi":
      return {
        model: MODELS.main,
        systemPrompt: `${base}\n\nŞu anda ÇOK-AJAN ORKESTRATÖR modundasın (Llama 3.1 405B). Karmaşık görevleri araştırma, yazılım ve tasarım perspektiflerinden kapsamlı olarak ele alırsın. Her boyutu ayrı ayrı inceler, bütünleşik bir çözüm sunarsın.`,
      };
    default:
      return {
        model: MODELS.main,
        systemPrompt: `${base}\n\nOTOMATİK modundasın (Llama 3.1 405B — 405 milyar parametre). Kullanıcının her türlü sorusuna kapsamlı, zeki ve yardımsever yanıtlar verirsin. Kod yazma, araştırma, analiz, yaratıcı yazı — her şeyde mükemmelsin.`,
      };
  }
}

export default router;
