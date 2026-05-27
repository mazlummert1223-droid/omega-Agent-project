import { Router, type IRouter } from "express";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { db } from "@workspace/db";
import { messages } from "@workspace/db";
import { AgentWebSearchBody, AgentMultiTaskBody } from "@workspace/api-zod";

// Doğrulanmış çalışan ücretsiz modeller (Nisan 2026)
const FALLBACK_MODELS = [
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "z-ai/glm-4.5-air:free",
  "inclusionai/ling-2.6-1t:free",
  "tencent/hy3-preview:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
];

const CODER_MODELS = [
  "qwen/qwen3-coder:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "tencent/hy3-preview:free",
];

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function callModel(systemPrompt: string, userPrompt: string): Promise<string> {
  for (const model of FALLBACK_MODELS) {
    try {
      const res = await openrouter.chat.completions.create({
        model,
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const c = res.choices[0]?.message?.content || "";
      if (c) return c;
    } catch {
      await sleep(400);
      continue;
    }
  }
  return "";
}

const router: IRouter = Router();

router.post("/search", async (req, res) => {
  const body = AgentWebSearchBody.parse(req.body);
  const { query, maxResults = 5 } = body;

  try {
    const content = await callModel(
      `Sen bir araştırma uzmanısın. Türkçe yanıt ver. Sadece JSON döndür (başka hiçbir metin yok):
{"results":[{"title":"başlık","url":"https://ornek.com","snippet":"açıklama"}],"summary":"özet"}`,
      `"${query}" hakkında ${maxResults} arama sonucu üret`
    );

    try {
      const m = content.match(/\{[\s\S]*\}/);
      res.json(m ? JSON.parse(m[0]) : { results: [], summary: content });
    } catch {
      res.json({ results: [{ title: query, url: "#", snippet: content.slice(0, 300) }], summary: content });
    }
  } catch {
    res.status(500).json({ results: [], summary: "Arama yapılamadı" });
  }
});

router.post("/multi-task", async (req, res) => {
  const body = AgentMultiTaskBody.parse(req.body);
  const { task, conversationId } = body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const agents = [
    {
      name: "researcher",
      label: "🔍 Araştırmacı Agent",
      models: FALLBACK_MODELS,
      system: `Sen bir araştırma uzmanısın. Görev hakkında kapsamlı araştırma ve detaylı bilgi sunarsın. Her zaman Türkçe yaz.`,
    },
    {
      name: "coder",
      label: "💻 Kodcu Agent",
      models: CODER_MODELS,
      system: `Sen bir yazılım mühendisisin. Görev için tam ve çalışır kod yazarsın. Türkçe açıklamalarla markdown kod blokları kullan.`,
    },
    {
      name: "designer",
      label: "🎨 Tasarımcı Agent",
      models: FALLBACK_MODELS,
      system: `Sen bir UI/UX tasarım uzmanısın. Görev için tasarım önerileri, HTML/CSS ve görsel çözümler sunarsın. Türkçe yaz.`,
    },
  ];

  let fullReport = `# Omega Çok-Ajan Raporu\n\n**Görev:** ${task}\n\n---\n\n`;

  for (const agent of agents) {
    send({ agent: agent.name, label: agent.label, status: "running" });

    let agentContent = "";
    let streamed = false;
    for (const model of agent.models) {
      try {
        const stream = await openrouter.chat.completions.create({
          model,
          max_tokens: 4096,
          messages: [
            { role: "system", content: agent.system },
            { role: "user", content: task },
          ],
          stream: true,
        });

        for await (const chunk of stream) {
          const c = chunk.choices[0]?.delta?.content;
          if (c) {
            agentContent += c;
            send({ agent: agent.name, label: agent.label, content: c, status: "streaming" });
          }
        }

        if (agentContent) {
          streamed = true;
          break;
        }
      } catch {
        await sleep(400);
        continue;
      }
    }

    if (!streamed) {
      agentContent = "Bu ajan şu an yanıt veremiyor (tüm modeller meşgul).";
      send({ agent: agent.name, label: agent.label, content: agentContent, status: "streaming" });
    }

    fullReport += `## ${agent.label}\n\n${agentContent}\n\n---\n\n`;
    send({ agent: agent.name, label: agent.label, status: "done" });
  }

  if (conversationId) {
    try {
      await db.insert(messages).values([
        { conversationId, role: "user", content: `Çok-ajan görevi: ${task}` },
        { conversationId, role: "assistant", content: fullReport },
      ]);
    } catch {}
  }

  send({ done: true });
  res.end();
});

export default router;
