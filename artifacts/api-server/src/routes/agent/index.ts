import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AgentWebSearchBody, AgentMultiTaskBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/search", async (req, res) => {
  const body = AgentWebSearchBody.parse(req.body);
  const query = body.query;
  const maxResults = body.maxResults || 5;

  try {
    const searchPrompt = `Web'de "${query}" hakkında arama yap ve ${maxResults} adet sonuç bul. Her sonuç için başlık, URL ve kısa açıklama ver. JSON formatında döndür: {"results": [{"title": "...", "url": "...", "snippet": "..."}], "summary": "Genel özet..."}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: "Sen bir web araştırma uzmanısın. Kullanıcının sorduğu konuda bilgi toplar ve düzenli bir şekilde sunar. Her zaman Türkçe yanıt ver. JSON formatında yanıt ver.",
        },
        { role: "user", content: searchPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content || "{}";

    let parsed: { results: Array<{ title: string; url: string; snippet: string }>; summary: string };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { results: [], summary: content };
    } catch {
      parsed = {
        results: [{ title: query, url: "#", snippet: content }],
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
      label: "🔍 Araştırmacı",
      prompt: `Sen bir araştırma uzmanısın. Şu görev için internet araştırması yap ve kapsamlı bilgi sun: "${task}". Türkçe yanıt ver.`,
    },
    {
      name: "coder",
      label: "💻 Kodcu",
      prompt: `Sen bir yazılım geliştirme uzmanısın. Şu görev için gerekli kodu yaz: "${task}". Türkçe açıklamalar ekle.`,
    },
    {
      name: "designer",
      label: "🎨 Tasarımcı",
      prompt: `Sen bir UI/UX tasarım uzmanısın. Şu görev için tasarım önerileri ve HTML/CSS örnek yaz: "${task}". Türkçe açıklamalar ekle.`,
    },
  ];

  let fullReport = `# 🤖 Omega Çok-Ajan Raporu\n\n**Görev:** ${task}\n\n---\n\n`;

  for (const agent of agents) {
    sendEvent({ agent: agent.name, label: agent.label, status: "running" });

    try {
      let agentContent = "";
      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 4096,
        messages: [
          {
            role: "system",
            content: agent.prompt,
          },
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
