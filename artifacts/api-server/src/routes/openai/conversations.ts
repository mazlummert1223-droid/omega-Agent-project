import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";

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

  const systemPrompt = buildSystemPrompt(agentMode);

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

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
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

    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI yanıt veremedi" })}\n\n`);
    res.end();
  }
});

function buildSystemPrompt(agentMode: string): string {
  const base = `Sen Omega AI Agent'sın - Türkçe konuşan gelişmiş bir yapay zeka asistanısın. Her zaman Türkçe yanıt verirsin. Kullanıcıya yardımcı, bilgili ve samimi davranırsın.`;

  switch (agentMode) {
    case "researcher":
      return `${base}\n\nŞu anda ARAŞTIRMACI modundasın. Web araştırması yaparak kapsamlı, kaynaklı ve detaylı bilgi sunarsın. Bilgileri düzenli bir şekilde başlıklar ve maddeler halinde sunar, kaynakları belirtirsin.`;
    case "coder":
      return `${base}\n\nŞu anda KODCU modundasın. Kod yazma, hata ayıklama ve yazılım geliştirme konularında uzmanlaşmışsın. Her zaman açıklamalı, temiz ve çalışır kod yazarsın. Kod bloklarını markdown formatında sunar, her adımı açıklarsın.`;
    case "designer":
      return `${base}\n\nŞu anda TASARIMCI modundasın. UI/UX tasarım, renk teorisi, tipografi ve görsel tasarım konularında uzmanlaşmışsın. Yaratıcı ve estetik öneriler sunar, HTML/CSS ile örnek tasarımlar yazarsın.`;
    case "multi":
      return `${base}\n\nŞu anda ÇOK-AJAN modundasın. Karmaşık görevleri farklı uzmanlık alanlarına bölerek çözersin. Her alanı (araştırma, kod, tasarım) ayrı ayrı ele alır, kapsamlı bir çözüm sunar.`;
    default:
      return `${base}\n\nOTOMATİK modundasın - kullanıcının ihtiyacına göre araştırma, kod yazma, tasarım veya genel sohbet moduna geçersin.`;
  }
}

export default router;
