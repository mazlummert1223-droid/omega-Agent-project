import { Router, type IRouter } from "express";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { db } from "@workspace/db";
import { messages } from "@workspace/db";
import { AgentWebSearchBody, AgentMultiTaskBody } from "@workspace/api-zod";

const LLAMA_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

const router: IRouter = Router();

router.post("/search", async (req, res) => {
  const body = AgentWebSearchBody.parse(req.body);
  const query = body.query;
  const maxResults = body.maxResults || 5;

  try {
    const response = await openrouter.chat.completions.create({
      model: LLAMA_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `Sen bir web araştırma uzmanısın. Kullanıcının sorduğu konuda bilgi toplar ve düzenli sunar. Her zaman Türkçe yanıt ver. Şu JSON formatında yanıt ver (başka hiçbir şey yazma): {"results": [{"title": "başlık", "url": "https://ornek.com", "snippet": "kısa açıklama"}], "summary": "genel özet"}`,
        },
        {
          role: "user",
          content: `"${query}" hakkında ${maxResults} adet arama sonucu üret. Gerçekçi başlıklar, URL'ler ve açıklamalar yaz.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "{}";

    let parsed: { results: Array<{ title: string; url: string; snippet: string }>; summary: string };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { results: [], summary: content };
    } catch {
      parsed = {
        results: [{ title: query, url: "#", snippet: content.slice(0, 300) }],
        summary: content,
      };
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ results: [], summary: "Arama yapılamadı" });
  }
});

router.post("/multi-task", async (req, res) => {
  const body = AgentMultiTaskBody.parse(req.body);
  const task = body.task;
  const conversationId = body.conversationId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const agents = [
    {
      name: "researcher",
      label: "🔍 Araştırmacı Agent",
      systemPrompt: `Sen bir araştırma uzmanısın. Görev hakkında kapsamlı araştırma yaparsın. Her zaman Türkçe yanıt ver. Kaynaklar, örnekler ve detaylı bilgi sunar.`,
    },
    {
      name: "coder",
      label: "💻 Kodcu Agent",
      systemPrompt: `Sen bir yazılım mühendisisin. Görev için gerekli kodları yazarsın. Her zaman Türkçe açıklamalar ekler, temiz ve çalışır kod üretirsin.`,
    },
    {
      name: "designer",
      label: "🎨 Tasarımcı Agent",
      systemPrompt: `Sen bir UI/UX tasarım uzmanısın. Görev için tasarım önerileri, HTML/CSS örnekleri ve görsel çözümler sunar. Her zaman Türkçe yanıt ver.`,
    },
  ];

  let fullReport = `# 🤖 Omega Çok-Ajan Sistemi Raporu\n\n**Görev:** ${task}\n\n---\n\n`;

  for (const agent of agents) {
    sendEvent({ agent: agent.name, label: agent.label, status: "running" });

    try {
      let agentContent = "";
      const stream = await openrouter.chat.completions.create({
        model: LLAMA_MODEL,
        max_tokens: 4096,
        messages: [
          { role: "system", content: agent.systemPrompt },
          { role: "user", content: task },
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          agentContent += content;
          sendEvent({ agent: agent.name, label: agent.label, content, status: "streaming" });
        }
      }

      fullReport += `## ${agent.label}\n\n${agentContent}\n\n---\n\n`;
      sendEvent({ agent: agent.name, label: agent.label, status: "done" });
    } catch (err) {
      sendEvent({ agent: agent.name, label: agent.label, status: "error", content: "Bu ajan çalışırken hata oluştu." });
    }
  }

  if (conversationId) {
    try {
      await db.insert(messages).values([
        { conversationId, role: "user", content: `Çok-ajan görevi: ${task}` },
        { conversationId, role: "assistant", content: fullReport },
      ]);
    } catch {}
  }

  sendEvent({ done: true, report: fullReport });
  res.end();
});

export default router;
