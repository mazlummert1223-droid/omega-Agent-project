import { Router, type IRouter } from "express";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { db } from "@workspace/db";
import { messages } from "@workspace/db";
import { AgentWebSearchBody, AgentMultiTaskBody } from "@workspace/api-zod";

// Her görev için en iyi ücretsiz model
const MODELS = {
  main: "nousresearch/hermes-3-llama-3.1-405b:free",     // 405B - ana model
  coder: "qwen/qwen3-coder:free",                         // Kodlama uzmanı
  researcher: "nvidia/nemotron-3-super-120b-a12b:free",   // Araştırma/düşünce
  designer: "mistralai/mistral-small-3.1-24b-instruct:free", // Tasarım
};

const router: IRouter = Router();

async function callModel(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const fallbacks = [model, MODELS.main, MODELS.researcher];
  for (const m of fallbacks) {
    try {
      const response = await openrouter.chat.completions.create({
        model: m,
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      return response.choices[0]?.message?.content || "";
    } catch {
      continue;
    }
  }
  return "Model yanıt vermedi.";
}

router.post("/search", async (req, res) => {
  const body = AgentWebSearchBody.parse(req.body);
  const query = body.query;
  const maxResults = body.maxResults || 5;

  try {
    const content = await callModel(
      MODELS.researcher,
      `Sen bir web araştırma uzmanısın. Her zaman Türkçe yanıt ver. Şu JSON formatında yanıt ver (başka hiçbir şey yazma, sadece JSON): {"results": [{"title": "başlık", "url": "https://ornek.com", "snippet": "kısa açıklama"}], "summary": "genel özet"}`,
      `"${query}" hakkında ${maxResults} adet detaylı arama sonucu üret. Gerçekçi ve bilgilendirici başlıklar, URL'ler ve açıklamalar yaz.`
    );

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
  } catch {
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
      model: MODELS.researcher,
      systemPrompt: `Sen NVIDIA Nemotron 120B modelisin - araştırma ve analiz uzmanısın. Görev hakkında derin araştırma, kaynak analizi ve kapsamlı bilgi sunarsın. Her zaman Türkçe yanıt ver. Kaynakları, istatistikleri ve verileri dahil et.`,
    },
    {
      name: "coder",
      label: "💻 Kodcu Agent",
      model: MODELS.coder,
      systemPrompt: `Sen Qwen3 Coder modelisin - dünyanın en iyi açık kaynak kod yazma modelisin. Görev için gerekli tüm kodları, tam ve çalışır şekilde yazarsın. Her zaman Türkçe açıklamalar ekler, markdown kod blokları kullanırsın.`,
    },
    {
      name: "designer",
      label: "🎨 Tasarımcı Agent",
      model: MODELS.designer,
      systemPrompt: `Sen bir UI/UX ve görsel tasarım uzmanısın. Görev için tasarım önerileri, HTML/CSS örnekleri ve kullanıcı deneyimi çözümleri sunarsın. Her zaman Türkçe yanıt ver.`,
    },
  ];

  let fullReport = `# 🤖 Omega Çok-Ajan Sistemi\n\n**Görev:** ${task}\n\n---\n\n`;

  for (const agent of agents) {
    sendEvent({ agent: agent.name, label: agent.label, status: "running" });

    try {
      let agentContent = "";

      const stream = await openrouter.chat.completions.create({
        model: agent.model,
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
    } catch {
      sendEvent({
        agent: agent.name,
        label: agent.label,
        status: "error",
        content: "Bu ajan şu an yanıt veremiyor.",
      });
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
